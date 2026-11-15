import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Shared A LOT MORE chrome for legal and support pages: {@link SiteHeader}
 * (home link and main menu), prose main, and {@link SiteFooter}.
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
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <SiteHeader
        actions={
          <Link
            href="/studio"
            // Legal/support pages are Firebase-free; don't prefetch the group.
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-lot-orange-ink motion-safe:transition hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            Open studio
          </Link>
        }
      />

      <main id="main-content" className="mx-auto max-w-prose px-6 py-16">
        <h1 className="lf-section-heading text-lot-ink">{title}</h1>
        {kicker ? <p className="lf-kicker mt-3 text-lot-stone">{kicker}</p> : null}
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
      <h2 className="lf-card-heading text-lot-ink">{title}</h2>
      <div className="lf-body mt-3 space-y-3 text-lot-stone">{children}</div>
    </section>
  );
}
