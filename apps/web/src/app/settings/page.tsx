import { bffFetch } from "@/lib/bff";
import { SettingsForm } from "@/components/SettingsForm";

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
    <main>
      <h1>Settings</h1>

      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <p className="muted">No settings row found. Seed the database first.</p>
      )}

      <h2>Active prompts</h2>
      <div className="panel">
        {prompt_versions.length === 0 ? (
          <p className="muted">No active prompts.</p>
        ) : (
          prompt_versions.map((p) => (
            <div className="row" key={p.name}>
              <div>
                <div className="field-name">
                  {p.name} v{p.version}
                </div>
                <div className="muted">{p.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
