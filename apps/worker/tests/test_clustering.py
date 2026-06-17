"""Unit tests for supplier-row clustering (no DB)."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from worker.models.domain import SupplierRow
from worker.normalize import cluster_key, extract_size
from worker.pipeline.preprocess import build_clusters

_BATCH = uuid4()


def _row(name: str, sku: str) -> SupplierRow:
    now = datetime.now(UTC)
    return SupplierRow(
        id=uuid4(),
        batch_id=_BATCH,
        product_name=name,
        supplier_sku=sku,
        created_at=now,
        updated_at=now,
    )


def test_extract_size_from_sku_suffix() -> None:
    assert extract_size("SC-20135643-CH-S", "x") == "S"
    assert extract_size("SC-20635013-BK-2XL", "x") == "2XL"
    assert extract_size("GAM-225911-25", "Big River Bait") is None


def test_extract_size_falls_back_to_name() -> None:
    assert extract_size("NO-SIZE", "Archway Classic Tee Black L") == "L"


def test_cluster_key_strips_size_suffix() -> None:
    assert cluster_key("SC-20135643-CH-S", "x", "S") == "SC-20135643-CH"
    assert cluster_key("SC-20135643-CH-2XL", "x", "2XL") == "SC-20135643-CH"
    # No size → keyed by full SKU (its own product).
    assert cluster_key("GAM-225911-25", "Big River Bait", None) == "GAM-225911-25"


def test_build_clusters_groups_apparel_sizes() -> None:
    rows = [
        _row("SALTY CREW SURFACE HOOD SUNSHIRT CHARCOAL S", "SC-20135643-CH-S"),
        _row("SALTY CREW SURFACE HOOD SUNSHIRT CHARCOAL M", "SC-20135643-CH-M"),
        _row("SALTY CREW SURFACE HOOD SUNSHIRT CHARCOAL L", "SC-20135643-CH-L"),
        _row("GAMAKATSU BIG RIVER BAIT", "GAM-225911-25"),
    ]
    clusters = {c.key: c for c in build_clusters(rows)}

    assert set(clusters) == {"SC-20135643-CH", "GAM-225911-25"}
    apparel = clusters["SC-20135643-CH"]
    assert {v.size for v in apparel.variants} == {"S", "M", "L"}
    assert len(clusters["GAM-225911-25"].variants) == 1
