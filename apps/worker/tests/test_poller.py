"""Poller tests — drain and per-job outcome behaviour with the DB and the
processing pipeline stubbed (no live DB, no network).

The real claim query and graph are exercised elsewhere; here we verify that
`run_forever` drains the queue in FIFO order without hanging, and that
`_process_job` requeues transient failures while failing everything else.
"""

from __future__ import annotations

import threading
from contextlib import contextmanager
from typing import Any
from uuid import UUID, uuid4

import pytest

from worker import poller
from worker.config import WorkerConfig


class _JobSource:
    """Source of queued job rows; hands each out once, then None."""

    def __init__(self, job_ids: list[UUID]) -> None:
        self._rows = [
            {
                "id": jid,
                "type": "enrich_product",
                "product_id": uuid4(),
                "batch_id": None,
                "attempts": 0,
            }
            for jid in job_ids
        ]

    def next_row(self) -> dict[str, Any] | None:
        return self._rows.pop(0) if self._rows else None


class _FakeCursor:
    """Minimal cursor: the claim SELECT pops a row; everything else is a no-op."""

    def __init__(self, source: _JobSource) -> None:
        self._source = source
        self._last: dict[str, Any] | None = None

    def execute(self, sql: str, params: Any = None) -> None:
        self._last = self._source.next_row() if "FOR UPDATE SKIP LOCKED" in sql else None

    def fetchone(self) -> dict[str, Any] | None:
        return self._last

    def __enter__(self) -> _FakeCursor:
        return self

    def __exit__(self, *exc: object) -> bool:
        return False


class _FakeConn:
    def __init__(self, source: _JobSource) -> None:
        self._source = source

    @contextmanager
    def transaction(self) -> Any:
        yield

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self._source)

    def rollback(self) -> None:  # pragma: no cover - not hit on the happy path
        pass


def _install(monkeypatch: pytest.MonkeyPatch, source: _JobSource) -> list[UUID]:
    """Wire a fake connection + a recording `_process_job`; return the record sink."""
    processed: list[UUID] = []

    @contextmanager
    def fake_connect(_url: str) -> Any:
        yield _FakeConn(source)

    def fake_process(config: WorkerConfig, conn: Any, job: poller.ClaimedJob) -> None:
        processed.append(job.id)

    monkeypatch.setattr(poller, "connect", fake_connect)
    monkeypatch.setattr(poller, "_process_job", fake_process)
    return processed


def _run_with_timeout(config: WorkerConfig, timeout: float = 5.0) -> None:
    """Run `run_forever` in a thread and assert it drains within `timeout`."""
    thread = threading.Thread(target=poller.run_forever, args=(config,))
    thread.start()
    thread.join(timeout)
    assert not thread.is_alive(), "run_forever did not drain within the timeout"


def test_drains_in_order(monkeypatch: pytest.MonkeyPatch) -> None:
    job_ids = [uuid4() for _ in range(5)]
    source = _JobSource(job_ids)
    processed = _install(monkeypatch, source)

    config = WorkerConfig(database_url="fake", drain=True, poll_interval_seconds=0.01)
    _run_with_timeout(config)

    # The loop preserves the FIFO claim order.
    assert processed == job_ids


def test_empty_queue_drains_immediately(monkeypatch: pytest.MonkeyPatch) -> None:
    source = _JobSource([])
    processed = _install(monkeypatch, source)

    config = WorkerConfig(database_url="fake", drain=True, poll_interval_seconds=0.01)
    _run_with_timeout(config)

    assert processed == []


class _RecordingCursor:
    """Cursor that records every executed statement (for asserting job outcome)."""

    def __init__(self, log: list[tuple[str, Any]]) -> None:
        self._log = log

    def execute(self, sql: str, params: Any = None) -> None:
        self._log.append((sql, params))

    def fetchone(self) -> None:
        return None

    def __enter__(self) -> _RecordingCursor:
        return self

    def __exit__(self, *exc: object) -> bool:
        return False


class _RecordingConn:
    def __init__(self) -> None:
        self.statements: list[tuple[str, Any]] = []
        self.rolled_back = False

    @contextmanager
    def transaction(self) -> Any:
        yield

    def cursor(self) -> _RecordingCursor:
        return _RecordingCursor(self.statements)

    def rollback(self) -> None:
        self.rolled_back = True


def _rate_limit_error() -> Exception:
    """A real `openai.RateLimitError` (one of the poller's RETRYABLE_ERRORS)."""
    import httpx
    import openai

    response = httpx.Response(429, request=httpx.Request("POST", "https://api.openai.com"))
    return openai.RateLimitError("rate limited", response=response, body=None)


def _enrich_job(attempts: int = 0) -> poller.ClaimedJob:
    return poller.ClaimedJob(
        id=uuid4(), type="enrich_product", product_id=uuid4(), batch_id=None, attempts=attempts
    )


def _stub_graph(monkeypatch: pytest.MonkeyPatch, exc: Exception) -> None:
    """Make `fetch_inputs` a no-op and `run_graph` raise `exc`."""

    def _raise(*_args: Any, **_kwargs: Any) -> Any:
        raise exc

    monkeypatch.setattr(poller, "fetch_inputs", lambda _conn, _pid: object())
    monkeypatch.setattr(poller, "run_graph", _raise)


def _outcome_sql(conn: _RecordingConn) -> str:
    return " ".join(sql for sql, _ in conn.statements)


def test_transient_error_requeues_job(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = _RecordingConn()
    _stub_graph(monkeypatch, _rate_limit_error())

    poller._process_job(WorkerConfig(max_attempts=5), conn, _enrich_job(attempts=0))

    sql = _outcome_sql(conn)
    assert "status = 'queued'" in sql  # back on the queue, not failed
    assert "status = 'failed'" not in sql
    assert conn.rolled_back


def test_transient_error_fails_once_attempts_exhausted(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = _RecordingConn()
    _stub_graph(monkeypatch, _rate_limit_error())

    # attempts=4 → this is the 5th and final try under max_attempts=5.
    poller._process_job(WorkerConfig(max_attempts=5), conn, _enrich_job(attempts=4))

    sql = _outcome_sql(conn)
    assert "status = 'failed'" in sql
    assert "status = 'queued'" not in sql


def test_non_transient_error_fails_immediately(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = _RecordingConn()
    _stub_graph(monkeypatch, ValueError("bad data"))

    poller._process_job(WorkerConfig(max_attempts=5), conn, _enrich_job(attempts=0))

    sql = _outcome_sql(conn)
    assert "status = 'failed'" in sql
    assert "status = 'queued'" not in sql
