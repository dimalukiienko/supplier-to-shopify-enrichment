"""Fetch: load the product, its variants, the linked supplier rows, settings,
and active prompt versions into a `GraphState` (docs/ARCHITECTURE.md §5.2 step 2).
"""

from __future__ import annotations

from uuid import UUID

from worker.db import DictConnection
from worker.models.domain import Product, SupplierRow, Variant
from worker.models.graph_state import GraphState
from worker.models.settings import PromptVersion, Settings


def fetch_inputs(conn: DictConnection, product_id: UUID) -> GraphState:
    """Assemble the enrichment graph's input state for a single product."""
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product_row = cur.fetchone()
        if product_row is None:
            raise ValueError(f"product not found: {product_id}")
        product = Product.model_validate(product_row)

        cur.execute(
            "SELECT * FROM variants WHERE product_id = %s ORDER BY position",
            (product_id,),
        )
        variants = [Variant.model_validate(r) for r in cur.fetchall()]

        supplier_row_ids = [v.supplier_row_id for v in variants if v.supplier_row_id is not None]
        supplier_rows: list[SupplierRow] = []
        if supplier_row_ids:
            cur.execute(
                "SELECT * FROM supplier_rows WHERE id = ANY(%s) ORDER BY created_at",
                (supplier_row_ids,),
            )
            supplier_rows = [SupplierRow.model_validate(r) for r in cur.fetchall()]

        cur.execute("SELECT * FROM settings ORDER BY created_at LIMIT 1")
        settings_row = cur.fetchone()
        settings = Settings.model_validate(settings_row) if settings_row else None

        cur.execute("SELECT * FROM prompt_versions WHERE is_active = true")
        prompt_versions = {
            pv.name: pv for pv in (PromptVersion.model_validate(r) for r in cur.fetchall())
        }

    return GraphState(
        product=product,
        variants=variants,
        supplier_rows=supplier_rows,
        settings=settings,
        prompt_versions=prompt_versions,
    )
