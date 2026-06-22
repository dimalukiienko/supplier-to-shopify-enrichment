"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProductStatus } from "@repo/db";

import { RetryButton } from "@/components/RetryButton";
import { TrackedLink } from "@/components/TrackedLink";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const reduce = useReducedMotion();

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
      <Card className="p-4">
        <p className="text-muted-foreground">
          No products yet — clustering runs first, then products appear here.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products by name"
          className="min-w-55 flex-1"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="min-w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 px-4 py-0">
        {visible.length === 0 ? (
          <p className="text-muted-foreground py-4">
            No products match your search and filter.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((p) => (
              <motion.div
                key={p.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
              >
                <div>
                  <TrackedLink
                    href={`/products/${p.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {p.title ?? (
                      <span className="text-muted-foreground">
                        Untitled product
                      </span>
                    )}
                  </TrackedLink>
                  <div className="text-muted-foreground text-sm">
                    {p.variant_count} variant(s)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.status === "queued" || p.status === "enriching" ? (
                    <RetryButton productId={p.id} />
                  ) : null}
                  <StatusBadge status={p.status} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Card>
    </>
  );
}
