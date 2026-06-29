"""Job poller — drains the `jobs` queue (docs/ARCHITECTURE.md §5.1).

A job is claimed by atomically flipping `queued → processing` under
`SELECT ... FOR UPDATE SKIP LOCKED`, so multiple worker instances — and the
`config.concurrency` in-process loops a single instance runs (each on its own DB
connection) — can run concurrently without double-processing. Claiming commits
immediately (releasing the row lock); the slower work (clustering or the LLM
graph) then runs and is committed in its own transaction. Failures mark the job
`failed`, bump `attempts`, and record the error.

Entry point: the `worker` console script.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from worker.config import WorkerConfig
from worker.db import DictConnection, connect
from worker.graph import run_graph
from worker.pipeline import fetch_inputs, persist_results, preprocess_batch

logger = logging.getLogger("worker.poller")

# Claim the oldest queued job, locking it so concurrent workers skip it.
CLAIM_JOB_SQL = """
SELECT id, type, product_id, batch_id, attempts
FROM jobs
WHERE status = 'queued'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 1
"""


@dataclass
class ClaimedJob:
    id: UUID
    type: str
    product_id: UUID | None
    batch_id: UUID | None
    attempts: int


def _claim_job(conn: DictConnection) -> ClaimedJob | None:
    """Atomically claim and mark one queued job as processing."""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(CLAIM_JOB_SQL)
        row: dict[str, Any] | None = cur.fetchone()
        if row is None:
            return None
        cur.execute("UPDATE jobs SET status = 'processing' WHERE id = %s", (row["id"],))
        return ClaimedJob(
            id=row["id"],
            type=row["type"],
            product_id=row["product_id"],
            batch_id=row["batch_id"],
            attempts=row["attempts"],
        )


def _mark_done(conn: DictConnection, job_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute("UPDATE jobs SET status = 'done' WHERE id = %s", (job_id,))


def _mark_failed(conn: DictConnection, job: ClaimedJob, error: str) -> None:
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "UPDATE jobs SET status = 'failed', error = %s, attempts = %s WHERE id = %s",
            (error[:2000], job.attempts + 1, job.id),
        )


def _process_job(conn: DictConnection, job: ClaimedJob) -> None:
    """Run a claimed job to completion (or mark it failed)."""
    try:
        if job.type == "cluster_batch":
            if job.batch_id is None:
                raise ValueError("cluster_batch job missing batch_id")
            with conn.transaction():
                preprocess_batch(conn, job.batch_id)
                _mark_done(conn, job.id)
        elif job.type == "enrich_product":
            if job.product_id is None:
                raise ValueError("enrich_product job missing product_id")
            with conn.transaction():
                state = fetch_inputs(conn, job.product_id)
            result = run_graph(state)  # LLM/graph work — outside the DB transaction
            with conn.transaction():
                persist_results(conn, result, job.id)
                _mark_done(conn, job.id)
        else:
            raise ValueError(f"unknown job type: {job.type}")
        logger.info("job %s (%s) done", job.id, job.type)
    except Exception as exc:  # noqa: BLE001 — record any failure on the job row
        logger.exception("job %s (%s) failed", job.id, job.type)
        conn.rollback()
        _mark_failed(conn, job, str(exc))


class _Coordinator:
    """Shared state that lets concurrent worker loops drain cleanly together.

    Claiming a job and counting it in-flight happen atomically under one lock, so
    the drain check ("nothing queued and nothing in-flight") is race-free: when a
    claim returns nothing while the in-flight count is zero, no sibling can be
    mid-claim (claiming holds the same lock) and the queue is empty, so the work
    is genuinely done. The count is decremented only *after* a job's processing
    commits, by which point any jobs it enqueued (e.g. cluster_batch → enrich)
    are already visible as `queued`.
    """

    def __init__(self) -> None:
        self.stop = threading.Event()
        self._lock = threading.Lock()
        self._inflight = 0

    def claim(self, conn: DictConnection, *, drain: bool) -> tuple[ClaimedJob | None, bool]:
        """Claim the next job; return (job, should_exit).

        `should_exit` is True only when draining and the queue is empty with
        nothing in-flight — in which case the stop event is set so siblings wind
        down too.
        """
        with self._lock:
            job = _claim_job(conn)
            if job is not None:
                self._inflight += 1
                return job, False
            if drain and self._inflight == 0:
                self.stop.set()
                return None, True
            return None, False

    def done(self) -> None:
        with self._lock:
            self._inflight -= 1


def _worker_loop(config: WorkerConfig, conn: DictConnection, coord: _Coordinator) -> None:
    """Claim and process jobs on one connection until drained or stopped."""
    while not coord.stop.is_set():
        job, should_exit = coord.claim(conn, drain=config.drain)
        if should_exit:
            logger.info("queue drained; worker loop exiting")
            return
        if job is None:
            # Sleep until the next poll, waking early if another loop signals stop.
            coord.stop.wait(config.poll_interval_seconds)
            continue
        try:
            _process_job(conn, job)
        finally:
            coord.done()


def _threaded_loop(config: WorkerConfig, coord: _Coordinator) -> None:
    """Thread target: own DB connection + worker loop (connections aren't shared)."""
    with connect(config.database_url) as conn:
        _worker_loop(config, conn, coord)


def run_forever(config: WorkerConfig) -> None:
    """Poll and process jobs until interrupted (or until drained, if configured).

    Runs `config.concurrency` independent claim→process loops, each on its own DB
    connection; `FOR UPDATE SKIP LOCKED` keeps them from double-processing a job.
    """
    logging.basicConfig(level=logging.INFO)
    coord = _Coordinator()

    if config.concurrency <= 1:
        with connect(config.database_url) as conn:
            _worker_loop(config, conn, coord)
        return

    threads = [
        threading.Thread(
            target=_threaded_loop,
            args=(config, coord),
            name=f"worker-{i}",
            daemon=True,
        )
        for i in range(config.concurrency)
    ]
    for thread in threads:
        thread.start()
    try:
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        logger.info("interrupted; signalling workers to stop")
        coord.stop.set()
        for thread in threads:
            thread.join()


def main() -> None:
    config = WorkerConfig()
    run_forever(config)


if __name__ == "__main__":
    main()
