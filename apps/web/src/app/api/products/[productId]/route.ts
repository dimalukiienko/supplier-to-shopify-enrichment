import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";

/**
 * Full review payload for one product: the product, its variants (ordered by
 * grouping position, with the originating supplier row), every enriched_field,
 * and the latest run record (model/latency/node traces) for observability.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const supabase = createServerClient();

  const [productRes, variantsRes, fieldsRes, runRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, batch_id, status, created_at")
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("variants")
      .select(
        "id, size, color, position, supplier_rows(supplier_sku, product_name, barcode, unit_price)",
      )
      .eq("product_id", productId)
      .order("position", { ascending: true }),
    supabase
      .from("enriched_fields")
      .select("id, field_name, value, confidence, source, status, variant_id")
      .eq("product_id", productId)
      .order("field_name", { ascending: true }),
    supabase
      .from("runs")
      .select(
        "id, status, model, prompt_version, graph_version, input_tokens, output_tokens, latency_ms, node_traces, created_at",
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (productRes.error) return jsonError(500, productRes.error.message);
  if (!productRes.data) return jsonError(404, "Product not found");
  if (variantsRes.error) return jsonError(500, variantsRes.error.message);
  if (fieldsRes.error) return jsonError(500, fieldsRes.error.message);
  if (runRes.error) return jsonError(500, runRes.error.message);

  return NextResponse.json({
    product: productRes.data,
    variants: variantsRes.data,
    fields: fieldsRes.data,
    run: runRes.data,
  });
}
