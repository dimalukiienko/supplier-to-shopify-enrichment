"""Web/product research seam (research node).

ARCHITECTURE §6 calls for a web/search tool that looks up brand, specs, and
barcode for thin rows; grounded facts are tagged `source="web"` and override the
LLM draft. Stage 1 grounds **vendor**, **barcode**, and the physical-attribute
specs **weight / dimensions / pack_qty** via a two-step flow:

1. Web search (`web_search.search`) for the product, then
2. a focused LLM extraction (`llm.complete_json`) that pulls those facts out
   of the search snippets, **only** from the supplied results (no guessing — the
   specs stay `null` for thin/obscure SKUs rather than being estimated).

Product/variant **media** is grounded separately in `worker.media` (verified,
colour-aware, per-variant), invoked alongside this from the research node.

When no `WEB_SEARCH_API_KEY` is set, `web_search.search` returns nothing, so this
falls back to a no-op (the Stage-1 deferral default) and downstream drafts stay
`source="llm"`.

A fact is a dict: ``{"field_name": str, "value": str, "confidence": float,
"source": "web", "url": str}``.
"""

from __future__ import annotations

import json
from typing import Any

from worker import llm, web_search
from worker.models.domain import Product, SupplierRow

# Fields we attempt to ground from the web (ARCHITECTURE §6). Physical specs are
# web-grounded only — never LLM-estimated — so they stay empty when unsupported.
GROUNDED_FIELDS = ["vendor", "barcode", "weight", "dimensions", "pack_qty"]

_EXTRACT_SYSTEM = (
    "You extract verified product facts from web search results for a Shopify "
    "catalogue. Using ONLY the supplied search results, return a single JSON "
    "object with keys 'vendor', 'barcode', 'weight', 'dimensions', and "
    "'pack_qty'. Each key maps to an object with "
    '"value" (string), "confidence" (number 0-1), and "url" (the source result '
    "URL the value came from), or null when the results do not clearly support "
    "it. 'vendor' is the brand/manufacturer; 'barcode' is the UPC/EAN/GTIN; "
    "'weight' is the product weight including its unit (e.g. '12 g', '0.5 kg'); "
    "'dimensions' are 'L × W × H' including a unit (e.g. '11 cm × 4 cm × 2 cm'); "
    "'pack_qty' is the number of units per pack as an integer string. "
    "Never guess or invent values — prefer null over a low-confidence answer."
)


def _build_query(supplier_rows: list[SupplierRow]) -> str:
    """Compose a search query from the most descriptive supplier row."""
    for row in supplier_rows:
        name = (row.product_name or "").strip()
        sku = (row.supplier_sku or "").strip()
        terms = " ".join(t for t in (name, sku) if t)
        if terms:
            return f"{terms} brand barcode specs dimensions weight"
    return ""


def research_facts(
    product: Product,
    supplier_rows: list[SupplierRow],
    *,
    model: str = "gpt-4o-mini",
) -> list[dict[str, Any]]:
    """Return grounded research facts (vendor/barcode/specs/media) for a product.

    No-op (returns ``[]``) when web search is disabled or yields nothing.
    """
    query = _build_query(supplier_rows)
    results = web_search.search(query)
    if not results:
        return []

    user = json.dumps(
        {"query": query, "results": [r.model_dump() for r in results]},
        default=str,
    )
    response = llm.complete_json(model=model, system=_EXTRACT_SYSTEM, user=user)
    content = response.content

    facts: list[dict[str, Any]] = []
    for field_name in GROUNDED_FIELDS:
        raw = content.get(field_name)
        if not isinstance(raw, dict):
            continue
        value = raw.get("value")
        if value in (None, ""):
            continue
        try:
            confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.9))))
        except (TypeError, ValueError):
            confidence = 0.9
        facts.append(
            {
                "field_name": field_name,
                "value": str(value).strip(),
                "confidence": confidence,
                "source": "web",
                "url": str(raw.get("url", "")),
            }
        )

    return facts
