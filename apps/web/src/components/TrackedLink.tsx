"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { startNavigationLoading } from "@/lib/navigation-loading-store";

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode;
  };

function hrefToPath(href: LinkProps["href"]) {
  if (typeof href === "string") return href;

  const pathname = href.pathname ?? "";
  const query =
    href.query && Object.keys(href.query).length > 0
      ? `?${new URLSearchParams(
          Object.entries(href.query).map(([key, value]) => [
            key,
            String(value ?? ""),
          ]),
        ).toString()}`
      : "";
  const hash = href.hash ? `#${href.hash}` : "";

  return `${pathname}${query}${hash}`;
}

function shouldTrackClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  currentPathname: string,
) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
    return false;
  }

  const target = event.currentTarget.target;
  if (target && target !== "_self") return false;
  if (event.currentTarget.hasAttribute("download")) return false;
  if (href.startsWith("#")) return false;

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return (
      url.pathname !== currentPathname || url.search !== window.location.search
    );
  } catch {
    return href !== currentPathname;
  }
}

export function TrackedLink({
  href,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  const pathname = usePathname();
  const hrefPath = hrefToPath(href);

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (shouldTrackClick(event, hrefPath, pathname)) {
          startNavigationLoading(hrefPath);
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
