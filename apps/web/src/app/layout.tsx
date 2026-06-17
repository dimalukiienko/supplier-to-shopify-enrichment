import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Supplier → Shopify Enrichment",
  description: "Reviewer workspace for AI-enriched supplier products",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            Supplier → Shopify
          </Link>
          <Link href="/">Batches</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
