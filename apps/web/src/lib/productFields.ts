import type { FieldSource, FieldStatus } from "@repo/db";

export type ReviewField = {
  id: string;
  field_name: string;
  value: string | null;
  confidence: number | null;
  source: FieldSource;
  status: FieldStatus;
  variant_id: string | null;
};

// Surface the "Built" fields first (docs/ARCHITECTURE.md §6), then Partial.
export const FIELD_ORDER = [
  "title",
  "description",
  "vendor",
  "product_type",
  "tags",
  "seo_title",
  "seo_description",
  "barcode",
  "weight",
  "dimensions",
  "pack_qty",
];

export function fieldRank(name: string): number {
  const i = FIELD_ORDER.indexOf(name);
  return i === -1 ? FIELD_ORDER.length : i;
}

export function sortFields(fields: ReviewField[]): ReviewField[] {
  return [...fields].sort(
    (a, b) =>
      fieldRank(a.field_name) - fieldRank(b.field_name) ||
      a.field_name.localeCompare(b.field_name),
  );
}

/** First product-level (non-variant) field with the given name. */
export function fieldByName(
  fields: ReviewField[],
  name: string,
): ReviewField | undefined {
  return fields.find((f) => f.field_name === name && f.variant_id === null);
}

/** Raw value for a field name, or null when not yet enriched. */
export function valueOf(fields: ReviewField[], name: string): string | null {
  return fieldByName(fields, name)?.value ?? null;
}
