import { bffFetch } from "@/lib/bff";
import { SettingsForm } from "@/components/SettingsForm";
import { PromptsForm } from "@/components/PromptsForm";
import { FadeIn } from "@/components/motion/FadeIn";

type SettingsPayload = {
  settings: {
    id: string;
    title_template: { token: string }[];
    default_model: string;
    guardrail_config: Record<string, unknown>;
  } | null;
  prompt_versions: { name: string; version: number; content: string }[];
};

export const dynamic = "force-dynamic";

/**
 * Defaults shown when no settings row exists yet — mirrors supabase/seed.sql so
 * the form is usable on a fresh DB. Saving upserts the row (PUT /api/settings).
 */
const DEFAULT_SETTINGS: NonNullable<SettingsPayload["settings"]> = {
  id: "",
  title_template: [{ token: "Brand" }, { token: "Size" }, { token: "Name" }],
  default_model: "gpt-4o-mini",
  guardrail_config: { min_confidence: 0.4, require_grounded_barcode: true },
};

/**
 * Prompts the worker reads (apps/worker/src/worker/pipeline/fetch.py), with
 * default content mirroring supabase/seed.sql. version 0 marks a default not yet
 * persisted; saving the form upserts the active version (PUT /api/prompts).
 */
const KNOWN_PROMPTS: SettingsPayload["prompt_versions"] = [
  {
    name: "cluster",
    version: 0,
    content:
      "Cluster supplier rows that represent the same product into one product with variants.",
  },
  {
    name: "enrich_product",
    version: 0,
    content:
      "Enrich the product: draft title, description, vendor, type, and tags from the normalized inputs.",
  },
];

export default async function SettingsPage() {
  const { settings, prompt_versions } =
    await bffFetch<SettingsPayload>("/api/settings");

  // Always offer the known prompts (defaults when missing), plus any other
  // active prompts the DB already has.
  const byName = new Map(prompt_versions.map((p) => [p.name, p]));
  const editablePrompts = [
    ...KNOWN_PROMPTS.map((d) => byName.get(d.name) ?? d),
    ...prompt_versions.filter(
      (p) => !KNOWN_PROMPTS.some((d) => d.name === p.name),
    ),
  ];

  return (
    <FadeIn>
      <h1 className="text-foreground mb-4 text-xl font-semibold">Settings</h1>

      {settings === null && (
        <p className="text-muted-foreground mb-3 text-sm">
          No settings row yet — defaults shown. Save to create the config row.
        </p>
      )}
      <SettingsForm settings={settings ?? DEFAULT_SETTINGS} />

      <h2 className="text-foreground mt-6 mb-3 text-base font-semibold">
        Active prompts
      </h2>
      <PromptsForm prompts={editablePrompts} />
    </FadeIn>
  );
}
