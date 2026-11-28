import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { AduStudioCta } from "@/components/adu/AduStudioCta";
import { GuideIndex } from "./GuideIndex";
import { SiteFooter } from "./SiteFooter";
import { PRIMARY_CTA_LABEL } from "@/lib/site-nav";

/** The aside's tool links; the page's own entry is left out (see `currentPath`). */
const TOOL_LINKS = [
  { href: "/sample-certificate/san-diego", label: "Sample Certificate of Feasibility", prefetch: false },
  { href: "/adu-cost-calculator", label: "California ADU cost calculator" },
  { href: "/adu/ca/san-diego/permits", label: "San Diego ADU permits by neighborhood" },
] as const;

/**
 * Shared A LOT MORE chrome for legal, support, and editorial pages: unified
 * public header, single-column prose or two-column editorial frame, and
 * {@link SiteFooter}.
 */
export function LegalPageShell({
  title,
  kicker,
  layout = "prose",
  lotCheck,
  lotHref = "/studio",
  facts = [["Guest address checks", 3], ["Lot preview", "3D"], ["Account required", "No"]],
  currentPath,
  children,
}: {
  title: string;
  kicker?: string;
  layout?: "prose" | "editorial";
  lotHref?: string;
  lotCheck?: { city: string; slug: string };
  facts?: [string, string | number][];
  /** This page's path, so the default aside never links to the page itself. */
  currentPath?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <SiteHeader showLotAction={layout !== "editorial"} />

      {layout === "editorial" ? (
        <main id="main-content" className="lf-editorial">
          <div className="border-b border-lot-line bg-lot-surface">
            <div className="mx-auto grid max-w-6xl items-center gap-5 px-5 py-7 sm:px-6 lg:grid-cols-[2fr_1fr] lg:gap-12 lg:py-12">
              <div className="min-w-0">
                {kicker && <p className="lf-kicker mb-3 text-lot-stone">{kicker}</p>}
                <h1 className="lf-section-heading text-balance break-words">{title}</h1>
              </div>
              <Image unoptimized src="/landing/a-lot-more/parcel-after-mobile.webp" width={768} height={512} alt="" className="h-32 w-full object-cover object-center sm:h-48 lg:h-auto" />
              <dl className="grid grid-cols-3 divide-x divide-lot-line border-y border-lot-line lg:col-span-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col-reverse justify-end px-2 py-3 first:pl-0 sm:px-5">
                    <dt className="text-xs leading-tight text-lot-stone">{label}</dt>
                    <dd className="mb-1 font-display text-xl leading-tight tabular-nums sm:text-3xl">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,65ch)_minmax(16rem,1fr)] lg:items-start lg:gap-12">
            <article id="guide-content" className="min-w-0 space-y-8 py-8 lg:py-12">
              <GuideIndex key={title} />
              {children}
            </article>
            <aside aria-label="Lot check and tools" className="lf-guide-rail sticky bottom-0 z-10 -mx-5 border-t border-lot-ink bg-lot-chalk px-5 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))] sm:-mx-6 lg:top-4 lg:mx-0 lg:mt-12 lg:border-t-2 lg:p-4">
              {lotCheck ? (
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-control bg-lot-orange px-4 font-semibold hover:bg-lot-orange-hover">
                    <span className="group-open:hidden">{PRIMARY_CTA_LABEL}</span><span className="hidden group-open:inline">Close lot check</span><ChevronDown size={18} aria-hidden="true" className="group-open:rotate-180" />
                  </summary>
                  <div className="max-h-[55dvh] overflow-y-auto overscroll-contain">
                    <AduStudioCta {...lotCheck} />
                  </div>
                </details>
              ) : (
                <Link href={lotHref} prefetch={false} className="flex min-h-11 items-center justify-between rounded-control bg-lot-orange px-4 font-semibold hover:bg-lot-orange-hover">
                  {PRIMARY_CTA_LABEL}<ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
              <nav aria-label="Quick planning tools" className="mt-4 hidden border-t border-lot-line pt-2 lg:block">
                {TOOL_LINKS.filter(link => link.href !== currentPath).map(link => (
                  <Link key={link.href} href={link.href} prefetch={false} className="flex min-h-11 items-center text-sm underline underline-offset-4">{link.label}</Link>
                ))}
              </nav>
            </aside>
          </div>
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
