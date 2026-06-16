"""Hand-written Pydantic models — the worker's source of truth.

These mirror the SQL schema in `docs/DATABASE.md` (domain) and define the
structured-output contract the LLM nodes must satisfy (fields). A contract
test (`tests/test_model_contract.py`) asserts field/enum parity with the
Supabase migrations so the hand-written models can't silently drift.
"""

from worker.models.domain import Batch, Job, Product, Run, SupplierRow, Variant
from worker.models.fields import EnrichedField, FieldDraft, FieldSource, FieldStatus
from worker.models.graph_state import GraphState
from worker.models.settings import PromptVersion, Settings

__all__ = [
    "Batch",
    "SupplierRow",
    "Product",
    "Variant",
    "Job",
    "Run",
    "EnrichedField",
    "FieldDraft",
    "FieldSource",
    "FieldStatus",
    "GraphState",
    "Settings",
    "PromptVersion",
]
