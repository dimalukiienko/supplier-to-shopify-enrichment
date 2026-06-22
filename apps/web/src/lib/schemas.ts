import { z } from "zod";

/**
 * Zod schemas for BFF request validation. These mirror the columns the worker
 * and migrations expect (supabase/migrations/*, apps/worker/scripts/seed_batch.py);
 * keep them aligned with the schema source of truth.
 */

/**
 * A single parsed supplier CSV row. Header names match data/products_input.csv:
 * row_id, product_name, supplier_sku, barcode, supplier_notes, unit_price.
 * Every field is optional/nullable — supplier data is intentionally thin.
 */
export const supplierRowSchema = z.object({
  row_id: z.string().trim().optional(),
  product_name: z.string().trim().optional(),
  supplier_sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  supplier_notes: z.string().trim().optional(),
  unit_price: z.string().trim().optional(),
});

export type SupplierRowInput = z.infer<typeof supplierRowSchema>;

/** PATCH body for accepting or overriding an enriched field. */
export const fieldPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("override"), value: z.string() }),
]);

export type FieldPatchInput = z.infer<typeof fieldPatchSchema>;

/** PUT body for the singleton settings row. */
export const settingsUpdateSchema = z.object({
  title_template: z.array(z.object({ token: z.string() })),
  default_model: z.string().min(1),
  guardrail_config: z.record(z.string(), z.unknown()),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/**
 * PUT body for editing the active prompt versions the worker reads
 * (apps/worker/src/worker/pipeline/fetch.py). Each entry targets a prompt by
 * name; the handler updates its active version's content (or creates one).
 */
export const promptsUpdateSchema = z.object({
  prompts: z
    .array(z.object({ name: z.string().min(1), content: z.string().min(1) }))
    .min(1),
});

export type PromptsUpdateInput = z.infer<typeof promptsUpdateSchema>;
