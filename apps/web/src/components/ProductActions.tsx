"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@repo/db";

/**
 * Approve / push controls for a product. Approve records reviewer sign-off;
 * Push triggers the (mocked) Shopify publish (docs/ARCHITECTURE.md §6).
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
    <div className="panel" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => act("approve")} disabled={busy || !canApprove}>
        Approve
      </button>
      <button
        className="secondary"
        onClick={() => act("push")}
        disabled={busy || !canPush}
      >
        Push to Shopify
      </button>
      {note && <span className="muted">{note}</span>}
      {status === "published" && (
        <span className="muted">Published (mocked).</span>
      )}
    </div>
  );
}
