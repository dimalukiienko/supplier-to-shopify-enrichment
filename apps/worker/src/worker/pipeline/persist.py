"""Persist: write graph output back to enriched_fields, runs, jobs, products
(docs/ARCHITECTURE.md §5.2 step 5). Stub."""

from __future__ import annotations

from worker.models.graph_state import GraphState


def persist_results(state: GraphState) -> None:
    raise NotImplementedError("result persistence not yet implemented")
