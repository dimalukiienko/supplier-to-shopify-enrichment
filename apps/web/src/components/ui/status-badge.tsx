import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Domain status colors, expressed as code-level variants instead of the old
 * global `.badge.<status>` CSS. Tailwind color utilities (with dark: variants)
 * stand in for the previous success/warn/danger tokens, which the neutral
 * shadcn theme does not define.
 */
const statusBadgeVariants = cva("border capitalize", {
  variants: {
    tone: {
      neutral:
        "border-border bg-muted text-muted-foreground",
      progress:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      success:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      accent:
        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      danger:
        "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    },
  },
  defaultVariants: { tone: "neutral" },
});

/** Maps every product/batch status to a color tone. */
const STATUS_TONE: Record<string, VariantProps<typeof statusBadgeVariants>["tone"]> = {
  queued: "neutral",
  uploaded: "neutral",
  clustering: "progress",
  enriching: "progress",
  enriched: "success",
  done: "success",
  approved: "accent",
  published: "accent",
  failed: "danger",
};

export function StatusBadge({
  status,
  className,
  children,
}: {
  status: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeVariants({ tone }), className)}
    >
      {children ?? status}
    </Badge>
  );
}

/** Field provenance accent (llm | web | manual), replacing the `.source-*` rules. */
export const sourceTextClass: Record<string, string> = {
  llm: "text-muted-foreground",
  web: "text-emerald-600 dark:text-emerald-400",
  manual: "text-blue-600 dark:text-blue-400",
};
