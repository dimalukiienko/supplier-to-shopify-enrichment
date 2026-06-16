"""Job poller — drains the `jobs` queue with FOR UPDATE SKIP LOCKED so multiple
worker instances run concurrently without double-processing (docs/ARCHITECTURE.md §5.1).

Entry point (`worker` console script). The claim/processing loop is a stub.
"""

from __future__ import annotations

from worker.config import WorkerConfig

# Reference query for queue consumption (executed by the real loop):
CLAIM_JOB_SQL = """
SELECT id, type, status, product_id, batch_id, payload, attempts
FROM jobs
WHERE status = 'queued'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT %(batch_size)s
"""


def run_forever(config: WorkerConfig) -> None:
    """Poll and process jobs until interrupted. Stub."""
    raise NotImplementedError("poll loop not yet implemented")


def main() -> None:
    config = WorkerConfig()
    run_forever(config)


if __name__ == "__main__":
    main()
