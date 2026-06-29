"""Thin OpenAI structured-output client — the single LLM seam.

All model calls in the graph go through `complete_json` (text) or
`complete_json_vision` (text + one image), so switching providers later (the
stack also permits Anthropic) is a change confined to this module. Both use
JSON-object response mode and return the parsed payload together with
token/latency telemetry that `persist` writes to `runs`.
"""

from __future__ import annotations

import json
import time
from functools import lru_cache
from typing import Any

import openai
from openai import OpenAI
from pydantic import BaseModel

from worker.config import WorkerConfig
from worker.observability import tracing_enabled

# Transient OpenAI failures worth retrying the *job* over rather than failing it
# outright: a saturated rate limit, or a brief upstream/network blip. The client
# already retries each individual call (see `config.openai_max_retries`); these
# are the errors that survive that and should re-queue the job (see the poller).
RETRYABLE_ERRORS: tuple[type[Exception], ...] = (
    openai.RateLimitError,
    openai.APITimeoutError,
    openai.APIConnectionError,
    openai.InternalServerError,
)


class LLMResponse(BaseModel):
    """Parsed model output plus the telemetry persisted to `runs`."""

    content: dict[str, Any]
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    """Build a cached OpenAI client from the worker config / environment.

    When LangSmith tracing is enabled (see `worker.observability`) the client is
    wrapped so each completion is traced with its prompt, response, and token
    usage; the wrapper is transparent, so callers use `.chat.completions.create`
    unchanged.
    """
    config = WorkerConfig()
    api_key = config.openai_api_key or None
    client = OpenAI(api_key=api_key, max_retries=config.openai_max_retries)
    if tracing_enabled():
        from langsmith.wrappers import wrap_openai

        return wrap_openai(client)
    return client


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

    return _to_response(completion, latency_ms)


def complete_json_vision(
    *,
    model: str,
    system: str,
    user: str,
    image_url: str,
    temperature: float = 0.0,
) -> LLMResponse:
    """Call a vision model in JSON-object mode with `user` text + one image.

    Used to verify that a candidate product image actually depicts the right
    item/colour (and is a real photo). `system`/`user` must instruct the model to
    emit a single JSON object. The default model `gpt-4o-mini` is vision-capable.
    """
    client = get_client()
    started = time.monotonic()
    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
    )
    latency_ms = int((time.monotonic() - started) * 1000)
    return _to_response(completion, latency_ms)


def _to_response(completion: Any, latency_ms: int) -> LLMResponse:
    """Parse a chat completion into an `LLMResponse`, asserting a JSON object."""
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
