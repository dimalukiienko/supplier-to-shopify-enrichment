import type { ReactNode } from "react";

/**
 * Presentational card matching the reference's labelled sections: an icon +
 * uppercase title header (with optional count/right-slot) over a body. Server-
 * safe (no hooks) so it can wrap both static placeholders and client controls.
 */
export function SectionCard({
  icon,
  title,
  count,
  action,
  children,
  bodyClassName = "",
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="card">
      <header className="card-header">
        <span className="card-header-icon">{icon}</span>
        <span>{title}</span>
        {count != null && <span className="card-header-count">({count})</span>}
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </header>
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
