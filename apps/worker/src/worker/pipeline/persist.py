"""Persist: write the graph output back to enriched_fields, runs, and products
(docs/ARCHITECTURE.md §5.2 step 5). Runs inside the caller's transaction.

Re-enrichment is idempotent: existing AI-status fields for the product are
replaced, but reviewer-touched rows (`accepted`/`overridden`) are preserved.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.types.json import Json

from worker.db import DictConnection
from worker.graph.builder import GRAPH_VERSION
from worker.models.graph_state import GraphState


def _run_metrics(state: GraphState) -> dict[str, Any]:
    """Pull model/token/latency telemetry out of the per-node traces."""
    draft_trace = state.node_traces.get("draft", {})
    default_model = state.settings.default_model if state.settings else None
    prompt = state.prompt_versions.get("enrich_product")
    latency = sum(
        int(trace.get("latency_ms", 0))
        for trace in state.node_traces.values()
        if isinstance(trace, dict)
    )
    return {
        "model": draft_trace.get("model") or default_model,
        "prompt_version": str(prompt.version) if prompt else None,
        "input_tokens": draft_trace.get("input_tokens"),
        "output_tokens": draft_trace.get("output_tokens"),
        "latency_ms": latency or None,
    }


def persist_results(conn: DictConnection, state: GraphState, job_id: UUID) -> None:
    """Write enriched fields + a run record and mark the product enriched."""
    product_id = state.product.id
    metrics = _run_metrics(state)

    with conn.cursor() as cur:
        # Replace prior AI output; keep reviewer-accepted/overridden rows.
        cur.execute(
            "DELETE FROM enriched_fields WHERE product_id = %s AND status = 'ai'",
            (product_id,),
        )
        for draft in state.drafts:
            cur.execute(
                "INSERT INTO enriched_fields "
                "(product_id, field_name, value, confidence, source, status) "
                "VALUES (%s, %s, %s, %s, %s, 'ai')",
                (product_id, draft.field_name, draft.value, draft.confidence, draft.source),
            )

        cur.execute(
            "INSERT INTO runs "
            "(product_id, job_id, graph_version, status, node_traces, model, "
            " prompt_version, input_tokens, output_tokens, latency_ms) "
            "VALUES (%s, %s, %s, 'success', %s, %s, %s, %s, %s, %s)",
            (
                product_id,
                job_id,
                GRAPH_VERSION,
                Json(state.node_traces),
                metrics["model"],
                metrics["prompt_version"],
                metrics["input_tokens"],
                metrics["output_tokens"],
                metrics["latency_ms"],
            ),
        )

        cur.execute("UPDATE products SET status = 'enriched' WHERE id = %s", (product_id,))

        # Mark the batch done once none of its products are still outstanding.
        cur.execute(
            "UPDATE batches SET status = 'done' WHERE id = %s "
            "AND NOT EXISTS ("
            "  SELECT 1 FROM products WHERE batch_id = %s "
            "  AND status NOT IN ('enriched', 'approved', 'published')"
            ")",
            (state.product.batch_id, state.product.batch_id),
        )
