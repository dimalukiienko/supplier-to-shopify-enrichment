import type { ProductStatus } from "@repo/db";
import { bffFetch } from "@/lib/bff";
import { BatchLive } from "@/components/BatchLive";
import { RetryButton } from "@/components/RetryButton";
import { TrackedLink } from "@/components/TrackedLink";

type ProductListItem = {
  id: string;
  status: ProductStatus;
  created_at: string;
  variant_count: number;
  title: string | null;
};

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

      <div className="panel">
        {products.length === 0 ? (
          <p className="muted">
            No products yet — clustering runs first, then products appear here.
          </p>
        ) : (
          products.map((p) => (
            <div className="row" key={p.id}>
              <div>
                <TrackedLink href={`/products/${p.id}`}>
                  {p.title ?? <span className="muted">Untitled product</span>}
                </TrackedLink>
                <div className="muted">{p.variant_count} variant(s)</div>
              </div>
              <div className="actions">
                {p.status === "queued" || p.status === "enriching" ? (
                  <RetryButton productId={p.id} />
                ) : null}
                <span className={`badge ${p.status}`}>{p.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
