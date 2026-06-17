import { NextResponse } from "next/server";
import type { Json } from "@repo/db";
import { createServerClient } from "@/lib/supabase";
import { jsonError, parseOr400 } from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/schemas";

/**
 * Enrichment settings (docs/ARCHITECTURE.md §3). The worker reads the singleton
 * settings row (apps/worker/src/worker/pipeline/fetch.py: earliest row).
 *
 * GET — returns the settings row plus the active prompt_versions.
 * PUT — updates title_template, default_model, guardrail_config.
 */

async function loadSettingsId(
  supabase: ReturnType<typeof createServerClient>,
) {
  return supabase
    .from("settings")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export async function GET() {
  const supabase = createServerClient();

  const [settingsRes, promptsRes] = await Promise.all([
    supabase
      .from("settings")
      .select("id, title_template, default_model, guardrail_config")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prompt_versions")
      .select("name, version, content")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (settingsRes.error) return jsonError(500, settingsRes.error.message);
  if (promptsRes.error) return jsonError(500, promptsRes.error.message);

  return NextResponse.json({
    settings: settingsRes.data,
    prompt_versions: promptsRes.data,
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseOr400(settingsUpdateSchema, body);
  if (parsed.error) return parsed.error;

  const supabase = createServerClient();
  const existing = await loadSettingsId(supabase);
  if (existing.error) return jsonError(500, existing.error.message);
  if (!existing.data) return jsonError(404, "Settings row not found");

  const { data, error } = await supabase
    .from("settings")
    .update({
      title_template: parsed.data.title_template,
      default_model: parsed.data.default_model,
      guardrail_config: parsed.data.guardrail_config as Json,
    })
    .eq("id", existing.data.id)
    .select("id, title_template, default_model, guardrail_config")
    .single();

  if (error) return jsonError(500, error.message);
  return NextResponse.json({ settings: data });
}
