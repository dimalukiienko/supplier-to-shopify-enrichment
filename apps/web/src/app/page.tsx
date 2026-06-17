import Link from "next/link";
import type { BatchStatus } from "@repo/db";
import { bffFetch } from "@/lib/bff";
import { UploadForm } from "@/components/UploadForm";

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
    <main>
      <h1>Batches</h1>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Upload supplier CSV</h2>
        <UploadForm />
      </div>

      <div className="panel">
        {batches.length === 0 ? (
          <p className="muted">No batches yet — upload a CSV to get started.</p>
        ) : (
          batches.map((b) => (
            <div className="row" key={b.id}>
              <div>
                <Link href={`/batches/${b.id}`}>{b.name}</Link>
                <div className="muted">
                  {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`badge ${b.status}`}>{b.status}</span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
