"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Branded route-level error boundary (Golden Hour): logs the error once,
 * offers Retry and Get help, and keeps a usable document shell.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="lf-grain flex min-h-dvh flex-col bg-lf-sand text-lf-espresso">
      <main id="main-content" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="lf-kicker text-lf-brick">Something broke</p>
        <h1 className="lf-section-heading mt-2">This page hit an error.</h1>
        <p className="lf-body mt-4 max-w-prose text-lf-muted">
          Your saved concepts are safe. Try the page again — if it keeps failing,
          tell us and we&rsquo;ll dig in.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-full bg-lf-clay px-5 text-sm font-semibold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center text-sm font-medium text-lf-clay transition-colors hover:text-lf-mahogany focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-sand"
          >
            Get help
          </Link>
        </div>
      </main>
    </div>
  );
}
