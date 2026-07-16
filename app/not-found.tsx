import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/legal/SiteFooter";

export const metadata: Metadata = {
  title: "Page Not Found | LotFoundry",
};

/**
 * Branded 404 (Golden Hour): a surveyor's "no parcel on record here" note with
 * routes back to the pages that matter — home, the studio, and help.
 */
export default function NotFound() {
  return (
    <div className="lf-grain flex min-h-dvh flex-col bg-lf-sand text-lf-espresso">
      <main id="main-content" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="lf-kicker text-lf-clay">Error 404</p>
        <h1 className="lf-section-heading mt-2">No parcel on record here.</h1>
        <p className="lf-body mt-4 max-w-prose text-lf-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. Your
          saved concepts are safe — pick a route back below.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-lf-clay px-5 text-sm font-semibold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
          >
            Back to home
          </Link>
          <Link
            href="/studio"
            className="inline-flex h-11 items-center justify-center rounded-full border border-lf-hairline bg-lf-card px-5 text-sm font-semibold text-lf-espresso transition hover:border-lf-taupe/50 hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
          >
            Start a feasibility study
          </Link>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center text-sm font-medium text-lf-clay transition-colors hover:text-lf-mahogany focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-sand"
          >
            Get help
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
