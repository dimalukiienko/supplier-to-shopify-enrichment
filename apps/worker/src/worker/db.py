"""Direct Postgres access for the worker.

The worker talks to Postgres over a plain psycopg connection (not supabase-py)
because the job poller needs transactional `SELECT ... FOR UPDATE SKIP LOCKED`
semantics to claim queue rows without double-processing (docs/ARCHITECTURE.md §5.1).
Rows come back as dicts so callers can build Pydantic models directly.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

DictConnection = psycopg.Connection[dict[str, Any]]


@contextmanager
def connect(database_url: str) -> Iterator[DictConnection]:
    """Open a dict-row psycopg connection, closing it on exit.

    Autocommit is left off: the poller drives explicit transactions so a job
    claim and its processing commit (or roll back) atomically.
    """
    conn = psycopg.connect(database_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()
