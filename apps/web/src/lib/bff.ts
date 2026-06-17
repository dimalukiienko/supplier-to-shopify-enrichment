import { headers } from "next/headers";

/**
 * Server-side fetch through the BFF. Server Components read data via the same
 * HTTP API the browser uses — the frontend never touches Supabase or the worker
 * directly (docs/ARCHITECTURE.md §2). Builds an absolute URL from the request
 * host so it works in dev and behind a proxy.
 */
export async function bffFetch<T>(path: string): Promise<T> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`BFF ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
