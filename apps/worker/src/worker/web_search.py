"""Thin web-search client — the single research seam.

The `research` node grounds thin supplier rows against the web through this
module, so swapping providers later is a change confined here (mirrors the LLM
seam in `llm.py`). Stage 1 uses **Tavily** (purpose-built for LLM grounding:
ranked snippets + source URLs as JSON).

When no `WEB_SEARCH_API_KEY` is configured, `search` returns no results — keeping
the Stage-1 deferral default and CI/tests fully offline.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import BaseModel

from worker.config import WorkerConfig


class WebResult(BaseModel):
    """A single web search hit used to ground enrichment facts."""

    title: str = ""
    url: str = ""
    content: str = ""


@lru_cache(maxsize=1)
def _get_client() -> Any | None:
    """Build a cached Tavily client, or None when no API key is configured."""
    config = WorkerConfig()
    if not config.web_search_api_key:
        return None
    # Imported lazily so the worker (and offline tests) need not install or load
    # the SDK unless web research is actually enabled.
    from tavily import TavilyClient

    return TavilyClient(api_key=config.web_search_api_key)


def search(query: str, *, max_results: int = 5) -> list[WebResult]:
    """Return web results for `query`; empty list when search is disabled."""
    client = _get_client()
    if client is None or not query.strip():
        return []

    response = client.search(query=query, max_results=max_results)
    results = response.get("results", []) if isinstance(response, dict) else []
    return [
        WebResult(
            title=str(r.get("title", "")),
            url=str(r.get("url", "")),
            content=str(r.get("content", "")),
        )
        for r in results
    ]


def search_images(query: str, *, max_results: int = 3) -> list[str]:
    """Return candidate product image URLs for `query`; empty when disabled.

    Uses Tavily's `include_images` so the same search seam grounds product-level
    media (top-N candidates the reviewer confirms — not exact-variant matching).
    """
    client = _get_client()
    if client is None or not query.strip():
        return []

    response = client.search(query=query, include_images=True)
    images = response.get("images", []) if isinstance(response, dict) else []
    urls: list[str] = []
    for image in images:
        # Tavily returns plain URL strings, or dicts when image descriptions are
        # requested; tolerate both so a provider tweak doesn't break grounding.
        url = image.get("url") if isinstance(image, dict) else image
        if url:
            urls.append(str(url))
        if len(urls) >= max_results:
            break
    return urls
