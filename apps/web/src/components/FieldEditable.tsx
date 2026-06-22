"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageOff, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReviewField } from "@/lib/productFields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sourceTextClass } from "@/components/ui/status-badge";
import { AnimateHeight } from "@/components/motion/AnimateHeight";

type RenderMode = "text" | "rich" | "tags" | "media";

/**
 * One reviewable enriched field rendered inside a section card: shows the
 * value, its provenance (source · confidence), and Accept / Override controls
 * that PATCH the BFF (/api/products/[id]/fields/[fieldId]). The PATCH behavior
 * and router.refresh() flow are unchanged from the original.
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
    if (render === "media") {
      const urls = (value ?? "")
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urls.length === 0) {
        return (
          <div className="border-input bg-muted/40 text-muted-foreground flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <ImageOff className="size-7" />
            <span>No media</span>
            <span className="text-muted-foreground/70 px-4 text-center text-xs">
              Web-sourced candidates appear here once enriched.
            </span>
          </div>
        );
      }
      const [main, ...thumbs] = urls;
      // External candidate URLs (arbitrary hosts) render as plain <img>; the
      // app's ESLint config does not load @next/next, so no-img-element is moot
      // and next/image would need per-host remotePatterns it can't know upfront.
      return (
        <div>
          <span className="block aspect-square overflow-hidden rounded-lg">
            <img
              src={main}
              alt="Product media"
              className="size-full object-cover"
            />
          </span>
          {thumbs.length > 0 && (
            <div className="mt-2.5 flex gap-2">
              {thumbs.map((url, i) => (
                <span
                  key={`${url}-${i}`}
                  className="border-border size-12 overflow-hidden rounded-md border"
                >
                  <img
                    src={url}
                    alt={`Product media ${i + 2}`}
                    className="size-full object-cover"
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (!hasValue)
      return <span className="text-muted-foreground/70">{placeholder}</span>;

    if (render === "tags") {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value!
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t, i) => (
              <Badge variant="secondary" key={`${t}-${i}`}>
                {t}
              </Badge>
            ))}
        </div>
      );
    }

    if (render === "rich") {
      const long = value!.length > 180;
      return (
        <div>
          <p
            className={cn(
              "whitespace-pre-wrap",
              long && !expanded && "line-clamp-2",
            )}
          >
            {value}
          </p>
          {long && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Read less" : "Read more"}
            </Button>
          )}
        </div>
      );
    }

    return <span>{value}</span>;
  }

  return (
    <div className="not-first:mt-4 not-first:border-t not-first:pt-4">
      {label && (
        <div className="text-muted-foreground mb-1 text-xs font-semibold">
          {label}
        </div>
      )}

      <AnimateHeight id={editing ? "edit" : "display"}>
        {editing ? (
          <div>
            <Textarea
              value={draft}
              rows={render === "rich" || render === "media" ? 5 : 2}
              onChange={(e) => setDraft(e.target.value)}
              className="whitespace-pre-wrap"
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => patch({ action: "override", value: draft })}
                disabled={busy}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-foreground">{renderValue()}</div>
            <div className="mt-2 flex min-h-6 items-center gap-2">
              {field && (
                <span className="text-muted-foreground text-xs capitalize">
                  <span className={sourceTextClass[field.source]}>
                    {field.source}
                  </span>
                  {field.confidence != null &&
                    ` · ${Math.round(field.confidence * 100)}%`}
                  {field.status !== "ai" && ` · ${field.status}`}
                </span>
              )}
              <span className="ml-auto flex gap-0.5">
                {field && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground size-7"
                        onClick={() => patch({ action: "accept" })}
                        disabled={busy || field.status === "accepted"}
                      >
                        <Check className="size-[15px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Accept AI value</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground size-7"
                      onClick={() => {
                        setDraft(value ?? "");
                        setEditing(true);
                      }}
                      disabled={!field}
                    >
                      <Pencil className="size-[15px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{name ? `Edit ${name}` : "Edit"}</TooltipContent>
                </Tooltip>
              </span>
            </div>
          </>
        )}
      </AnimateHeight>
    </div>
  );
}
