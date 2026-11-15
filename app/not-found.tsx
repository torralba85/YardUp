import { SiteHeader } from "@/components/legal/SiteHeader";
import Link from "next/link";

/** Branded 404 recovery. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-lot-chalk text-lot-ink">
      <SiteHeader />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      >
        <p className="lf-kicker text-lot-stone">404</p>
        <h1 className="lf-section-heading mt-3">Page not found</h1>
        <p className="lf-body-sm mx-auto mt-3 max-w-md text-lot-stone">
          That route does not exist. Head home, open the studio, or get help.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-chalk"
          >
            Home
          </Link>
          <Link
            href="/studio"
            prefetch={false}
            className="inline-flex h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-5 text-sm font-semibold text-lot-ink"
          >
            Start a feasibility study
          </Link>
          <Link
            href="/help"
            className="inline-flex h-11 items-center rounded-control px-5 text-sm font-semibold text-lot-orange-ink"
          >
            Get help
          </Link>
        </div>
      </main>
    </div>
  );
}
