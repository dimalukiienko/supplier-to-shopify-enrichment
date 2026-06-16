"""LangGraph state threaded through parse → research → draft → validate → assemble."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from worker.models.domain import Product, SupplierRow, Variant
from worker.models.fields import FieldDraft
from worker.models.settings import PromptVersion, Settings


class GraphState(BaseModel):
    """Shared state object for the enrichment graph.

    Each node reads and extends this; `node_traces` accumulates per-node trace
    records that are persisted to `runs.node_traces` for observability.
    """

    # Inputs (loaded by the fetch stage)
    product: Product
    variants: list[Variant] = Field(default_factory=list)
    supplier_rows: list[SupplierRow] = Field(default_factory=list)
    settings: Settings | None = None
    prompt_versions: dict[str, PromptVersion] = Field(default_factory=dict)

    # Working data
    research_facts: list[dict[str, Any]] = Field(default_factory=list)
    drafts: list[FieldDraft] = Field(default_factory=list)

    # Observability
    node_traces: dict[str, Any] = Field(default_factory=dict)
