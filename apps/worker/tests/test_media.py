"""Unit tests for verified, colour-aware media grounding (worker.media)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest

from worker import media
from worker.llm import LLMResponse
from worker.models.domain import Product, SupplierRow, Variant


def _now() -> datetime:
    return datetime.now(UTC)


def _product() -> Product:
    return Product(id=uuid4(), batch_id=uuid4(), status="queued",
                   created_at=_now(), updated_at=_now())


def _row(name: str) -> SupplierRow:
    return SupplierRow(id=uuid4(), batch_id=uuid4(), product_name=name,
                       created_at=_now(), updated_at=_now())


def _variant(row: SupplierRow, *, size: str | None = None, color: str | None = None,
             position: int = 0) -> Variant:
    return Variant(id=uuid4(), product_id=uuid4(), supplier_row_id=row.id,
                   size=size, color=color, position=position,
                   created_at=_now(), updated_at=_now())


def _verdict(*, right_item: bool = True, right_colour: Any = True,
             real_photo: bool = True, good_quality: bool = True,
             packshot: bool = True, confidence: float = 0.93) -> LLMResponse:
    return LLMResponse(
        content={
            "right_item": right_item,
            "right_colour": right_colour,
            "real_photo": real_photo,
            "good_quality": good_quality,
            "packshot": packshot,
            "confidence": confidence,
            "reason": "stub",
        },
        model="gpt-4o-mini",
    )


def test_ground_media_keeps_first_verified_candidate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The first candidate that verifies wins, for the product and every variant."""
    row = _row("SALTY CREW SURFACE HOOD SUNSHIRT CHARCOAL")
    variants = [
        _variant(row, size="S", color="charcoal", position=0),
        _variant(row, size="M", color="charcoal", position=1),
        _variant(row, size="L", color="charcoal", position=2),
    ]
    monkeypatch.setattr(
        media.web_search, "search_images",
        lambda *a, **k: ["https://img/bad.jpg", "https://img/good.jpg", "https://img/x.jpg"],
    )

    def fake_vision(**kwargs: Any) -> LLMResponse:
        # The "bad" candidate is an illustration; the "good" one passes.
        if "bad" in kwargs["image_url"]:
            return _verdict(real_photo=False, confidence=0.95)
        return _verdict(confidence=0.93)

    monkeypatch.setattr(media.llm, "complete_json_vision", fake_vision)

    drafts, trace = media.ground_media(_product(), variants, [row])

    product_level = [d for d in drafts if d.variant_id is None]
    per_variant = {d.variant_id: d for d in drafts if d.variant_id is not None}
    assert len(product_level) == 1
    assert product_level[0].value == "https://img/good.jpg"
    assert product_level[0].source == "web"
    assert product_level[0].confidence == pytest.approx(0.93)
    assert {v.id for v in variants} == set(per_variant)
    assert all(d.value == "https://img/good.jpg" for d in per_variant.values())
    assert trace["verified_count"] == 1


def test_ground_media_leaves_empty_when_nothing_verifies(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Wrong-colour / non-photo candidates are all rejected → no drafts at all."""
    row = _row("ACME WIDGET RED")
    variants = [_variant(row, size="S", color="red", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images",
        lambda *a, **k: ["https://img/ai.jpg", "https://img/bluewidget.jpg"],
    )

    def fake_vision(**kwargs: Any) -> LLMResponse:
        if "ai" in kwargs["image_url"]:
            return _verdict(real_photo=False)
        return _verdict(right_colour=False)  # wrong colour

    monkeypatch.setattr(media.llm, "complete_json_vision", fake_vision)

    drafts, trace = media.ground_media(_product(), variants, [row])
    assert drafts == []
    assert trace["verified_count"] == 0
    assert trace["groups"][0]["chosen"] is None


def test_ground_media_one_image_per_colour(monkeypatch: pytest.MonkeyPatch) -> None:
    """Distinct colours each get their own verified image on the right variants."""
    charcoal_row = _row("SALTY CREW HOOD CHARCOAL")
    black_row = _row("SALTY CREW HOOD BLACK")
    charcoal = _variant(charcoal_row, size="S", color="charcoal", position=0)
    black = _variant(black_row, size="S", color="black", position=1)

    def fake_images(query: str, **k: Any) -> list[str]:
        if "charcoal" in query:
            return ["https://img/charcoal.jpg"]
        if "black" in query:
            return ["https://img/black.jpg"]
        return []

    monkeypatch.setattr(media.web_search, "search_images", fake_images)
    monkeypatch.setattr(media.llm, "complete_json_vision", lambda **k: _verdict())

    drafts, trace = media.ground_media(
        _product(), [charcoal, black], [charcoal_row, black_row]
    )

    by_variant = {d.variant_id: d.value for d in drafts if d.variant_id is not None}
    assert by_variant[charcoal.id] == "https://img/charcoal.jpg"
    assert by_variant[black.id] == "https://img/black.jpg"
    # Product-level image comes from the first (representative) colour group.
    product_level = [d for d in drafts if d.variant_id is None]
    assert len(product_level) == 1
    assert product_level[0].value == "https://img/charcoal.jpg"
    assert trace["verified_count"] == 2


def test_explicit_colour_overrides_conflicting_colour_in_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The variant colour is authoritative when the supplier name has a stale colour."""
    row = _row("Yeti Rambler 14 Oz Mug Black")
    variant = _variant(row, color="green", position=0)
    queries: list[str] = []
    expected_payloads: list[dict[str, Any]] = []

    def fake_images(query: str, **k: Any) -> list[str]:
        queries.append(query)
        return ["https://img/green-yeti.jpg"]

    def fake_vision(**kwargs: Any) -> LLMResponse:
        expected_payloads.append(json.loads(kwargs["user"])["expected"])
        return _verdict()

    monkeypatch.setattr(media.web_search, "search_images", fake_images)
    monkeypatch.setattr(media.llm, "complete_json_vision", fake_vision)

    drafts, trace = media.ground_media(_product(), [variant], [row])

    assert drafts
    assert trace["verified_count"] == 1
    assert queries == ["Yeti Rambler 14 Oz Mug green product photo white background"]
    assert expected_payloads == [
        {"brand_or_name": "Yeti Rambler 14 Oz Mug", "colour": "green"}
    ]


def test_unknown_colour_is_rejected_when_colour_expected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A `right_colour=null` ("can't tell") verdict is rejected when a colour is
    expected, so a generic image can't bleed across colourways."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variants = [_variant(row, size="S", color="charcoal", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images", lambda *a, **k: ["https://img/generic.jpg"]
    )
    monkeypatch.setattr(
        media.llm, "complete_json_vision", lambda **k: _verdict(right_colour=None)
    )

    drafts, _ = media.ground_media(_product(), variants, [row])
    assert drafts == []


def test_low_quality_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """A right-item, right-colour but blurry/low-res image is dropped."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variants = [_variant(row, size="S", color="charcoal", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images", lambda *a, **k: ["https://img/blurry.jpg"]
    )
    monkeypatch.setattr(
        media.llm, "complete_json_vision", lambda **k: _verdict(good_quality=False)
    )

    drafts, _ = media.ground_media(_product(), variants, [row])
    assert drafts == []


def test_prefers_packshot_over_on_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """The best passer wins: a clean packshot beats a higher-confidence model shot."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variants = [_variant(row, size="S", color="charcoal", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images",
        lambda *a, **k: ["https://img/onmodel.jpg", "https://img/packshot.jpg"],
    )

    def fake_vision(**kwargs: Any) -> LLMResponse:
        if "onmodel" in kwargs["image_url"]:
            return _verdict(packshot=False, confidence=0.99)
        return _verdict(packshot=True, confidence=0.85)

    monkeypatch.setattr(media.llm, "complete_json_vision", fake_vision)

    drafts, _ = media.ground_media(_product(), variants, [row])
    assert [d.value for d in drafts] == [
        "https://img/packshot.jpg",  # per-variant
        "https://img/packshot.jpg",  # product-level
    ]


def test_product_image_falls_back_to_first_verified_group(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If the first colour group fails to verify, the product image comes from the
    next group that does (not left empty)."""
    charcoal_row = _row("SALTY CREW HOOD CHARCOAL")
    black_row = _row("SALTY CREW HOOD BLACK")
    charcoal = _variant(charcoal_row, size="S", color="charcoal", position=0)
    black = _variant(black_row, size="S", color="black", position=1)

    def fake_images(query: str, **k: Any) -> list[str]:
        if "charcoal" in query:
            return ["https://img/charcoal-bad.jpg"]
        return ["https://img/black.jpg"]

    def fake_vision(**kwargs: Any) -> LLMResponse:
        if "charcoal-bad" in kwargs["image_url"]:
            return _verdict(real_photo=False)  # charcoal group fails
        return _verdict()

    monkeypatch.setattr(media.web_search, "search_images", fake_images)
    monkeypatch.setattr(media.llm, "complete_json_vision", fake_vision)

    drafts, _ = media.ground_media(
        _product(), [charcoal, black], [charcoal_row, black_row]
    )
    product_level = [d for d in drafts if d.variant_id is None]
    assert len(product_level) == 1
    assert product_level[0].value == "https://img/black.jpg"


def test_ground_media_no_op_without_candidates(monkeypatch: pytest.MonkeyPatch) -> None:
    """No candidate URLs (web search disabled) → no drafts, no vision calls."""
    row = _row("OBSCURE SKU 12345")
    variants = [_variant(row, size="S", position=0)]
    monkeypatch.setattr(media.web_search, "search_images", lambda *a, **k: [])

    def fail(**kwargs: Any) -> LLMResponse:
        raise AssertionError("vision must not run when there are no candidates")

    monkeypatch.setattr(media.llm, "complete_json_vision", fail)

    drafts, trace = media.ground_media(_product(), variants, [row])
    assert drafts == []
    assert trace["verified_count"] == 0


def test_min_confidence_threshold_rejects_low_confidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A right-but-low-confidence verdict is rejected by the configured threshold."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variants = [_variant(row, size="S", color="charcoal", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images", lambda *a, **k: ["https://img/maybe.jpg"]
    )
    monkeypatch.setattr(
        media.llm, "complete_json_vision", lambda **k: _verdict(confidence=0.5)
    )

    drafts, _ = media.ground_media(
        _product(), variants, [row], config={"media_min_confidence": 0.7}
    )
    assert drafts == []


def test_vision_error_counts_as_rejection(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unreachable/blocked image URL (vision raises) is treated as a reject."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variants = [_variant(row, size="S", color="charcoal", position=0)]
    monkeypatch.setattr(
        media.web_search, "search_images", lambda *a, **k: ["https://img/dead.jpg"]
    )

    def boom(**kwargs: Any) -> LLMResponse:
        raise RuntimeError("404 fetching image")

    monkeypatch.setattr(media.llm, "complete_json_vision", boom)

    drafts, trace = media.ground_media(_product(), variants, [row])
    assert drafts == []
    assert "verification failed" in trace["groups"][0]["candidates"][0]["reason"]


def test_isinstance_uuid_variant_ids() -> None:
    """Per-variant drafts carry the variant UUID (regression on the persist path)."""
    row = _row("SALTY CREW HOOD CHARCOAL")
    variant = _variant(row, size="S", color="charcoal", position=0)
    draft = media.FieldDraft(
        field_name="media", value="u", confidence=0.9, source="web",
        variant_id=variant.id,
    )
    assert isinstance(draft.variant_id, UUID)
