"""Shared text normalization for supplier rows.

Used by both preprocessing (clustering rows into products + size variants) and
the graph's parse node (deriving a clean base name). Apparel sizes drive both
size extraction and variant ordering.
"""

from __future__ import annotations

import re

# Apparel sizes, smallest → largest; the index doubles as the variant position.
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"]
SIZE_SET = set(SIZE_ORDER)

# A size token attached to the end of a product name, e.g. "... TEE BLACK L".
NAME_SIZE_RE = re.compile(r"\b(XS|S|M|L|XL|XXL|[2-5]XL)\s*$", re.IGNORECASE)


def extract_size(sku: str | None, name: str | None) -> str | None:
    """Best-effort apparel size for a row, from the SKU suffix then the name."""
    if sku:
        last = sku.rsplit("-", 1)[-1].upper()
        if last in SIZE_SET:
            return last
    if name:
        match = NAME_SIZE_RE.search(name.strip())
        if match:
            return match.group(1).upper()
    return None


def cluster_key(sku: str | None, name: str | None, size: str | None) -> str:
    """Grouping key for a row: the size-stripped SKU when a size was found,
    otherwise the SKU, otherwise the size-stripped normalized name."""
    if sku and size and sku.rsplit("-", 1)[-1].upper() == size:
        return sku.rsplit("-", 1)[0].upper()
    if sku:
        return sku.upper()
    normalized = NAME_SIZE_RE.sub("", (name or "").strip()).strip().lower()
    return normalized or "unknown"


def clean_name(name: str | None) -> str:
    """Strip a trailing size token and tidy punctuation from a raw product name."""
    if not name:
        return ""
    stripped = NAME_SIZE_RE.sub("", name.strip()).strip()
    return stripped.strip(' -",').title()
