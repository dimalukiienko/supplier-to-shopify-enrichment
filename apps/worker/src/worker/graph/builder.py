"""Compiles the enrichment nodes into a single LangGraph `StateGraph`.

A linear, staged graph (parse → research → draft → validate → assemble) rather
than a free-form multi-agent system, so every step is deterministic, traceable,
and individually evaluable (docs/ARCHITECTURE.md §5.3). Each node mutates and
returns the shared `GraphState`; LangGraph threads it through in order.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from worker.graph import nodes
from worker.models.graph_state import GraphState

EnrichmentGraph = CompiledStateGraph[GraphState, Any, Any, Any]

GRAPH_VERSION = "1.0.0"

# Ordered (name, node) pairs wired as a linear pipeline.
NODE_SEQUENCE = [
    ("parse", nodes.parse),
    ("research", nodes.research),
    ("draft", nodes.draft),
    ("validate", nodes.validate),
    ("assemble", nodes.assemble),
]


@lru_cache(maxsize=1)
def build_graph() -> EnrichmentGraph:
    """Build and compile the enrichment StateGraph (cached)."""
    builder = StateGraph(GraphState)
    for name, fn in NODE_SEQUENCE:
        builder.add_node(name, fn)

    builder.add_edge(START, NODE_SEQUENCE[0][0])
    for (src, _), (dst, _) in zip(NODE_SEQUENCE, NODE_SEQUENCE[1:], strict=False):
        builder.add_edge(src, dst)
    builder.add_edge(NODE_SEQUENCE[-1][0], END)

    return builder.compile()


def run_graph(state: GraphState) -> GraphState:
    """Run the compiled enrichment graph over an input state."""
    result = build_graph().invoke(state)
    return GraphState.model_validate(result)
