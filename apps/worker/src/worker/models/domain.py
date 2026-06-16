"""Domain models — mirror the Supabase domain/processing tables (docs/DATABASE.md §3)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

BatchStatus = Literal["uploaded", "clustering", "enriching", "done"]
ProductStatus = Literal["queued", "enriching", "enriched", "approved", "published"]
JobType = Literal["cluster_batch", "enrich_product"]
JobStatus = Literal["queued", "processing", "done", "failed"]
RunStatus = Literal["success", "partial", "failed"]


class Batch(BaseModel):
    id: UUID
    name: str
    source_format: Literal["csv", "xlsx"]
    status: BatchStatus
    created_at: datetime
    updated_at: datetime


class SupplierRow(BaseModel):
    id: UUID
    batch_id: UUID
    row_id: str | None = None
    product_name: str | None = None
    supplier_sku: str | None = None
    barcode: str | None = None
    supplier_notes: str | None = None
    unit_price: float | None = None
    created_at: datetime
    updated_at: datetime


class Product(BaseModel):
    id: UUID
    batch_id: UUID
    status: ProductStatus
    created_at: datetime
    updated_at: datetime


class Variant(BaseModel):
    id: UUID
    product_id: UUID
    supplier_row_id: UUID | None = None
    size: str | None = None
    color: str | None = None
    position: int = 0
    created_at: datetime
    updated_at: datetime


class Job(BaseModel):
    id: UUID
    type: JobType
    status: JobStatus
    product_id: UUID | None = None
    batch_id: UUID | None = None
    payload: dict[str, Any] | None = None
    error: str | None = None
    attempts: int = 0
    created_at: datetime
    updated_at: datetime


class Run(BaseModel):
    id: UUID
    product_id: UUID
    job_id: UUID
    graph_version: str | None = None
    status: RunStatus
    node_traces: dict[str, Any] | None = None
    model: str | None = None
    prompt_version: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_ms: int | None = None
    created_at: datetime
    updated_at: datetime
