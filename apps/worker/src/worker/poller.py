"""Job poller — drains the `jobs` queue (docs/ARCHITECTURE.md §5.1).

A job is claimed by atomically flipping `queued → processing` under
`SELECT ... FOR UPDATE SKIP LOCKED`, so multiple worker instances can run
concurrently without double-processing. Claiming commits immediately (releasing
the row lock); the slower work (clustering or the LLM graph) then runs and is
committed in its own transaction. Failures mark the job `failed`, bump
`attempts`, and record the error.

Entry point: the `worker` console script.
"""

from __future__ import annotations

import logging
import time
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


def run_forever(config: WorkerConfig) -> None:
    """Poll and process jobs until interrupted (or until drained, if configured)."""
    logging.basicConfig(level=logging.INFO)
    with connect(config.database_url) as conn:
        while True:
            job = _claim_job(conn)
            if job is None:
                if config.drain:
                    logger.info("queue drained; exiting")
                    return
                time.sleep(config.poll_interval_seconds)
                continue
            _process_job(conn, job)


def main() -> None:
    config = WorkerConfig()
    run_forever(config)


if __name__ == "__main__":
    main()
