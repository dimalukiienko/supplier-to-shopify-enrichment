import { bffFetch } from "@/lib/bff";
import { SettingsForm } from "@/components/SettingsForm";
import { FadeIn } from "@/components/motion/FadeIn";
import { Card } from "@/components/ui/card";

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

export default async function SettingsPage() {
  const { settings, prompt_versions } =
    await bffFetch<SettingsPayload>("/api/settings");

  return (
    <FadeIn>
      <h1 className="text-foreground mb-4 text-xl font-semibold">Settings</h1>

      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <p className="text-muted-foreground">
          No settings row found. Seed the database first.
        </p>
      )}

      <h2 className="text-foreground mt-6 mb-3 text-base font-semibold">
        Active prompts
      </h2>
      <Card className="px-4 py-0">
        {prompt_versions.length === 0 ? (
          <p className="text-muted-foreground py-4">No active prompts.</p>
        ) : (
          prompt_versions.map((p) => (
            <div className="border-b py-2.5 last:border-b-0" key={p.name}>
              <div className="text-foreground font-semibold">
                {p.name} v{p.version}
              </div>
              <div className="text-muted-foreground text-sm">{p.content}</div>
            </div>
          ))
        )}
      </Card>
    </FadeIn>
  );
}
