import { BrandLockup } from "@/components/ui/BrandLockup";
import Link from "next/link";

/** Branded 404 recovery. */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center bg-lot-chalk px-6 py-16 text-center text-lot-ink"
    >
      <Link
        href="/"
        aria-label="LotFoundry home"
        className="mb-8 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
      >
        <BrandLockup className="h-8 w-auto" />
      </Link>
      <p className="lf-kicker text-lot-stone">404</p>
      <h1 className="lf-section-heading mt-3">Page not found</h1>
      <p className="lf-body-sm mx-auto mt-3 max-w-md text-lot-stone">
        That route does not exist. Head home, open the studio, or get help.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink"
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
  );
}
