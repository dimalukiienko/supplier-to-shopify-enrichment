import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError } from "@/lib/api";

/** Record reviewer approval: products.status → 'approved'. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .update({ status: "approved" })
    .eq("id", productId)
    .select("id, status")
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Product not found");

  return NextResponse.json({ product: data });
}
