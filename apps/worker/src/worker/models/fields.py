"""Enriched-field models — the per-field provenance contract (docs/DATABASE.md §3.5).

`FieldDraft` is the shape the LLM returns in structured-output mode (one entry
per field carrying value/confidence/source). `EnrichedField` is the persisted
row that adds identity and human review `status`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

FieldSource = Literal["llm", "web", "manual"]
FieldStatus = Literal["ai", "accepted", "overridden"]


class FieldDraft(BaseModel):
    """LLM structured-output contract for a single enriched field.

    Grounded facts from the research node are tagged `source="web"`; ungrounded
    model output is `source="llm"` (docs/ARCHITECTURE.md §5.2).

    `variant_id` is normally `None` (product-scoped). The media grounding step
    sets it to attach a verified image to a specific variant's colourway.
    """

    field_name: str
    value: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    source: FieldSource = "llm"
    variant_id: UUID | None = None


class EnrichedField(BaseModel):
    """A persisted enriched_fields row."""

    id: UUID
    product_id: UUID
    variant_id: UUID | None = None
    field_name: str
    value: str | None = None
    confidence: float | None = None
    source: FieldSource
    status: FieldStatus
    created_at: datetime
    updated_at: datetime
