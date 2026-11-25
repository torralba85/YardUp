"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { PRIMARY_CTA_LABEL, SITE_NAV_LINKS } from "@/lib/site-nav";

/**
 * Shared Firebase-free public header used across editorial guides, calculators,
 * legal pages, and the backyard-home quiz funnel. Collapses cleanly into a
 * single 64px row with a mobile drawer below `md` (768px).
 */
export function PublicHeader({
  studioHref = "/studio",
  studioLabel = PRIMARY_CTA_LABEL,
}: {
  studioHref?: string;
  studioLabel?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="relative z-(--z-index-header) border-b border-lot-line bg-lot-chalk">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          aria-label="LotFoundry home"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          <BrandLockup className="h-5 w-auto min-[360px]:h-6 sm:h-8" />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-5 md:flex"
        >
          {SITE_NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm font-medium text-lot-ink motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            prefetch={false}
            className="hidden min-h-11 items-center rounded-control px-2.5 text-sm font-medium text-lot-ink hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink md:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={studioHref}
            prefetch={false}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control bg-lot-orange px-2.5 py-2 text-xs font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink sm:px-3.5 sm:text-sm"
          >
            <span>{studioLabel}</span>
            <ArrowRight className="hidden h-4 w-4 min-[360px]:inline" aria-hidden="true" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-nav"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-lot-line text-lot-ink hover:border-lot-stone md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="public-mobile-nav"
          aria-label="Mobile navigation"
          className="border-t border-lot-line bg-lot-chalk px-5 py-3 md:hidden"
        >
          <ul className="divide-y divide-lot-line">
            {SITE_NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center justify-between py-2 text-sm font-medium text-lot-ink hover:text-lot-orange-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center justify-between py-2 text-sm font-medium text-lot-ink hover:text-lot-orange-ink"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
