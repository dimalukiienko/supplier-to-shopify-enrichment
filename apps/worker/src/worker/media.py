"""Verified product/variant image grounding (the media half of the research node).

Where the rest of `research` grounds text facts, this module sources a **real,
correct** image for the product and each colour variant. It is deliberately
high-precision: a candidate is only kept after a vision model confirms it depicts
the right item, the right colourway, and is a genuine product photograph (not an
AI-generated image, render, illustration, or unrelated picture). When nothing
verifies for a group, the field is left **empty** rather than risk a wrong image —
the reviewer fills the gap (docs/ARCHITECTURE.md §6).

Granularity is **colour-aware**: variants are grouped by colourway, so size-only
variants share one verified image while distinct colours each get their own.

Detecting AI-generated images via a vision model is a strong heuristic, not a
guarantee; we bias conservatively (drop on doubt) and the human review gate is the
final backstop. No-op (returns no drafts) when web search or the LLM is disabled.
"""

from __future__ import annotations

import json
import re
from collections import OrderedDict
from typing import Any
from uuid import UUID

from worker import llm, web_search
from worker.models.domain import Product, SupplierRow, Variant
from worker.models.fields import FieldDraft
from worker.normalize import COLOR_WORDS, clean_name, extract_color

# How many candidate images to verify per colour group before giving up, and the
# minimum vision-verification confidence to accept one. Overridable via
# settings.guardrail_config (media_max_candidates / media_min_confidence).
DEFAULT_MAX_CANDIDATES = 6
DEFAULT_MIN_CONFIDENCE = 0.7

_VERIFY_SYSTEM = (
    "You verify whether a product photo correctly represents a specific catalogue "
    "product. You are given the expected product (brand/name and colour) and ONE "
    "image. Return a single JSON object with keys: "
    '"right_item" (bool: the image shows THIS product/type — not a different item, '
    "a logo, a size chart, packaging only, or an unrelated photo), "
    '"right_colour" (bool: true ONLY if the product\'s main colour clearly matches '
    "the expected colour; false if it is a noticeably different colour or you "
    "cannot tell; use null ONLY when no colour was expected), "
    '"real_photo" (bool: true ONLY for a genuine product photograph; false for an '
    "AI-generated image, 3D render, illustration, collage, diagram, or watermarked "
    'stock placeholder), '
    '"good_quality" (bool: true for a clear, in-focus, reasonably high-resolution '
    "photo of the product; false for blurry, tiny, pixelated, watermarked, or "
    "visually cluttered images), "
    '"packshot" (bool: true for a clean studio/catalogue shot of the product on a '
    "plain background, false for an on-model or lifestyle scene), "
    '"confidence" (number 0-1: how sure you are this is the right, real product), '
    'and "reason" (short string). '
    "If expected.colour is present, it is the ONLY expected colour. Ignore any "
    "colour words that appear in expected.brand_or_name when judging right_colour. "
    "Judge only what is visible; when in doubt, set the flag to false."
)


def _name_without_colour_terms(name: str, color: str | None) -> str:
    """Remove colour tokens from an item name when colour is tracked separately."""
    if color is None:
        return name

    cleaned = name
    for colour_word in COLOR_WORDS:
        cleaned = re.sub(
            rf"\b{re.escape(colour_word)}\b",
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )
    return re.sub(r"\s+", " ", cleaned).strip(' -",') or name


def _group_variants(
    variants: list[Variant], rows_by_id: dict[UUID, SupplierRow], base_name: str
) -> OrderedDict[str | None, list[Variant]]:
    """Group variants by colourway, preserving first-seen (position) order.

    Colour is taken from `variant.color`, falling back to the colour parsed from
    the variant's supplier-row name, then the product base name.
    """
    fallback_color = extract_color(base_name)
    groups: OrderedDict[str | None, list[Variant]] = OrderedDict()
    for variant in sorted(variants, key=lambda v: v.position):
        row = rows_by_id.get(variant.supplier_row_id) if variant.supplier_row_id else None
        color = variant.color or extract_color(row.product_name if row else None) or fallback_color
        groups.setdefault(color, []).append(variant)
    return groups


def _group_query(variants: list[Variant], rows_by_id: dict[UUID, SupplierRow], base_name: str,
                 color: str | None) -> str:
    """Build an image search query from the most descriptive name in the group."""
    name = base_name
    for variant in variants:
        row = rows_by_id.get(variant.supplier_row_id) if variant.supplier_row_id else None
        candidate = clean_name(row.product_name if row else None)
        if len(candidate) > len(name):
            name = candidate
    name = _name_without_colour_terms(name, color)
    terms = " ".join(t for t in (name, color or "") if t).strip()
    # "white background" biases the image search toward clean catalogue packshots
    # over lifestyle/on-model shots, for a consistent gallery across variants.
    return f"{terms} product photo white background".strip()


def _verify(url: str, *, base_name: str, color: str | None, model: str) -> dict[str, Any]:
    """Ask the vision model whether `url` is the right, real product image.

    Returns a record with the verdict and an `accepted` flag. Any error (e.g. an
    unreachable or blocked URL) counts as a rejection so a bad URL never wins.
    """
    expected = {"brand_or_name": _name_without_colour_terms(base_name, color), "colour": color}
    try:
        response = llm.complete_json_vision(
            model=model,
            system=_VERIFY_SYSTEM,
            user=json.dumps({"expected": expected}),
            image_url=url,
        )
        content = response.content
        try:
            confidence = max(0.0, min(1.0, float(content.get("confidence", 0.0))))
        except (TypeError, ValueError):
            confidence = 0.0
        return {
            "url": url,
            "right_item": bool(content.get("right_item")),
            "right_colour": content.get("right_colour"),  # bool | None
            "real_photo": bool(content.get("real_photo")),
            "good_quality": bool(content.get("good_quality")),
            "packshot": bool(content.get("packshot")),
            "confidence": confidence,
            "reason": str(content.get("reason", "")),
        }
    except Exception as exc:  # noqa: BLE001 — a failed check must reject, not crash.
        return {
            "url": url,
            "right_item": False,
            "right_colour": None,
            "real_photo": False,
            "good_quality": False,
            "packshot": False,
            "confidence": 0.0,
            "reason": f"verification failed: {exc}",
        }


def _accepted(record: dict[str, Any], min_confidence: float, *, color_known: bool) -> bool:
    """A candidate passes only if it is the right item, a real, good-quality photo,
    the right colour, and confidently verified.

    Colour is strict: when a colour is expected, the verdict must be an explicit
    `right_colour == True` (a `null`/"can't tell" is rejected, so a generic image
    can't bleed across colourways). When no colour is expected, `null` is allowed.
    """
    if not (record["right_item"] and record["real_photo"] and record["good_quality"]):
        return False
    if record["confidence"] < min_confidence:
        return False
    if color_known:
        return record["right_colour"] is True
    return record["right_colour"] is not False


def _score(record: dict[str, Any]) -> tuple[float, float]:
    """Rank passing candidates: a clean packshot wins over an on-model/lifestyle
    shot, then higher verification confidence — for consistent, catalogue-style
    images across variants."""
    return (1.0 if record["packshot"] else 0.0, record["confidence"])


def ground_media(
    product: Product,
    variants: list[Variant],
    supplier_rows: list[SupplierRow],
    *,
    model: str = "gpt-4o-mini",
    config: dict[str, Any] | None = None,
) -> tuple[list[FieldDraft], dict[str, Any]]:
    """Source a verified image per colour group; return media drafts + a trace.

    Emits one product-level `media` draft (the first colour group that verifies)
    plus a per-variant `media` draft for every variant whose colour group verified.
    Each group keeps the **best** verified candidate (clean packshot, then highest
    confidence) rather than the first to pass. Groups with no verified candidate
    emit nothing. Returns ``([], trace)`` when web search yields no candidates.
    """
    config = config or {}
    try:
        max_candidates = int(config.get("media_max_candidates", DEFAULT_MAX_CANDIDATES))
    except (TypeError, ValueError):
        max_candidates = DEFAULT_MAX_CANDIDATES
    try:
        min_confidence = float(config.get("media_min_confidence", DEFAULT_MIN_CONFIDENCE))
    except (TypeError, ValueError):
        min_confidence = DEFAULT_MIN_CONFIDENCE
    # Vision benefits from a stronger model than the text default; allow an override.
    vision_model = str(config.get("media_vision_model") or model)

    names = [r.product_name for r in supplier_rows if r.product_name]
    base_name = clean_name(names[0]) if names else ""
    rows_by_id = {r.id: r for r in supplier_rows}
    groups = _group_variants(variants, rows_by_id, base_name)

    drafts: list[FieldDraft] = []
    group_traces: list[dict[str, Any]] = []
    product_image: dict[str, Any] | None = None  # first verified group → product media

    for color, group_variants in groups.items():
        query = _group_query(group_variants, rows_by_id, base_name, color)
        candidates = web_search.search_images(query, max_results=max_candidates)

        considered: list[dict[str, Any]] = []
        chosen: dict[str, Any] | None = None
        # Verify every candidate and keep the best passer (packshot, then confidence)
        # so shot type/quality stay consistent across variants.
        for url in candidates:
            record = _verify(url, base_name=base_name, color=color, model=vision_model)
            accepted = _accepted(record, min_confidence, color_known=color is not None)
            considered.append({**record, "accepted": accepted})
            if accepted and (chosen is None or _score(record) > _score(chosen)):
                chosen = record

        if chosen is not None:
            for variant in group_variants:
                drafts.append(
                    FieldDraft(
                        field_name="media",
                        value=chosen["url"],
                        confidence=chosen["confidence"],
                        source="web",
                        variant_id=variant.id,
                    )
                )
            if product_image is None:
                product_image = chosen

        group_traces.append(
            {
                "color": color,
                "query": query,
                "candidates": considered,
                "chosen": chosen["url"] if chosen else None,
                "variant_ids": [str(v.id) for v in group_variants],
            }
        )

    if product_image is not None:
        drafts.append(
            FieldDraft(
                field_name="media",
                value=product_image["url"],
                confidence=product_image["confidence"],
                source="web",
            )
        )

    trace = {
        "group_count": len(group_traces),
        "verified_count": sum(1 for g in group_traces if g["chosen"]),
        "groups": group_traces,
    }
    return drafts, trace
