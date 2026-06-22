import type { BatchStatus } from "@repo/db";
import { bffFetch } from "@/lib/bff";
import { TrackedLink } from "@/components/TrackedLink";
import { UploadForm } from "@/components/UploadForm";
import { FadeIn } from "@/components/motion/FadeIn";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

type BatchListItem = {
  id: string;
  name: string;
  status: BatchStatus;
  source_format: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { batches } = await bffFetch<{ batches: BatchListItem[] }>(
    "/api/batches",
  );

  return (
    <FadeIn>
      <h1 className="text-foreground mb-4 text-xl font-semibold">Batches</h1>

      <Card className="mb-4 gap-3 p-4">
        <h2 className="text-foreground text-base font-semibold">
          Upload supplier CSV
        </h2>
        <UploadForm />
      </Card>

      <Card className="px-4 py-0">
        {batches.length === 0 ? (
          <p className="text-muted-foreground py-4">
            No batches yet — upload a CSV to get started.
          </p>
        ) : (
          batches.map((b) => (
            <div
              className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
              key={b.id}
            >
              <div>
                <TrackedLink
                  href={`/batches/${b.id}`}
                  className="text-primary font-medium hover:underline"
                >
                  {b.name}
                </TrackedLink>
                <div className="text-muted-foreground text-sm">
                  {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))
        )}
      </Card>
    </FadeIn>
  );
}
