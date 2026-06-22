"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PromptVersion = { name: string; version: number; content: string };

/**
 * Edits the active prompt versions the worker reads (cluster, enrich_product;
 * docs/ARCHITECTURE.md §3). Saving upserts each active version
 * (PUT /api/prompts), creating one when a prompt has no active version yet.
 * A version of 0 marks a default that has not been saved to the DB yet.
 */
export function PromptsForm({ prompts }: { prompts: PromptVersion[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(prompts.map((p) => [p.name, p.content])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);

    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompts: Object.entries(drafts).map(([name, content]) => ({
          name,
          content,
        })),
      }),
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
      {prompts.map((p) => (
        <div className="grid gap-1.5" key={p.name}>
          <Label htmlFor={`prompt-${p.name}`}>
            {p.name}
            {p.version > 0 ? (
              <span className="text-muted-foreground"> v{p.version}</span>
            ) : (
              <span className="text-muted-foreground"> (not saved)</span>
            )}
          </Label>
          <Textarea
            id={`prompt-${p.name}`}
            value={drafts[p.name] ?? ""}
            rows={4}
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [p.name]: e.target.value }))
            }
          />
        </div>
      ))}

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
