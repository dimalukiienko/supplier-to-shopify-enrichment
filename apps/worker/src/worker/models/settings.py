"""Configuration models — `settings` and `prompt_versions` (docs/DATABASE.md §3.8–3.9)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class Settings(BaseModel):
    id: UUID
    title_template: list[dict[str, Any]]
    default_model: str
    guardrail_config: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class PromptVersion(BaseModel):
    id: UUID
    name: str
    version: int
    content: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
