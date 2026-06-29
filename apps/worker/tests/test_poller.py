"""Poller tests — concurrent claim/drain behaviour with the DB and the
processing pipeline stubbed (no live DB, no network).

The real claim query and `_process_job` are exercised elsewhere; here we verify
that `run_forever` fans work out across `concurrency` loops, processes every job
exactly once (no double-claim), and drains cleanly without hanging.
"""

from __future__ import annotations

import threading
import time
from contextlib import contextmanager
from typing import Any
from uuid import UUID, uuid4

import pytest

from worker import poller
from worker.config import WorkerConfig


class _JobSource:
    """Thread-safe source of queued job rows; hands each out once, then None."""

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
        self._lock = threading.Lock()

    def next_row(self) -> dict[str, Any] | None:
        with self._lock:
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


def _install(
    monkeypatch: pytest.MonkeyPatch, source: _JobSource, *, process_delay: float = 0.0
) -> tuple[list[UUID], threading.Lock]:
    """Wire fake connections + a recording `_process_job`; return the record sink."""
    processed: list[UUID] = []
    record_lock = threading.Lock()

    @contextmanager
    def fake_connect(_url: str) -> Any:
        yield _FakeConn(source)

    def fake_process(conn: Any, job: poller.ClaimedJob) -> None:
        if process_delay:
            time.sleep(process_delay)
        with record_lock:
            processed.append(job.id)

    monkeypatch.setattr(poller, "connect", fake_connect)
    monkeypatch.setattr(poller, "_process_job", fake_process)
    return processed, record_lock


def _run_with_timeout(config: WorkerConfig, timeout: float = 5.0) -> None:
    """Run `run_forever` in a thread and assert it drains within `timeout`."""
    thread = threading.Thread(target=poller.run_forever, args=(config,))
    thread.start()
    thread.join(timeout)
    assert not thread.is_alive(), "run_forever did not drain within the timeout"


def test_concurrent_drain_processes_each_job_once(monkeypatch: pytest.MonkeyPatch) -> None:
    job_ids = [uuid4() for _ in range(12)]
    source = _JobSource(job_ids)
    processed, _ = _install(monkeypatch, source, process_delay=0.01)

    config = WorkerConfig(
        database_url="fake", concurrency=4, drain=True, poll_interval_seconds=0.01
    )
    _run_with_timeout(config)

    # Every job handled exactly once — no drops, no double-claims.
    assert sorted(processed) == sorted(job_ids)
    assert len(processed) == len(set(processed))


def test_single_loop_drains_in_order(monkeypatch: pytest.MonkeyPatch) -> None:
    job_ids = [uuid4() for _ in range(5)]
    source = _JobSource(job_ids)
    processed, _ = _install(monkeypatch, source)

    config = WorkerConfig(
        database_url="fake", concurrency=1, drain=True, poll_interval_seconds=0.01
    )
    _run_with_timeout(config)

    # One loop preserves the FIFO claim order it had before concurrency existed.
    assert processed == job_ids


def test_empty_queue_drains_immediately(monkeypatch: pytest.MonkeyPatch) -> None:
    source = _JobSource([])
    processed, _ = _install(monkeypatch, source)

    config = WorkerConfig(
        database_url="fake", concurrency=4, drain=True, poll_interval_seconds=0.01
    )
    _run_with_timeout(config)

    assert processed == []
