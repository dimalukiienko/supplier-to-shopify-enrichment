"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  title_template: { token: string }[];
  default_model: string;
  guardrail_config: Record<string, unknown>;
};

/**
 * Edits the singleton settings row (PUT /api/settings): title-format tokens,
 * default model, and guardrail config (docs/ARCHITECTURE.md §3).
 */
export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [tokens, setTokens] = useState(
    settings.title_template.map((t) => t.token).join(", "),
  );
  const [model, setModel] = useState(settings.default_model);
  const [guardrails, setGuardrails] = useState(
    JSON.stringify(settings.guardrail_config, null, 2),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);

    let guardrailConfig: Record<string, unknown>;
    try {
      guardrailConfig = JSON.parse(guardrails);
    } catch {
      setBusy(false);
      setMessage("Guardrail config is not valid JSON.");
      return;
    }

    const body = {
      title_template: tokens
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((token) => ({ token })),
      default_model: model,
      guardrail_config: guardrailConfig,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(data?.error ?? `Save failed (${res.status})`);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="panel">
      <label className="muted">Title format tokens (comma-separated)</label>
      <input
        type="text"
        value={tokens}
        onChange={(e) => setTokens(e.target.value)}
      />

      <label className="muted" style={{ marginTop: 12, display: "block" }}>
        Default model
      </label>
      <input
        type="text"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />

      <label className="muted" style={{ marginTop: 12, display: "block" }}>
        Guardrail config (JSON)
      </label>
      <textarea
        value={guardrails}
        rows={5}
        onChange={(e) => setGuardrails(e.target.value)}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        {message && <span className="muted">{message}</span>}
      </div>
    </div>
  );
}
