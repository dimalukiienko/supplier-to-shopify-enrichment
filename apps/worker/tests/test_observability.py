"""LangSmith tracing setup — opt-in, off by default."""

import os
from collections.abc import Iterator

import pytest

from worker.config import WorkerConfig
from worker.observability import configure_tracing, tracing_enabled

_LANGSMITH_VARS = [
    "LANGSMITH_TRACING",
    "LANGSMITH_API_KEY",
    "LANGSMITH_PROJECT",
    "LANGSMITH_ENDPOINT",
]


@pytest.fixture(autouse=True)
def _isolate_langsmith_env() -> Iterator[None]:
    """Isolate each test from ambient LangSmith env and restore it afterwards.

    `configure_tracing` writes to `os.environ` directly, so snapshot/restore the
    vars to keep tracing state from leaking into other test modules.
    """
    saved = {var: os.environ.pop(var, None) for var in _LANGSMITH_VARS}
    try:
        yield
    finally:
        for var, value in saved.items():
            if value is None:
                os.environ.pop(var, None)
            else:
                os.environ[var] = value


# `_env_file=None` isolates these from the developer's repo `.env`, so the test
# reflects only the values we pass (e.g. an unset endpoint stays unset).
def test_tracing_off_by_default() -> None:
    config = WorkerConfig(_env_file=None, langsmith_tracing=False, langsmith_api_key="ls-key")
    assert configure_tracing(config) is False
    assert tracing_enabled() is False
    assert "LANGSMITH_TRACING" not in os.environ


def test_tracing_requires_api_key() -> None:
    # Flag on but no key → stays off (no data could leave the system anyway).
    config = WorkerConfig(_env_file=None, langsmith_tracing=True, langsmith_api_key="")
    assert configure_tracing(config) is False
    assert tracing_enabled() is False


def test_tracing_enabled_exports_env() -> None:
    config = WorkerConfig(
        _env_file=None,
        langsmith_tracing=True,
        langsmith_api_key="ls-key",
        langsmith_project="my-project",
    )
    assert configure_tracing(config) is True
    assert tracing_enabled() is True
    assert os.environ["LANGSMITH_TRACING"] == "true"
    assert os.environ["LANGSMITH_API_KEY"] == "ls-key"
    assert os.environ["LANGSMITH_PROJECT"] == "my-project"
    # Endpoint is only exported when explicitly configured.
    assert "LANGSMITH_ENDPOINT" not in os.environ
