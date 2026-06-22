import { bffFetch } from "@/lib/bff";
import { BatchLive } from "@/components/BatchLive";
import { BatchProducts, type ProductListItem } from "@/components/BatchProducts";
import { TrackedLink } from "@/components/TrackedLink";
import { FadeIn } from "@/components/motion/FadeIn";

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
    <FadeIn>
      <p className="mb-2">
        <TrackedLink
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Batches
        </TrackedLink>
      </p>
      <h1 className="text-foreground mb-2 text-xl font-semibold">
        Batch products
      </h1>
      <p className="text-muted-foreground mb-4">
        Status updates stream in live as the worker runs.
      </p>

      <BatchLive batchId={batchId} />

      <BatchProducts products={products} />
    </FadeIn>
  );
}
