import Link from "next/link";
import type { FieldSource, FieldStatus, ProductStatus } from "@repo/db";
import { bffFetch } from "@/lib/bff";
import { FieldRow } from "@/components/FieldRow";
import { ProductActions } from "@/components/ProductActions";
import { ReviewLive } from "@/components/ReviewLive";

type ReviewField = {
  id: string;
  field_name: string;
  value: string | null;
  confidence: number | null;
  source: FieldSource;
  status: FieldStatus;
  variant_id: string | null;
};

type ReviewVariant = {
  id: string;
  size: string | null;
  color: string | null;
  position: number;
  supplier_rows: {
    supplier_sku: string | null;
    product_name: string | null;
    barcode: string | null;
    unit_price: number | null;
  } | null;
};

type ReviewRun = {
  model: string | null;
  prompt_version: string | null;
  graph_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
} | null;

type ReviewPayload = {
  product: { id: string; batch_id: string; status: ProductStatus };
  variants: ReviewVariant[];
  fields: ReviewField[];
  run: ReviewRun;
};

// Surface the "Built" fields first (docs/ARCHITECTURE.md §6), then Partial.
const FIELD_ORDER = [
  "title",
  "description",
  "vendor",
  "product_type",
  "tags",
  "seo_title",
  "seo_description",
  "weight",
  "dimensions",
  "pack_qty",
];

function fieldRank(name: string): number {
  const i = FIELD_ORDER.indexOf(name);
  return i === -1 ? FIELD_ORDER.length : i;
}

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { product, variants, fields, run } = await bffFetch<ReviewPayload>(
    `/api/products/${productId}`,
  );

  const sortedFields = [...fields].sort(
    (a, b) =>
      fieldRank(a.field_name) - fieldRank(b.field_name) ||
      a.field_name.localeCompare(b.field_name),
  );

  return (
    <main>
      <p>
        <Link href={`/batches/${product.batch_id}`}>← Batch</Link>
      </p>

      <ReviewLive productId={productId} />

      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <h1>Product review</h1>
        <span className={`badge ${product.status}`}>{product.status}</span>
      </div>

      <ProductActions productId={productId} status={product.status} />

      <h2>Enriched fields</h2>
      <div className="panel">
        {sortedFields.length === 0 ? (
          <p className="muted">
            No fields yet — they stream in as the worker enriches this product.
          </p>
        ) : (
          sortedFields.map((f) => (
            <FieldRow key={f.id} productId={productId} field={f} />
          ))
        )}
      </div>

      <h2>Variants</h2>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Supplier SKU</th>
              <th>Barcode</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>{v.size ?? "—"}</td>
                <td>{v.supplier_rows?.supplier_sku ?? "—"}</td>
                <td>{v.supplier_rows?.barcode ?? "—"}</td>
                <td>
                  {v.supplier_rows?.unit_price != null
                    ? `$${v.supplier_rows.unit_price}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {run && (
        <>
          <h2>Latest run</h2>
          <div className="panel muted">
            model {run.model ?? "—"} · prompt v{run.prompt_version ?? "—"} ·
            graph {run.graph_version ?? "—"} · {run.input_tokens ?? 0}+
            {run.output_tokens ?? 0} tokens · {run.latency_ms ?? 0}ms
          </div>
        </>
      )}
    </main>
  );
}
