"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Dark-mode toggle shown at the bottom of the sidebar (see the reference).
 * Light is the default; the choice is persisted to localStorage and applied by
 * toggling the `dark` class on <html>. The inline script in layout.tsx applies
 * the saved theme before paint to avoid a flash.
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  return (
    <button
      type="button"
      className="nav-item"
      onClick={toggle}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}
