"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Uploads a supplier CSV to the BFF (POST /api/batches), then navigates to the
 * new batch view. The worker picks up the enqueued cluster_batch job.
 */
export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/batches", { method: "POST", body });
    setBusy(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? `Upload failed (${res.status})`);
      return;
    }

    const { batch_id } = (await res.json()) as { batch_id: string };
    router.push(`/batches/${batch_id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="max-w-xs"
      />
      <Button type="submit" disabled={!file || busy}>
        {busy ? "Uploading…" : "Upload"}
      </Button>
      {error && <span className="text-destructive text-sm">{error}</span>}
    </form>
  );
}
