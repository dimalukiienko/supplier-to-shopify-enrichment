"""Unit tests for the web-research seam (search + LLM extraction)."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from worker import llm, research, web_search
from worker.llm import LLMResponse
from worker.models.domain import Product, SupplierRow
from worker.web_search import WebResult


def _now() -> datetime:
    return datetime.now(UTC)


def _rows() -> list[SupplierRow]:
    return [
        SupplierRow(
            id=uuid4(), batch_id=uuid4(),
            product_name="RAPALA ORIGINAL FLOATER F11",
            supplier_sku="RAP-F11-SLV", created_at=_now(), updated_at=_now(),
        )
    ]


def _product() -> Product:
    return Product(id=uuid4(), batch_id=uuid4(), status="queued",
                   created_at=_now(), updated_at=_now())


def test_research_facts_no_op_without_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """No web results (e.g. search disabled) → no facts, no LLM call."""
    monkeypatch.setattr(web_search, "search", lambda *a, **k: [])

    def fail(*a, **k):  # type: ignore[no-untyped-def]
        raise AssertionError("LLM must not be called when there are no results")

    monkeypatch.setattr(llm, "complete_json", fail)
    assert research.research_facts(_product(), _rows()) == []


def test_research_facts_extracts_vendor_barcode_and_specs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        web_search, "search",
        lambda *a, **k: [WebResult(title="Rapala Original Floater",
                                   url="https://rapala.com/f11",
                                   content="Rapala F11 UPC 0022677012345, 6g, 11cm")],
    )

    canned = {
        "vendor": {"value": "Rapala", "confidence": 0.95, "url": "https://rapala.com/f11"},
        "barcode": {"value": "0022677012345", "confidence": 0.9,
                    "url": "https://rapala.com/f11"},
        "weight": {"value": "6 g", "confidence": 0.8, "url": "https://rapala.com/f11"},
        "dimensions": {"value": "11 cm", "confidence": 0.7,
                       "url": "https://rapala.com/f11"},
        "pack_qty": {"value": "1", "confidence": 0.6, "url": "https://rapala.com/f11"},
    }
    monkeypatch.setattr(
        llm, "complete_json",
        lambda **k: LLMResponse(content=canned, model="gpt-4o-mini"),
    )

    facts = research.research_facts(_product(), _rows())
    by_field = {f["field_name"]: f for f in facts}
    assert set(by_field) == {"vendor", "barcode", "weight", "dimensions", "pack_qty"}
    assert all(f["source"] == "web" for f in facts)
    assert by_field["vendor"]["value"] == "Rapala"
    assert by_field["barcode"]["url"] == "https://rapala.com/f11"
    assert by_field["weight"]["value"] == "6 g"


def test_research_facts_skips_null_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """A field the model could not ground (null) is dropped."""
    monkeypatch.setattr(
        web_search, "search",
        lambda *a, **k: [WebResult(title="t", url="u", content="c")],
    )
    canned = {
        "vendor": {"value": "Rapala", "confidence": 0.9, "url": "u"},
        "barcode": None,
    }
    monkeypatch.setattr(
        llm, "complete_json",
        lambda **k: LLMResponse(content=canned, model="gpt-4o-mini"),
    )

    facts = research.research_facts(_product(), _rows())
    assert [f["field_name"] for f in facts] == ["vendor"]
