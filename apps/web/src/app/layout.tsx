import type { ReactNode } from "react";

export const metadata = {
  title: "Supplier → Shopify Enrichment",
  description: "Reviewer workspace for AI-enriched supplier products",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
