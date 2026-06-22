"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** App-wide theme context. next-themes toggles `.dark` on <html> and handles
 *  the pre-paint flash, replacing the old inline localStorage script. */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
