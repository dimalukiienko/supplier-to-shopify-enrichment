import {
  Boxes,
  ChevronRight,
  FileText,
  ImageOff,
  MoreHorizontal,
  Package,
  Pencil,
  Ruler,
  Search,
  Store,
  Tag,
  Tags,
} from "lucide-react";
import type { ProductStatus } from "@repo/db";
import { bffFetch } from "@/lib/bff";
import { fieldByName, valueOf, type ReviewField } from "@/lib/productFields";
import { SectionCard } from "@/components/SectionCard";
import { FieldEditable } from "@/components/FieldEditable";
import { ProductActions } from "@/components/ProductActions";
import { ReviewLive } from "@/components/ReviewLive";
import { TrackedLink } from "@/components/TrackedLink";

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

export const dynamic = "force-dynamic";

function tagCount(fields: ReviewField[], name: string): number {
  const v = valueOf(fields, name);
  if (!v) return 0;
  return v
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean).length;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { product, variants, fields, run } = await bffFetch<ReviewPayload>(
    `/api/products/${productId}`,
  );

  const title = valueOf(fields, "title") ?? "Untitled product";
  const firstRow = variants[0]?.supplier_rows ?? null;
  const isPublished =
    product.status === "published" || product.status === "approved";

  return (
    <div>
      <ReviewLive productId={productId} />

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <TrackedLink href="/">Inventory</TrackedLink>
        <ChevronRight size={14} />
        <TrackedLink href={`/batches/${product.batch_id}`}>
          Uploaded Products
        </TrackedLink>
        <ChevronRight size={14} />
        <span className="crumb-current">{title}</span>
      </nav>

      {/* Page header */}
      <div className="page-header">
        <h1>{title}</h1>
        <span className={`badge ${product.status}`}>
          {isPublished && <span className="status-dot active" />}
          {isPublished ? "Shopify Active" : product.status}
        </span>
        <span className="spacer" />
        <button className="ghost" title="Edit">
          <Pencil size={16} />
        </button>
        <button className="ghost" title="More">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Parent product + review actions */}
      <div className="panel parent-card">
        <span className="parent-thumb">
          <Package size={20} />
        </span>
        <div className="parent-meta">
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            PARENT PRODUCT
          </div>
          <div className="parent-title">{title}</div>
          <div className="parent-chips">
            <span className="chip">SKU: {firstRow?.supplier_sku ?? "—"}</span>
            <span className="chip">Barcode: {firstRow?.barcode ?? "—"}</span>
            <span className="chip faint">Line Code: not set</span>
          </div>
        </div>
        <div
          className="actions"
          style={{ flexWrap: "wrap", justifyContent: "flex-end" }}
        >
          <ProductActions productId={productId} status={product.status} />
        </div>
      </div>

      {/* Two-column review grid */}
      <div className="review-grid">
        <div className="review-col">
          <SectionCard icon={<FileText size={15} />} title="Description">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "description")}
              fieldName="description"
              render="rich"
            />
          </SectionCard>

          <SectionCard icon={<Store size={15} />} title="Vendor">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "vendor")}
              fieldName="vendor"
            />
          </SectionCard>

          <SectionCard icon={<Tag size={15} />} title="Product Type">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "product_type")}
              fieldName="product_type"
            />
          </SectionCard>

          <SectionCard
            icon={<Tags size={15} />}
            title="Tags"
            count={tagCount(fields, "tags")}
          >
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "tags")}
              fieldName="tags"
              render="tags"
              placeholder="No tags yet"
            />
          </SectionCard>

          <SectionCard
            icon={<Search size={15} />}
            title="Search Engine Listing"
          >
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "seo_title")}
              fieldName="seo_title"
              label="Page Title"
            />
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "seo_description")}
              fieldName="seo_description"
              label="Meta Description"
              render="rich"
            />
          </SectionCard>
        </div>

        <div className="review-col">
          <SectionCard icon={<ImageOff size={15} />} title="Product Media">
            <div className="media-main">
              <ImageOff size={28} />
              <span>No media</span>
              <span className="empty-note" style={{ textAlign: "center" }}>
                Exact-variant image matching is deferred in Stage 1.
              </span>
            </div>
            <div className="media-thumbs">
              {[0, 1].map((i) => (
                <span className="media-thumb" key={i}>
                  <ImageOff size={16} />
                </span>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Physical attributes */}
      <div style={{ marginTop: 16 }}>
        <SectionCard icon={<Ruler size={15} />} title="Physical Attributes">
          <div className="attr-grid">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "weight")}
              fieldName="weight"
              label="Weight"
            />
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "dimensions")}
              fieldName="dimensions"
              label="Dimensions (L × W × H)"
            />
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "pack_qty")}
              fieldName="pack_qty"
              label="Pack Quantity"
            />
          </div>
        </SectionCard>
      </div>

      {/* Variants */}
      <div style={{ marginTop: 16 }}>
        <SectionCard
          icon={<Boxes size={15} />}
          title="Product Variants"
          count={variants.length}
        >
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="faint">
                      No variants yet — clustering groups supplier rows here.
                    </td>
                  </tr>
                ) : (
                  variants.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <span className="media-thumb">
                          <ImageOff size={14} />
                        </span>
                      </td>
                      <td>{v.supplier_rows?.supplier_sku ?? "—"}</td>
                      <td>
                        {v.supplier_rows?.product_name ?? title}
                        {v.size ? ` · ${v.size}` : ""}
                      </td>
                      <td>
                        {v.supplier_rows?.unit_price != null
                          ? `$${v.supplier_rows.unit_price}`
                          : "—"}
                      </td>
                      <td className="faint">—</td>
                      <td>
                        <span
                          className={`status-dot${isPublished ? " active" : ""}`}
                        />
                        {isPublished ? "Active" : product.status}
                      </td>
                      <td>
                        <div className="actions">
                          <button className="ghost" disabled title="View">
                            View
                          </button>
                          <button className="ghost" disabled title="Unlink">
                            Unlink
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {run && (
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Latest run · model {run.model ?? "—"} · prompt v
          {run.prompt_version ?? "—"} · graph {run.graph_version ?? "—"} ·{" "}
          {run.input_tokens ?? 0}+{run.output_tokens ?? 0} tokens ·{" "}
          {run.latency_ms ?? 0}ms
        </p>
      )}
    </div>
  );
}
