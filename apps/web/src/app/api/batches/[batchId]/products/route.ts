import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";

/**
 * List the products in a batch with status, variant count, and a title preview
 * (the `title` enriched_field). Drives the batch dashboard.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, status, created_at, variants(count), enriched_fields(value)")
    // Embedded filter narrows the enriched_fields array to the title row only;
    // products without a title are still returned (left embed).
    .eq("enriched_fields.field_name", "title")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) return jsonError(500, error.message);

  const products = (data ?? []).map((p) => ({
    id: p.id,
    status: p.status,
    created_at: p.created_at,
    variant_count: p.variants[0]?.count ?? 0,
    title: p.enriched_fields[0]?.value ?? null,
  }));

  return NextResponse.json({ products });
}
