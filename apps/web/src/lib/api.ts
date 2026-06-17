import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Small shared helpers for BFF route handlers (docs/ARCHITECTURE.md §3).
 *
 * Keeps error/validation shaping consistent across handlers so each route body
 * stays focused on its Supabase work.
 */

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Parse an already-decoded value against a zod schema, returning either the
 * typed data or a 400 response. Callers do:
 *
 *   const parsed = parseOr400(schema, body);
 *   if (parsed.error) return parsed.error;
 *   // parsed.data is typed
 */
export function parseOr400<T>(
  schema: ZodType<T>,
  value: unknown,
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { data: null, error: jsonError(400, message) };
  }
  return { data: result.data, error: null };
}
