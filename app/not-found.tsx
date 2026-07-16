import Link from "next/link";

/** Branded 404 recovery. */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center bg-lf-sand px-6 py-16 text-center text-lf-espresso"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lotfoundry-lockup-horizontal.svg"
        alt="LotFoundry"
        className="mb-8 h-8 w-auto"
      />
      <p className="lf-kicker text-lf-muted">404</p>
      <h1 className="lf-section-heading mt-3">Page not found</h1>
      <p className="lf-body-sm mx-auto mt-3 max-w-md text-lf-muted">
        That route does not exist. Head home, open the studio, or get help.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-lf-clay px-5 text-sm font-semibold text-lf-sand"
        >
          Home
        </Link>
        <Link
          href="/studio"
          className="inline-flex h-11 items-center rounded-full border border-lf-hairline bg-lf-card px-5 text-sm font-semibold text-lf-espresso"
        >
          Start a feasibility study
        </Link>
        <Link
          href="/help"
          className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold text-lf-clay"
        >
          Get help
        </Link>
      </div>
    </main>
  );
}
