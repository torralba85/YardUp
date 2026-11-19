import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "./PublicHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared A LOT MORE chrome for legal, support, and editorial pages: unified
 * public header, single-column prose or two-column editorial frame, and
 * {@link SiteFooter}.
 */
export function LegalPageShell({
  title,
  kicker,
  layout = "prose",
  aside,
  children,
}: {
  title: string;
  kicker?: string;
  layout?: "prose" | "editorial";
  aside?: ReactNode;
  children: ReactNode;
}) {
  const useTwoColumn = layout === "editorial" || Boolean(aside);
  const resolvedAside = aside ?? (
    <aside aria-label="Lot check and tools" className="space-y-6 lg:sticky lg:top-8">
      <div className="border border-lot-line bg-lot-surface p-5">
        <p className="lf-kicker text-lot-orange-ink">Free lot check</p>
        <h2 className="lf-card-heading mt-2 text-lot-ink">Test your address in 3D</h2>
        <p className="mt-2 text-sm leading-6 text-lot-ink">
          Check parcel boundaries, modeled setbacks, build cost, and rental potential for up to 3 addresses with no account.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Link
            href="/studio"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-lot-orange px-4 py-2.5 text-sm font-semibold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            <span>Open 3D studio</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link
            href="/can-i-build-a-backyard-home"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-lot-stone bg-lot-chalk px-4 py-2.5 text-sm font-semibold text-lot-ink hover:border-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            Take 60-second lot quiz
          </Link>
        </div>
      </div>
      <nav aria-label="Quick planning tools" className="border-t border-lot-line pt-4">
        <p className="lf-kicker-dense text-lot-stone">Tools &amp; examples</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/sample-certificate/san-diego" prefetch={false} className="inline-flex min-h-11 items-center font-medium text-lot-ink underline underline-offset-4 hover:text-lot-orange-ink">
              Sample Certificate of Feasibility
            </Link>
          </li>
          <li>
            <Link href="/adu-cost-calculator" className="inline-flex min-h-11 items-center font-medium text-lot-ink underline underline-offset-4 hover:text-lot-orange-ink">
              California ADU cost calculator
            </Link>
          </li>
          <li>
            <Link href="/adu/ca/san-diego/permits" className="inline-flex min-h-11 items-center font-medium text-lot-ink underline underline-offset-4 hover:text-lot-orange-ink">
              San Diego ADU permits by neighborhood
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );

  return (
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <PublicHeader />

      {useTwoColumn ? (
        <main
          id="main-content"
          className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:grid lg:grid-cols-[minmax(0,65ch)_minmax(16rem,1fr)] lg:items-start lg:gap-12 lg:py-14"
        >
          <div className="min-w-0">
            <h1 className="lf-section-heading break-words text-lot-ink">{title}</h1>
            {kicker ? <p className="lf-kicker mt-3 text-lot-stone">{kicker}</p> : null}
            <div className="mt-8 space-y-8">{children}</div>
          </div>
          <div className="mt-12 min-w-0 lg:mt-0">{resolvedAside}</div>
        </main>
      ) : (
        <main id="main-content" className="mx-auto max-w-prose px-6 py-16">
          <h1 className="lf-section-heading text-lot-ink">{title}</h1>
          {kicker ? <p className="lf-kicker mt-3 text-lot-stone">{kicker}</p> : null}
          <div className="mt-10 space-y-8">{children}</div>
        </main>
      )}

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
      <div className="lf-body mt-3 space-y-3 text-lot-ink">{children}</div>
    </section>
  );
}
