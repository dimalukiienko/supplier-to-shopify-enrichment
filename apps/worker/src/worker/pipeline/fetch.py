"""Fetch: load products, variants, supplier_rows, settings, prompt_versions
into the graph state (docs/ARCHITECTURE.md §5.2 step 2). Stub."""

from __future__ import annotations

from uuid import UUID

from worker.models.graph_state import GraphState


def fetch_inputs(product_id: UUID) -> GraphState:
    raise NotImplementedError("input fetch not yet implemented")
