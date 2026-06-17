import { bffFetch } from "@/lib/bff";
import { BatchLive } from "@/components/BatchLive";
import { BatchProducts, type ProductListItem } from "@/components/BatchProducts";
import { TrackedLink } from "@/components/TrackedLink";

export const dynamic = "force-dynamic";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const { products } = await bffFetch<{ products: ProductListItem[] }>(
    `/api/batches/${batchId}/products`,
  );

  return (
    <main>
      <p>
        <TrackedLink href="/">← Batches</TrackedLink>
      </p>
      <h1>Batch products</h1>
      <p className="muted">Status updates stream in live as the worker runs.</p>

      <BatchLive batchId={batchId} />

      <BatchProducts products={products} />
    </main>
  );
}
