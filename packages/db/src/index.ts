/**
 * @repo/db — single import surface for the Supabase schema contract.
 *
 * `Database` is generated (see types.gen.ts). The domain-friendly aliases and
 * status string-unions below are hand-authored on top so the web app imports
 * stable names (`EnrichedField`, `ProductStatus`, …) rather than reaching into
 * `Database["public"]["Tables"][...]` everywhere.
 */
export type { Database, Json } from "./types.gen.ts";

import type { Database } from "./types.gen.ts";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];

// --- Row aliases -----------------------------------------------------------
export type Batch = Row<"batches">;
export type SupplierRow = Row<"supplier_rows">;
export type Product = Row<"products">;
export type Variant = Row<"variants">;
export type EnrichedField = Row<"enriched_fields">;
export type Job = Row<"jobs">;
export type Run = Row<"runs">;
export type Settings = Row<"settings">;
export type PromptVersion = Row<"prompt_versions">;

// --- Status / enum unions (mirror docs/DATABASE.md) -----------------------------
export type BatchStatus = Batch["status"];
export type ProductStatus = Product["status"];
export type JobType = Job["type"];
export type JobStatus = Job["status"];
export type RunStatus = Run["status"];
export type FieldSource = EnrichedField["source"];
export type FieldStatus = EnrichedField["status"];
