"""Import smoke tests — confirm the package and graph shape load."""

import worker
from worker.graph import build_graph
from worker.models import FieldDraft


def test_package_imports() -> None:
    assert worker.__version__ == "0.0.0"


def test_graph_has_five_nodes() -> None:
    # parse → research → draft → validate → assemble
    assert len(build_graph()) == 5


def test_field_draft_confidence_is_bounded() -> None:
    draft = FieldDraft(field_name="title", value="Acme Shirt", confidence=0.9)
    assert draft.source == "llm"
    assert 0.0 <= draft.confidence <= 1.0
