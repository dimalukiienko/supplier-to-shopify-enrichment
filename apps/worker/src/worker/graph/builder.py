"""Assembles the LangGraph graph from the discrete enrichment nodes.

A single staged graph (not a free-form multi-agent system) so every step is
deterministic, traceable, and individually evaluable (docs/ARCHITECTURE.md §5.3).
Node bodies are stubs at this scaffolding stage.
"""

from __future__ import annotations

from collections.abc import Callable

from worker.graph import nodes
from worker.models.graph_state import GraphState

GRAPH_VERSION = "0.0.0"

GraphNode = Callable[[GraphState], GraphState]

# Ordered pipeline. Wiring is expressed as a list here; swap for a
# langgraph.StateGraph once node bodies are implemented.
NODE_SEQUENCE: list[GraphNode] = [
    nodes.parse,
    nodes.research,
    nodes.draft,
    nodes.validate,
    nodes.assemble,
]


def build_graph() -> list[GraphNode]:
    """Return the ordered node pipeline.

    Placeholder for the compiled `StateGraph`; kept importable so the worker
    and tests can reference the graph shape before nodes are implemented.
    """
    return NODE_SEQUENCE


def run_graph(state: GraphState) -> GraphState:
    """Run the staged pipeline in order (synchronous stub)."""
    for node in NODE_SEQUENCE:
        state = node(state)
    return state
