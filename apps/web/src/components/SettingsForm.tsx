"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <Card className="gap-4 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title-tokens">
          Title format tokens (comma-separated)
        </Label>
        <Input
          id="title-tokens"
          type="text"
          value={tokens}
          onChange={(e) => setTokens(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="default-model">Default model</Label>
        <Input
          id="default-model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="guardrails">Guardrail config (JSON)</Label>
        <Textarea
          id="guardrails"
          value={guardrails}
          rows={5}
          onChange={(e) => setGuardrails(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {message && (
          <span className="text-muted-foreground text-sm">{message}</span>
        )}
      </div>
    </Card>
  );
}
