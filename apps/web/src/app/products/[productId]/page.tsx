import {
  Boxes,
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
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <FadeIn>
      <ReviewLive productId={productId} />

      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <TrackedLink href="/">Inventory</TrackedLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <TrackedLink href={`/batches/${product.batch_id}`}>
                Uploaded Products
              </TrackedLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        <StatusBadge status={product.status}>
          {isPublished && (
            <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />
          )}
          {isPublished ? "Shopify Active" : product.status}
        </StatusBadge>
        <span className="flex-1" />
        <Button variant="ghost" size="icon" title="Edit">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" title="More">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      {/* Parent product + review actions */}
      <Card className="mb-4 flex flex-row flex-wrap items-start gap-3.5 p-4">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-lg">
          <Package className="size-5" />
        </span>
        <div className="min-w-50 flex-1">
          <div className="text-muted-foreground text-xs font-semibold">
            PARENT PRODUCT
          </div>
          <div className="text-foreground text-[15px] font-semibold">
            {title}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              SKU: {firstRow?.supplier_sku ?? "—"}
            </Badge>
            <Badge variant="secondary">
              Barcode: {firstRow?.barcode ?? "—"}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground/70">
              Line Code: not set
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ProductActions productId={productId} status={product.status} />
        </div>
      </Card>

      {/* Two-column review grid */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard icon={<FileText />} title="Description">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "description")}
              fieldName="description"
              render="rich"
            />
          </SectionCard>

          <SectionCard icon={<Store />} title="Vendor">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "vendor")}
              fieldName="vendor"
            />
          </SectionCard>

          <SectionCard icon={<Tag />} title="Product Type">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "product_type")}
              fieldName="product_type"
            />
          </SectionCard>

          <SectionCard
            icon={<Tags />}
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

          <SectionCard icon={<Search />} title="Search Engine Listing">
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

        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard icon={<ImageOff />} title="Product Media">
            <FieldEditable
              productId={productId}
              field={fieldByName(fields, "media")}
              fieldName="media"
              render="media"
            />
          </SectionCard>
        </div>
      </div>

      {/* Physical attributes */}
      <div className="mt-4">
        <SectionCard icon={<Ruler />} title="Physical Attributes">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-4 gap-y-2">
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
      <div className="mt-4">
        <SectionCard
          icon={<Boxes />}
          title="Product Variants"
          count={variants.length}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground/70"
                  >
                    No variants yet — clustering groups supplier rows here.
                  </TableCell>
                </TableRow>
              ) : (
                variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                        <ImageOff className="size-3.5" />
                      </span>
                    </TableCell>
                    <TableCell>{v.supplier_rows?.supplier_sku ?? "—"}</TableCell>
                    <TableCell>
                      {v.supplier_rows?.product_name ?? title}
                      {v.size ? ` · ${v.size}` : ""}
                    </TableCell>
                    <TableCell>
                      {v.supplier_rows?.unit_price != null
                        ? `$${v.supplier_rows.unit_price}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground/70">—</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={
                            isPublished
                              ? "inline-block size-2 rounded-full bg-emerald-500"
                              : "bg-muted-foreground/40 inline-block size-2 rounded-full"
                          }
                        />
                        {isPublished ? "Active" : product.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled title="View">
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Unlink"
                        >
                          Unlink
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      {run && (
        <p className="text-muted-foreground mt-4 text-xs">
          Latest run · model {run.model ?? "—"} · prompt v
          {run.prompt_version ?? "—"} · graph {run.graph_version ?? "—"} ·{" "}
          {run.input_tokens ?? 0}+{run.output_tokens ?? 0} tokens ·{" "}
          {run.latency_ms ?? 0}ms
        </p>
      )}
    </FadeIn>
  );
}
