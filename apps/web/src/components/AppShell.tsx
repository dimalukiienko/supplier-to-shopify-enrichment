"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Layers, Settings, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { TrackedLink } from "./TrackedLink";
import {
  clearNavigationLoading,
  useNavigationLoading,
} from "@/lib/navigation-loading-store";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  match?: (path: string) => boolean;
};

/**
 * Reviewer app shell — left icon sidebar matching the reference.
 */
const NAV: NavItem[] = [
  {
    label: "Upload Batches",
    icon: Layers,
    href: "/",
    match: (p) => p === "/" || p.startsWith("/batches"),
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
    match: (p) => p.startsWith("/settings"),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigationLoading = useNavigationLoading();

  useEffect(() => {
    clearNavigationLoading();
  }, [pathname]);

  return (
    <div
      className={`app-shell${navigationLoading.pending ? " is-navigating" : ""}`}
    >
      <div
        className="route-loading-bar"
        aria-hidden={!navigationLoading.pending}
      />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">S</span>
          <span className="brand-name">Supplier Enrichment</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match
              ? item.match(pathname)
              : pathname === item.href;

            return (
              <TrackedLink
                key={item.label}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </TrackedLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content" aria-busy={navigationLoading.pending}>
          {children}
        </div>
      </main>
    </div>
  );
}
