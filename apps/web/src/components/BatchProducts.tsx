"use client";

import { useMemo, useState } from "react";
import type { ProductStatus } from "@repo/db";
import { RetryButton } from "@/components/RetryButton";
import { TrackedLink } from "@/components/TrackedLink";

export type ProductListItem = {
  id: string;
  status: ProductStatus;
  created_at: string;
  variant_count: number;
  title: string | null;
};

// Default sort: surface items awaiting human review first, push not-yet-actionable
// `queued` items to the very bottom.
const STATUS_OPTIONS: ProductStatus[] = [
  "enriched",
  "enriching",
  "approved",
  "published",
  "queued",
];

function statusRank(status: ProductStatus): number {
  return STATUS_OPTIONS.indexOf(status);
}

type StatusFilter = ProductStatus | "all";

export function BatchProducts({ products }: { products: ProductListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter(
        (p) =>
          needle === "" || (p.title?.toLowerCase().includes(needle) ?? false),
      )
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          a.created_at.localeCompare(b.created_at),
      );
  }, [products, query, statusFilter]);

  if (products.length === 0) {
    return (
      <div className="panel">
        <p className="muted">
          No products yet — clustering runs first, then products appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="batch-toolbar">
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products by name"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        {visible.length === 0 ? (
          <p className="muted">No products match your search and filter.</p>
        ) : (
          visible.map((p) => (
            <div className="row" key={p.id}>
              <div>
                <TrackedLink href={`/products/${p.id}`}>
                  {p.title ?? <span className="muted">Untitled product</span>}
                </TrackedLink>
                <div className="muted">{p.variant_count} variant(s)</div>
              </div>
              <div className="actions">
                {p.status === "queued" || p.status === "enriching" ? (
                  <RetryButton productId={p.id} />
                ) : null}
                <span className={`badge ${p.status}`}>{p.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
