"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";

/**
 * Realtime for the product review workspace: refreshes when this product's
 * enriched_fields land or its status changes, so AI fields stream in live
 * (docs/ARCHITECTURE.md §2, §4).
 */
export function ReviewLive({ productId }: { productId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`review-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enriched_fields",
          filter: `product_id=eq.${productId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${productId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [productId, router]);

  return null;
}
