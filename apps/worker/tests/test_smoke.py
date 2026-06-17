"""Import smoke tests — confirm the package and graph shape load."""

import worker
from worker.graph import build_graph
from worker.graph.builder import NODE_SEQUENCE
from worker.models import FieldDraft


def test_package_imports() -> None:
    assert worker.__version__ == "0.0.0"


def test_graph_has_five_nodes() -> None:
    names = [name for name, _ in NODE_SEQUENCE]
    assert names == ["parse", "research", "draft", "validate", "assemble"]
    # The compiled graph wires the same nodes (plus langgraph's start/end).
    compiled_nodes = set(build_graph().get_graph().nodes)
    assert set(names) <= compiled_nodes


def test_field_draft_confidence_is_bounded() -> None:
    draft = FieldDraft(field_name="title", value="Acme Shirt", confidence=0.9)
    assert draft.source == "llm"
    assert 0.0 <= draft.confidence <= 1.0
