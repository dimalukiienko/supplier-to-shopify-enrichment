"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/db";

/**
 * Browser Supabase client (anon key) — used by the review workspace to
 * subscribe to Realtime changes on `enriched_fields` / `products.status`
 * so fields stream in live as the worker completes (docs/ARCHITECTURE.md §2, §4).
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient<Database>(url, anonKey);
}
