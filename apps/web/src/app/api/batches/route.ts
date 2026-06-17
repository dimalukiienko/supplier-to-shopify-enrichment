import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import type { Insert } from "@repo/db";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";
import { supplierRowSchema } from "@/lib/schemas";

/**
 * BFF batches endpoint (docs/ARCHITECTURE.md §3).
 *
 * GET  — list batches, newest first (drives the home dashboard).
 * POST — upload a supplier CSV: insert a batch + supplier_rows and enqueue a
 *        `cluster_batch` job. This is the production replacement for the dev
 *        harness apps/worker/scripts/seed_batch.py — keep the row shape in sync.
 */

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("batches")
    .select("id, name, status, source_format, created_at")
    .order("created_at", { ascending: false });

  if (error) return jsonError(500, error.message);
  return NextResponse.json({ batches: data });
}

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return jsonError(400, "Expected a multipart 'file' field");
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    // XLSX upload is deferred for Stage 1; the sample input has a CSV twin.
    return jsonError(415, "Only .csv uploads are supported in Stage 1");
  }

  const text = await file.text();
  let rawRows: Record<string, string>[];
  try {
    rawRows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    return jsonError(400, "Could not parse CSV");
  }
  if (rawRows.length === 0) {
    return jsonError(400, "CSV has no data rows");
  }

  const supabase = createServerClient();

  const batchName = `Upload ${file.name} — ${new Date().toISOString()}`;
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .insert({ name: batchName, source_format: "csv", status: "uploaded" })
    .select("id")
    .single();

  if (batchError || !batch) {
    return jsonError(500, batchError?.message ?? "Failed to create batch");
  }

  const rows: Insert<"supplier_rows">[] = rawRows.map((raw) => {
    const r = supplierRowSchema.parse(raw);
    const price = clean(r.unit_price);
    return {
      batch_id: batch.id,
      row_id: clean(r.row_id),
      product_name: clean(r.product_name),
      supplier_sku: clean(r.supplier_sku),
      barcode: clean(r.barcode),
      supplier_notes: clean(r.supplier_notes),
      unit_price: price !== null ? Number(price) : null,
    };
  });

  const { error: rowsError } = await supabase.from("supplier_rows").insert(rows);
  if (rowsError) return jsonError(500, rowsError.message);

  const { error: jobError } = await supabase
    .from("jobs")
    .insert({ type: "cluster_batch", status: "queued", batch_id: batch.id });
  if (jobError) return jsonError(500, jobError.message);

  return NextResponse.json(
    { batch_id: batch.id, rows: rows.length },
    { status: 201 },
  );
}
