import { BrandLockup } from "@/components/ui/BrandLockup";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared Golden Hour chrome for legal and support pages: brand header, prose
 * main, and {@link SiteFooter}.
 */
export function LegalPageShell({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-lf-sand text-lf-espresso">
      <header className="border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
          >
            <BrandLockup className="h-8 w-auto" />
          </Link>
          <Link
            href="/studio"
            // Legal/support pages are Firebase-free; don't prefetch the group.
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-control px-4 text-sm font-semibold text-lf-clay-ink motion-safe:transition hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
          >
            Open studio
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-prose px-6 py-16">
        <h1 className="lf-section-heading text-lf-espresso">{title}</h1>
        {kicker ? <p className="lf-kicker mt-3 text-lf-muted">{kicker}</p> : null}
        <div className="mt-10 space-y-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Standard section block for long-form legal copy. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="lf-card-heading text-lf-espresso">{title}</h2>
      <div className="lf-body mt-3 space-y-3 text-lf-muted">{children}</div>
    </section>
  );
}
