"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Dark-mode toggle shown at the bottom of the sidebar. Theme state is owned by
 * next-themes (`.dark` on <html>, persisted, no pre-paint flash). The `mounted`
 * guard avoids a hydration mismatch since the theme is only known client-side.
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-pressed={mounted ? dark : undefined}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("text-muted-foreground w-full justify-start", collapsed && "justify-center")}
    >
      {mounted && dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      {!collapsed && <span>{mounted && dark ? "Light Mode" : "Dark Mode"}</span>}
    </Button>
  );
}
