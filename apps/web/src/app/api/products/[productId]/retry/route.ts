import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";

/**
 * Re-enrich a product: enqueue a fresh `enrich_product` job and flip the product
 * back to 'enriching'. Backs the UI "retry failed product" affordance. The
 * worker's persist is idempotent and preserves accepted/overridden fields.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const supabase = createServerClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .update({ status: "enriching" })
    .eq("id", productId)
    .select("id, status")
    .maybeSingle();

  if (productError) return jsonError(500, productError.message);
  if (!product) return jsonError(404, "Product not found");

  const { error: jobError } = await supabase
    .from("jobs")
    .insert({ type: "enrich_product", status: "queued", product_id: productId });
  if (jobError) return jsonError(500, jobError.message);

  return NextResponse.json({ product });
}
