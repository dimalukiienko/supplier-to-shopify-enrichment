import { NextResponse } from "next/server";
import type { Update } from "@repo/db";
import { createServerClient } from "@/lib/supabase";
import { jsonError, parseOr400 } from "@/lib/api";
import { fieldPatchSchema } from "@/lib/schemas";

/**
 * Accept or override an enriched field (reviewer action).
 *
 *   accept   → status='accepted' (keeps the AI value)
 *   override → status='overridden', source='manual', value=<reviewer input>
 *
 * Both statuses are preserved across re-enrichment by the worker's idempotent
 * persist (apps/worker/src/worker/pipeline/persist.py).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string; fieldId: string }> },
) {
  const { productId, fieldId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = parseOr400(fieldPatchSchema, body);
  if (parsed.error) return parsed.error;

  const update: Update<"enriched_fields"> =
    parsed.data.action === "accept"
      ? { status: "accepted" }
      : { status: "overridden", source: "manual", value: parsed.data.value };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("enriched_fields")
    .update(update)
    .eq("id", fieldId)
    .eq("product_id", productId)
    .select("id, field_name, value, confidence, source, status, variant_id")
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Field not found");

  return NextResponse.json({ field: data });
}
