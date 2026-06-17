"""Preprocessing: normalize fields, strip size tokens, and cluster supplier rows
that represent the same product into one product with size variants
(docs/ARCHITECTURE.md §5.2 step 1).

Clustering keys off the supplier SKU: apparel rows share a base SKU with the
size as the trailing segment (e.g. ``SC-20135643-CH-S`` / ``-M`` / ``-L`` →
base ``SC-20135643-CH``). Rows without a recognized apparel size become their own
single-variant product. The pure helpers (`build_clusters` and friends) carry no
DB dependency so they can be unit-tested directly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from worker.db import DictConnection
from worker.models.domain import SupplierRow
from worker.normalize import SIZE_ORDER, cluster_key, extract_size


@dataclass
class ClusteredVariant:
    row: SupplierRow
    size: str | None


@dataclass
class ProductCluster:
    key: str
    variants: list[ClusteredVariant] = field(default_factory=list)


def build_clusters(rows: list[SupplierRow]) -> list[ProductCluster]:
    """Group supplier rows into product clusters, preserving first-seen order."""
    clusters: dict[str, ProductCluster] = {}
    for row in rows:
        size = extract_size(row.supplier_sku, row.product_name)
        key = cluster_key(row.supplier_sku, row.product_name, size)
        cluster = clusters.setdefault(key, ProductCluster(key=key))
        cluster.variants.append(ClusteredVariant(row=row, size=size))
    return list(clusters.values())


def _variant_position(size: str | None) -> int:
    if size is None:
        return 0
    try:
        return SIZE_ORDER.index(size)
    except ValueError:
        return 0


def preprocess_batch(conn: DictConnection, batch_id: UUID) -> None:
    """Cluster a batch's supplier rows into products + variants and enqueue one
    `enrich_product` job per product. Runs inside the caller's transaction."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM supplier_rows WHERE batch_id = %s ORDER BY created_at",
            (batch_id,),
        )
        rows = [SupplierRow.model_validate(r) for r in cur.fetchall()]

        clusters = build_clusters(rows)
        for cluster in clusters:
            cur.execute(
                "INSERT INTO products (batch_id, status) VALUES (%s, 'queued') RETURNING id",
                (batch_id,),
            )
            product_id = cur.fetchone()["id"]  # type: ignore[index]

            ordered = sorted(cluster.variants, key=lambda v: _variant_position(v.size))
            for position, variant in enumerate(ordered):
                cur.execute(
                    "INSERT INTO variants (product_id, supplier_row_id, size, position) "
                    "VALUES (%s, %s, %s, %s)",
                    (product_id, variant.row.id, variant.size, position),
                )

            cur.execute(
                "INSERT INTO jobs (type, status, product_id) "
                "VALUES ('enrich_product', 'queued', %s)",
                (product_id,),
            )

        cur.execute(
            "UPDATE batches SET status = 'enriching' WHERE id = %s",
            (batch_id,),
        )
