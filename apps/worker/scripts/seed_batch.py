"""Dev harness: load the sample supplier CSV into a batch + supplier_rows and
enqueue a `cluster_batch` job, so the worker has something to process before the
BFF upload path exists.

    uv run python scripts/seed_batch.py [path/to/products.csv]

This is a throwaway local helper (Milestone 1 verification); the Next.js BFF
upload route replaces it. It does not modify the sample CSV.
"""

from __future__ import annotations

import csv
import sys
from datetime import UTC, datetime
from pathlib import Path

from worker.config import WorkerConfig
from worker.db import connect

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CSV = REPO_ROOT / "data" / "products_input.csv"


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def seed_batch(csv_path: Path) -> None:
    config = WorkerConfig()
    if not config.database_url:
        raise SystemExit("DATABASE_URL is not set (check .env)")

    with csv_path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    batch_name = f"Sample import {datetime.now(UTC):%Y-%m-%d %H:%M:%S}"

    with connect(config.database_url) as conn, conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "INSERT INTO batches (name, source_format, status) "
            "VALUES (%s, 'csv', 'uploaded') RETURNING id",
            (batch_name,),
        )
        batch_id = cur.fetchone()["id"]

        for row in rows:
            price = _clean(row.get("unit_price"))
            cur.execute(
                "INSERT INTO supplier_rows "
                "(batch_id, row_id, product_name, supplier_sku, barcode, "
                " supplier_notes, unit_price) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    batch_id,
                    _clean(row.get("row_id")),
                    _clean(row.get("product_name")),
                    _clean(row.get("supplier_sku")),
                    _clean(row.get("barcode")),
                    _clean(row.get("supplier_notes")),
                    float(price) if price else None,
                ),
            )

        cur.execute(
            "INSERT INTO jobs (type, status, batch_id) VALUES ('cluster_batch', 'queued', %s)",
            (batch_id,),
        )

    print(f"Seeded batch {batch_id} with {len(rows)} supplier rows; enqueued cluster_batch job.")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    seed_batch(path)
