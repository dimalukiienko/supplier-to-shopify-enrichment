"""Preprocessing: normalize fields, strip size tokens, cluster supplier rows
into products + variants (docs/ARCHITECTURE.md §5.2 step 1). Stub."""

from __future__ import annotations

from uuid import UUID


def preprocess_batch(batch_id: UUID) -> None:
    raise NotImplementedError("batch preprocessing not yet implemented")
