"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import type { ReviewField } from "@/lib/productFields";

type RenderMode = "text" | "rich" | "tags";

/**
 * One reviewable enriched field rendered inside a section card: shows the
 * value, its provenance (source · confidence), and Accept / Override controls
 * that PATCH the BFF (/api/products/[id]/fields/[fieldId]). This is the review
 * affordance from the old FieldRow, restyled for the card layout — the PATCH
 * behavior and router.refresh() flow are unchanged.
 */
export function FieldEditable({
  productId,
  field,
  fieldName,
  label,
  render = "text",
  placeholder = "Not enriched yet",
}: {
  productId: string;
  field?: ReviewField;
  /** Used when there is no field row yet, so Override can still target a name. */
  fieldName?: string;
  label?: string;
  render?: RenderMode;
  placeholder?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(field?.value ?? "");
  const [busy, setBusy] = useState(false);

  const name = field?.field_name ?? fieldName;

  async function patch(body: Record<string, unknown>) {
    if (!field) return;
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

  const value = field?.value ?? null;
  const hasValue = value != null && value.trim() !== "";

  function renderValue() {
    if (!hasValue) return <span className="faint">{placeholder}</span>;

    if (render === "tags") {
      return (
        <div className="chip-row">
          {value!
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t, i) => (
              <span className="chip" key={`${t}-${i}`}>
                {t}
              </span>
            ))}
        </div>
      );
    }

    if (render === "rich") {
      const long = value!.length > 180;
      return (
        <div>
          <p className={`rich-text${long && !expanded ? " clamped" : ""}`}>
            {value}
          </p>
          {long && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>
      );
    }

    return <span>{value}</span>;
  }

  return (
    <div className="field-editable">
      {label && <div className="field-label">{label}</div>}

      {editing ? (
        <div className="field-edit">
          <textarea
            value={draft}
            rows={render === "rich" ? 5 : 2}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="actions" style={{ marginTop: 8 }}>
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
          </div>
        </div>
      ) : (
        <>
          <div className="field-display">{renderValue()}</div>
          <div className="field-meta">
            {field && (
              <span className="field-provenance">
                <span className={`source-${field.source}`}>{field.source}</span>
                {field.confidence != null &&
                  ` · ${Math.round(field.confidence * 100)}%`}
                {field.status !== "ai" && ` · ${field.status}`}
              </span>
            )}
            <span className="field-actions">
              {field && (
                <button
                  className="ghost"
                  title="Accept AI value"
                  onClick={() => patch({ action: "accept" })}
                  disabled={busy || field.status === "accepted"}
                >
                  <Check size={15} />
                </button>
              )}
              <button
                className="ghost"
                title={name ? `Edit ${name}` : "Edit"}
                onClick={() => {
                  setDraft(value ?? "");
                  setEditing(true);
                }}
                disabled={!field}
              >
                <Pencil size={15} />
              </button>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
