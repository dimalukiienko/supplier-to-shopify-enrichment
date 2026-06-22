"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Layers, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { TrackedLink } from "./TrackedLink";
import { RouteLoadingBar } from "./motion/RouteLoadingBar";
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

/** Reviewer app shell — sticky left sidebar + scrollable content area. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigationLoading = useNavigationLoading();

  useEffect(() => {
    clearNavigationLoading();
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <RouteLoadingBar />

      <aside className="bg-card sticky top-0 flex h-screen w-58 shrink-0 flex-col border-r">
        <div className="flex items-center gap-2.5 border-b px-4.5 py-4">
          <span className="bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-lg text-sm font-bold">
            S
          </span>
          <span className="text-foreground font-semibold">
            Supplier Enrichment
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match
              ? item.match(pathname)
              : pathname === item.href;

            return (
              <TrackedLink
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-[18px]" />
                <span>{item.label}</span>
              </TrackedLink>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <ThemeToggle />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div
          className="mx-auto max-w-300 px-7 pt-6 pb-16"
          aria-busy={navigationLoading.pending}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
