import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/db";

/**
 * Server-side Supabase client for BFF route handlers and Server Components.
 *
 * Uses the service-role key — keep this module server-only (never import it
 * into a Client Component). The BFF is the single place that writes to
 * Supabase and enqueues `jobs` (see docs/ARCHITECTURE.md §3).
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
