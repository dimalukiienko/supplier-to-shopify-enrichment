"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Re-enqueues enrichment for a product (POST /api/products/[id]/retry). */
export function RetryButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/products/${productId}/retry`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={retry} disabled={busy}>
      {busy ? "Retrying…" : "Retry"}
    </Button>
  );
}
