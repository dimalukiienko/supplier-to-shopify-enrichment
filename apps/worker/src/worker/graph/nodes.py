"""Enrichment graph nodes (docs/ARCHITECTURE.md §5.2).

Each node takes and returns the shared `GraphState`, mutating it in place and
recording a per-node entry in `state.node_traces` for `runs` observability:

- parse:    normalize raw rows into base name / brand hint / size list.
- research: pull grounded web facts (deferred in Stage 1 → usually none).
- draft:    LLM structured output for vendor, type, description, tags, SEO, name.
- validate: guardrails — clamp confidence, anti-hallucination, low-confidence flags.
- assemble: rule-compose the title from `settings.title_template`, dedupe drafts.

The "Built" Stage 1 fields are title, description, vendor, product_type, tags
(SEO meta is drafted but lightly validated); see the build-vs-defer table in
docs/ARCHITECTURE.md.
"""

from __future__ import annotations

import json
from typing import Any

from worker import llm
from worker import research as research_tool
from worker.models.fields import FieldDraft, FieldSource
from worker.models.graph_state import GraphState
from worker.normalize import clean_name

# LLM-drafted component fields (title is rule-composed in `assemble`).
DRAFT_FIELDS = ["vendor", "product_type", "description", "tags", "seo_title", "seo_description"]
_DEFAULT_TEMPLATE = [{"token": "Brand"}, {"token": "Name"}]


def parse(state: GraphState) -> GraphState:
    names = [r.product_name for r in state.supplier_rows if r.product_name]
    base_name = clean_name(names[0]) if names else ""
    brand_guess = base_name.split(" ")[0] if base_name else ""
    sizes = [v.size for v in state.variants if v.size]
    state.node_traces["parse"] = {
        "base_name": base_name,
        "brand_guess": brand_guess,
        "sizes": sizes,
        "row_count": len(state.supplier_rows),
    }
    return state


def research(state: GraphState) -> GraphState:
    facts = research_tool.research_facts(state.product, state.supplier_rows)
    state.research_facts = facts
    state.node_traces["research"] = {"fact_count": len(facts)}
    return state


def _build_prompt(state: GraphState) -> tuple[str, str]:
    parse_trace = state.node_traces.get("parse", {})
    instruction = ""
    prompt = state.prompt_versions.get("enrich_product")
    if prompt:
        instruction = prompt.content

    rows = [
        {
            "product_name": r.product_name,
            "supplier_sku": r.supplier_sku,
            "barcode": r.barcode,
            "supplier_notes": r.supplier_notes,
            "unit_price": r.unit_price,
        }
        for r in state.supplier_rows
    ]
    # Note: brand_guess (parse's first-word heuristic) is deliberately NOT sent to
    # the model — it would anchor `vendor` to a truncated brand (e.g. "Salty" for
    # "Salty Crew"). The model infers the full vendor from names/SKUs instead.
    context = {
        "base_name": parse_trace.get("base_name"),
        "sizes": parse_trace.get("sizes"),
        "supplier_rows": rows,
        "research_facts": state.research_facts,
    }

    system = (
        "You are a product data enrichment assistant for a Shopify catalogue. "
        f"{instruction} "
        "Return a single JSON object. Each of these keys maps to an object with a "
        '"value" (string) and a "confidence" (number 0-1): '
        "vendor, product_type, name, description, tags, seo_title, seo_description. "
        '"name" is a clean product name WITHOUT the brand/vendor and WITHOUT size; '
        '"tags" is a comma-separated list. '
        "Base every field only on the supplied data; do not invent barcodes or specs."
    )
    user = json.dumps(context, default=str)
    return system, user


def _component(content: dict[str, Any], key: str) -> tuple[str | None, float]:
    raw = content.get(key)
    if isinstance(raw, dict):
        value = raw.get("value")
        confidence = raw.get("confidence", 0.5)
    else:
        value = raw
        confidence = 0.5 if raw else 0.0
    value_str = str(value).strip() if value not in (None, "") else None
    try:
        conf = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        conf = 0.5
    return value_str, conf


def draft(state: GraphState) -> GraphState:
    model = state.settings.default_model if state.settings else "gpt-4o-mini"
    system, user = _build_prompt(state)
    response = llm.complete_json(model=model, system=system, user=user)
    content = response.content

    grounded = {f["field_name"]: f for f in state.research_facts if "field_name" in f}

    drafts: list[FieldDraft] = []
    for key in DRAFT_FIELDS:
        value, confidence = _component(content, key)
        source: FieldSource = "llm"
        if key in grounded:
            value = str(grounded[key].get("value", value))
            source = "web"
            confidence = max(confidence, 0.9)
        if value is None:
            continue
        drafts.append(
            FieldDraft(field_name=key, value=value, confidence=confidence, source=source)
        )
    state.drafts = drafts

    name_value, name_conf = _component(content, "name")
    state.node_traces["draft"] = {
        "model": response.model,
        "input_tokens": response.input_tokens,
        "output_tokens": response.output_tokens,
        "latency_ms": response.latency_ms,
        "name": {"value": name_value, "confidence": name_conf},
        "field_count": len(drafts),
    }
    return state


def validate(state: GraphState) -> GraphState:
    guardrails = state.settings.guardrail_config if state.settings else {}
    min_confidence = float(guardrails.get("min_confidence", 0.0))
    require_grounded_barcode = bool(guardrails.get("require_grounded_barcode", False))

    kept: list[FieldDraft] = []
    dropped: list[str] = []
    low_confidence: list[str] = []
    for d in state.drafts:
        if require_grounded_barcode and d.field_name == "barcode" and d.source != "web":
            dropped.append(d.field_name)
            continue
        if d.confidence < min_confidence:
            low_confidence.append(d.field_name)
        kept.append(d)

    state.drafts = kept
    state.node_traces["validate"] = {
        "checked": len(state.drafts) + len(dropped),
        "dropped": dropped,
        "low_confidence": low_confidence,
    }
    return state


def _compose_title(state: GraphState) -> FieldDraft | None:
    template = state.settings.title_template if state.settings else _DEFAULT_TEMPLATE
    if not template:
        template = _DEFAULT_TEMPLATE

    by_field = {d.field_name: d for d in state.drafts}
    name_scratch = state.node_traces.get("draft", {}).get("name", {})
    parse_trace = state.node_traces.get("parse", {})
    vendor = by_field.get("vendor")
    vendor_value = vendor.value if vendor else None

    name_value = name_scratch.get("value") or parse_trace.get("base_name")
    # The model often repeats the brand inside `name`; drop it so a
    # Brand + Name template doesn't read "Salty Crew Salty Crew Tailed Tank".
    if name_value and vendor_value and name_value.lower().startswith(vendor_value.lower()):
        name_value = name_value[len(vendor_value):].strip(" -")

    values: dict[str, tuple[str | None, float]] = {
        "brand": (vendor_value, vendor.confidence if vendor else 0.0),
        "vendor": (vendor_value, vendor.confidence if vendor else 0.0),
        "name": (name_value, float(name_scratch.get("confidence", 0.5))),
    }

    parts: list[str] = []
    confidences: list[float] = []
    for token in template:
        key = str(token.get("token", "")).lower()
        if key not in values:  # e.g. Size — variant-level, skipped for product title
            continue
        value, conf = values[key]
        # Skip empties and any part already covered by the title so far.
        if value and value.lower() not in " ".join(parts).lower():
            parts.append(value)
            confidences.append(conf)
    if not parts:
        return None
    title = " ".join(parts)
    return FieldDraft(
        field_name="title",
        value=title,
        confidence=min(confidences) if confidences else 0.5,
        source="llm",
    )


def assemble(state: GraphState) -> GraphState:
    title = _compose_title(state)
    drafts = list(state.drafts)
    if title is not None:
        drafts.append(title)

    # Dedupe by field_name, keeping the highest-confidence draft.
    best: dict[str, FieldDraft] = {}
    for d in drafts:
        if d.field_name not in best or d.confidence > best[d.field_name].confidence:
            best[d.field_name] = d
    state.drafts = list(best.values())

    state.node_traces["assemble"] = {
        "field_count": len(state.drafts),
        "title": title.value if title else None,
    }
    return state
