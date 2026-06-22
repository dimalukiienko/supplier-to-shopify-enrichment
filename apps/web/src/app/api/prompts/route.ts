import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonError, parseOr400 } from "@/lib/api";
import { promptsUpdateSchema } from "@/lib/schemas";

/**
 * Active prompt versions (docs/ARCHITECTURE.md §3). The worker reads the active
 * version per name (apps/worker/src/worker/pipeline/fetch.py).
 *
 * GET — returns the active prompt versions, ordered by name.
 * PUT — upserts content for the active version of each named prompt, inserting
 *       a first active version (column defaults fill id/created_at/updated_at)
 *       when a name has none yet.
 */

function selectActive(supabase: ReturnType<typeof createServerClient>) {
  return supabase
    .from("prompt_versions")
    .select("name, version, content")
    .eq("is_active", true)
    .order("name", { ascending: true });
}

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await selectActive(supabase);
  if (error) return jsonError(500, error.message);
  return NextResponse.json({ prompt_versions: data });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseOr400(promptsUpdateSchema, body);
  if (parsed.error) return parsed.error;

  const supabase = createServerClient();

  for (const { name, content } of parsed.data.prompts) {
    const active = await supabase
      .from("prompt_versions")
      .select("id")
      .eq("name", name)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (active.error) return jsonError(500, active.error.message);

    if (active.data) {
      const { error } = await supabase
        .from("prompt_versions")
        .update({ content })
        .eq("id", active.data.id);
      if (error) return jsonError(500, error.message);
      continue;
    }

    // No active version yet — create one after the highest existing version so
    // we never collide with the unique (name, version) constraint.
    const max = await supabase
      .from("prompt_versions")
      .select("version")
      .eq("name", name)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (max.error) return jsonError(500, max.error.message);

    const { error } = await supabase.from("prompt_versions").insert({
      name,
      version: (max.data?.version ?? 0) + 1,
      content,
      is_active: true,
    });
    if (error) return jsonError(500, error.message);
  }

  const { data, error } = await selectActive(supabase);
  if (error) return jsonError(500, error.message);
  return NextResponse.json({ prompt_versions: data });
}
