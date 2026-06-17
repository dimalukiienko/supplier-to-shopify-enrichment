"""Thin OpenAI structured-output client — the single LLM seam.

All model calls in the graph go through `complete_json`, so switching providers
later (the stack also permits Anthropic) is a change confined to this module.
The call uses JSON-object response mode and returns the parsed payload together
with token/latency telemetry that `persist` writes to `runs`.
"""

from __future__ import annotations

import json
import time
from functools import lru_cache
from typing import Any

from openai import OpenAI
from pydantic import BaseModel

from worker.config import WorkerConfig


class LLMResponse(BaseModel):
    """Parsed model output plus the telemetry persisted to `runs`."""

    content: dict[str, Any]
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    """Build a cached OpenAI client from the worker config / environment."""
    config = WorkerConfig()
    api_key = config.openai_api_key or None
    return OpenAI(api_key=api_key)


def complete_json(
    *,
    model: str,
    system: str,
    user: str,
    temperature: float = 0.2,
) -> LLMResponse:
    """Call the model in JSON-object mode and return the parsed object.

    `system`/`user` must instruct the model to emit a single JSON object; the
    text is parsed with `json.loads`. Raises if the response is not valid JSON.
    """
    client = get_client()
    started = time.monotonic()
    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    latency_ms = int((time.monotonic() - started) * 1000)

    raw = completion.choices[0].message.content or "{}"
    content = json.loads(raw)
    if not isinstance(content, dict):
        raise ValueError(f"expected a JSON object from the model, got {type(content).__name__}")

    usage = completion.usage
    return LLMResponse(
        content=content,
        model=completion.model,
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        latency_ms=latency_ms,
    )
