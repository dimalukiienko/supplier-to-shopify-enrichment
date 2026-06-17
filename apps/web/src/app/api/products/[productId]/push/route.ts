import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";

/**
 * Push an approved product to Shopify — MOCKED in Stage 1 (docs/ARCHITECTURE.md
 * §6). The path is wired and flips products.status → 'published', but does not
 * hit the live Shopify Admin API; it returns a synthetic product id.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .update({ status: "published" })
    .eq("id", productId)
    .select("id, status")
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Product not found");

  // Synthetic Shopify id — no live API call in Stage 1.
  const shopifyProductId = `mock_${productId}`;

  return NextResponse.json({
    product: data,
    shopify_product_id: shopifyProductId,
    mocked: true,
  });
}
