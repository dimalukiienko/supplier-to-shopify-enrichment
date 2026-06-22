"""Graph integration test — runs the compiled LangGraph end to end with the LLM
call stubbed (no network)."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from worker import llm
from worker.graph import run_graph
from worker.llm import LLMResponse
from worker.models.domain import Product, SupplierRow, Variant
from worker.models.graph_state import GraphState
from worker.models.settings import PromptVersion, Settings

_CANNED = {
    "vendor": {"value": "Salty Crew", "confidence": 0.9},
    "product_type": {"value": "Sunshirt", "confidence": 0.8},
    # Brand deliberately repeated inside name to exercise title de-duplication.
    "name": {"value": "Salty Crew Surface Hood Sunshirt Charcoal", "confidence": 0.85},
    "description": {"value": "A hooded sun shirt.", "confidence": 0.7},
    "tags": {"value": "sunshirt, charcoal", "confidence": 0.6},
    "seo_title": {"value": "Salty Crew Sunshirt", "confidence": 0.5},
    "seo_description": {"value": "Buy the sunshirt.", "confidence": 0.5},
}


def _now() -> datetime:
    return datetime.now(UTC)


def _state() -> GraphState:
    product = Product(id=uuid4(), batch_id=uuid4(), status="queued", created_at=_now(),
                      updated_at=_now())
    row = SupplierRow(
        id=uuid4(), batch_id=product.batch_id,
        product_name="SALTY CREW SURFACE HOOD SUNSHIRT CHARCOAL S",
        supplier_sku="SC-20135643-CH-S", created_at=_now(), updated_at=_now(),
    )
    variant = Variant(id=uuid4(), product_id=product.id, supplier_row_id=row.id, size="S",
                      position=1, created_at=_now(), updated_at=_now())
    settings = Settings(
        id=uuid4(),
        title_template=[{"token": "Brand"}, {"token": "Size"}, {"token": "Name"}],
        default_model="gpt-4o-mini",
        guardrail_config={"min_confidence": 0.4, "require_grounded_barcode": True},
        created_at=_now(), updated_at=_now(),
    )
    prompt = PromptVersion(id=uuid4(), name="enrich_product", version=1,
                           content="Enrich the product.", is_active=True,
                           created_at=_now(), updated_at=_now())
    return GraphState(product=product, variants=[variant], supplier_rows=[row],
                      settings=settings, prompt_versions={"enrich_product": prompt})


@pytest.fixture(autouse=True)
def _stub_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake(*, model: str, system: str, user: str, temperature: float = 0.2) -> LLMResponse:
        return LLMResponse(content=_CANNED, model=model, input_tokens=12, output_tokens=8,
                           latency_ms=3)

    monkeypatch.setattr(llm, "complete_json", fake)


def test_graph_produces_expected_fields() -> None:
    result = run_graph(_state())
    fields = {d.field_name: d for d in result.drafts}

    # All built/partial fields plus the rule-composed title.
    assert set(fields) == {
        "title", "vendor", "product_type", "description", "tags",
        "seo_title", "seo_description",
    }
    # Title is composed from the template (Brand + Name; Size is variant-level → skipped).
    assert fields["title"].value == "Salty Crew Surface Hood Sunshirt Charcoal"
    assert fields["vendor"].value == "Salty Crew"
    assert all(d.source == "llm" for d in result.drafts)


def test_graph_records_node_traces() -> None:
    result = run_graph(_state())
    assert {"parse", "research", "draft", "validate", "assemble"} <= set(result.node_traces)
    assert result.node_traces["draft"]["input_tokens"] == 12


def test_graph_grounds_vendor_and_barcode(monkeypatch: pytest.MonkeyPatch) -> None:
    """Grounded web facts override vendor and add a barcode draft (source='web')."""
    from worker.graph import nodes

    def fake_research(product, supplier_rows, *, model="gpt-4o-mini"):  # type: ignore[no-untyped-def]
        return [
            {"field_name": "vendor", "value": "Rapala", "confidence": 0.95,
             "source": "web", "url": "https://rapala.com"},
            {"field_name": "barcode", "value": "0022677012345", "confidence": 0.9,
             "source": "web", "url": "https://barcodelookup.com/0022677012345"},
        ]

    monkeypatch.setattr(nodes.research_tool, "research_facts", fake_research)

    result = run_graph(_state())
    fields = {d.field_name: d for d in result.drafts}

    assert fields["vendor"].source == "web"
    assert fields["vendor"].value == "Rapala"
    assert fields["vendor"].confidence >= 0.9
    # barcode is not in DRAFT_FIELDS but is appended from grounded facts and
    # survives validate's require_grounded_barcode guardrail (source='web').
    assert "barcode" in fields
    assert fields["barcode"].source == "web"
    assert fields["barcode"].value == "0022677012345"
    # Citations are recorded for reviewer provenance.
    sources = {s["field_name"] for s in result.node_traces["research"]["sources"]}
    assert {"vendor", "barcode"} <= sources
