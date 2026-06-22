import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Presentational section card: an icon + uppercase title header (with optional
 * count / right-slot action) over a body. Server-safe (no hooks) so it can wrap
 * both static placeholders and client controls.
 */
export function SectionCard({
  icon,
  title,
  count,
  action,
  children,
  bodyClassName,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-2 border-b px-4 py-3 [.border-b]:pb-3">
        <span className="text-muted-foreground inline-flex [&_svg]:size-4">
          {icon}
        </span>
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {title}
        </CardTitle>
        {count != null && (
          <span className="text-muted-foreground/70 text-xs font-medium">
            ({count})
          </span>
        )}
        {action && <span className="ml-auto">{action}</span>}
      </CardHeader>
      <CardContent className={cn("p-4", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
