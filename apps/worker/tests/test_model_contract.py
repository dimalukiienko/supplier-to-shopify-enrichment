"""Contract test: hand-written Pydantic models must match the SQL schema.

Parses `CREATE TABLE` column names out of the Supabase migrations and asserts
the corresponding Pydantic model declares exactly the same fields. This is the
drift guard that lets the worker keep hand-written models instead of generated
ones (see plan: Task 3, "Drift guard").
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from pydantic import BaseModel

from worker.models import (
    Batch,
    EnrichedField,
    Job,
    Product,
    PromptVersion,
    Run,
    Settings,
    SupplierRow,
    Variant,
)

MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"

# Pydantic model ↔ SQL table name
MODEL_TABLE = {
    Batch: "batches",
    SupplierRow: "supplier_rows",
    Product: "products",
    Variant: "variants",
    EnrichedField: "enriched_fields",
    Job: "jobs",
    Run: "runs",
    Settings: "settings",
    PromptVersion: "prompt_versions",
}

_CREATE_RE = re.compile(
    r"create\s+table\s+(?:if\s+not\s+exists\s+)?"
    r"(?:public\.)?(?P<name>\w+)\s*\((?P<body>.*?)\)\s*;",
    re.IGNORECASE | re.DOTALL,
)

# Column lines we should ignore as not being column definitions.
_NON_COLUMN = re.compile(
    r"^\s*(primary\s+key|foreign\s+key|constraint|unique|check)\b",
    re.IGNORECASE,
)


def _parse_table_columns() -> dict[str, set[str]]:
    if not MIGRATIONS_DIR.exists():
        pytest.skip(f"migrations dir not found: {MIGRATIONS_DIR}")
    tables: dict[str, set[str]] = {}
    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        text = sql_file.read_text()
        for match in _CREATE_RE.finditer(text):
            name = match.group("name")
            cols: set[str] = set()
            for raw_line in match.group("body").split("\n"):
                line = raw_line.strip().rstrip(",")
                if not line or _NON_COLUMN.match(line):
                    continue
                token = line.split()[0].strip('"')
                cols.add(token)
            if cols:
                tables[name] = cols
    return tables


@pytest.mark.parametrize(
    "model, table",
    list(MODEL_TABLE.items()),
    ids=[m.__name__ for m in MODEL_TABLE],
)
def test_model_matches_table(model: type[BaseModel], table: str) -> None:
    tables = _parse_table_columns()
    assert table in tables, f"no CREATE TABLE found for {table}"
    sql_cols = tables[table]
    model_fields = set(model.model_fields)
    missing_in_model = sql_cols - model_fields
    extra_in_model = model_fields - sql_cols
    name = model.__name__
    assert not missing_in_model, f"{table}: columns missing from {name}: {missing_in_model}"
    assert not extra_in_model, f"{table}: {name} has fields not in SQL: {extra_in_model}"
