"""Enrichment graph nodes. Bodies are stubs at the scaffolding stage.

- parse:    normalize raw fields into a structured draft (structured-output mode).
- research: call the web/search tool for brand, specs, barcode on thin rows.
- draft:    LLM-draft title/description/tags from normalized + researched facts.
- validate: schema validation, anti-hallucination, confidence scoring (guardrails).
- assemble: collect drafts into the final per-field set ready to persist.
"""

from __future__ import annotations

from worker.models.graph_state import GraphState


def parse(state: GraphState) -> GraphState:
    raise NotImplementedError("parse node not yet implemented")


def research(state: GraphState) -> GraphState:
    raise NotImplementedError("research node not yet implemented")


def draft(state: GraphState) -> GraphState:
    raise NotImplementedError("draft node not yet implemented")


def validate(state: GraphState) -> GraphState:
    raise NotImplementedError("validate node not yet implemented")


def assemble(state: GraphState) -> GraphState:
    raise NotImplementedError("assemble node not yet implemented")
