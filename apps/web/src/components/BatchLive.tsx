"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";

/**
 * Subscribes to Supabase Realtime on `products` for this batch and refreshes the
 * server-rendered list whenever a product's status changes — the documented
 * live-update mechanism (docs/ARCHITECTURE.md §4). This is the one place the
 * browser talks to Supabase directly (anon key, read-only via RLS).
 */
export function BatchLive({ batchId }: { batchId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`batch-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `batch_id=eq.${batchId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [batchId, router]);

  return null;
}
