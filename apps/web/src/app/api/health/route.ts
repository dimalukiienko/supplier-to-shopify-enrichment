import { NextResponse } from "next/server";

/**
 * BFF health check — a minimal route handler demonstrating the API surface.
 * Real handlers (batches, products, fields, approve/push, settings) live
 * alongside under app/api/* (docs/ARCHITECTURE.md §3).
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
