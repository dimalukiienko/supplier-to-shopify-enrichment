"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldSource, FieldStatus } from "@repo/db";

type Field = {
  id: string;
  field_name: string;
  value: string | null;
  confidence: number | null;
  source: FieldSource;
  status: FieldStatus;
};

/**
 * One reviewable enriched field: shows value, confidence, source, and status,
 * with Accept / Override actions that PATCH the BFF
 * (/api/products/[id]/fields/[fieldId]).
 */
export function FieldRow({
  productId,
  field,
}: {
  productId: string;
  field: Field;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value ?? "");
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/products/${productId}/fields/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="row">
      <div className="field-name">{field.field_name}</div>

      <div className="field-value">
        {editing ? (
          <textarea
            value={draft}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          (field.value ?? <span className="muted">—</span>)
        )}
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          <span className={`source-${field.source}`}>{field.source}</span>
          {field.confidence != null &&
            ` · ${Math.round(field.confidence * 100)}% conf`}
          {field.status !== "ai" && ` · ${field.status}`}
        </div>
      </div>

      <div className="actions">
        {editing ? (
          <>
            <button
              onClick={() => patch({ action: "override", value: draft })}
              disabled={busy}
            >
              Save
            </button>
            <button
              className="secondary"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => patch({ action: "accept" })}
              disabled={busy || field.status === "accepted"}
            >
              Accept
            </button>
            <button className="secondary" onClick={() => setEditing(true)}>
              Override
            </button>
          </>
        )}
      </div>
    </div>
  );
}
