"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import type { ProductStatus } from "@repo/db";

/**
 * Approve / push controls for a product. Approve records reviewer sign-off;
 * Push triggers the (mocked) Shopify publish (docs/ARCHITECTURE.md §6). The
 * Shopify view/sync/delete buttons mirror the reference but are decorative —
 * live Shopify is mocked in Stage 1.
 */
export function ProductActions({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function act(action: "approve" | "push") {
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/products/${productId}/${action}`, {
      method: "POST",
    });
    setBusy(false);
    if (action === "push" && res.ok) {
      const data = (await res.json()) as { shopify_product_id?: string };
      setNote(`Pushed to Shopify (mocked): ${data.shopify_product_id}`);
    }
    router.refresh();
  }

  const canApprove = status === "enriched";
  const canPush = status === "approved";

  return (
    <>
      <button
        className="secondary"
        disabled
        title="Decorative — Shopify is mocked in Stage 1"
      >
        <ExternalLink size={14} /> View on Shopify
      </button>
      <button
        className="secondary"
        disabled
        title="Decorative — Shopify is mocked in Stage 1"
      >
        <Trash2 size={14} /> Delete from Shopify
      </button>
      <button onClick={() => act("approve")} disabled={busy || !canApprove}>
        Approve
      </button>
      <button
        className="secondary"
        onClick={() => act("push")}
        disabled={busy || !canPush}
      >
        <RefreshCw size={14} /> Sync to Shopify
      </button>
      {note && <span className="muted">{note}</span>}
      {status === "published" && <span className="muted">Published (mocked).</span>}
    </>
  );
}
