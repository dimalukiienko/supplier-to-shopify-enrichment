"""Web/product research seam (research node).

ARCHITECTURE §6 calls for a web/search tool that looks up brand, specs, and
barcode for thin rows; grounded facts are tagged `source="web"`. Live web search
is **deferred** in Stage 1, so the default implementation is a no-op that returns
no grounded facts — the node still runs and downstream drafts fall back to
`source="llm"`. Tests and a future real tool replace `research_facts`.

A fact is a dict: ``{"field_name": str, "value": str, "source": "web"}``.
"""

from __future__ import annotations

from typing import Any

from worker.models.domain import Product, SupplierRow


def research_facts(product: Product, supplier_rows: list[SupplierRow]) -> list[dict[str, Any]]:
    """Return grounded research facts for a product. Stage 1: none (deferred)."""
    return []
