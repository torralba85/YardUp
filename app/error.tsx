"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/legal/SiteHeader";

/** Route-level error recovery with retry. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col bg-lot-chalk text-lot-ink">
      <SiteHeader />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      >
        <h1 className="lf-section-heading">Something went wrong</h1>
        <p className="lf-body-sm mx-auto mt-3 max-w-md text-lot-stone">
          We hit an unexpected error. Try again, head home, or visit Help if it keeps happening.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="commit" onClick={reset}>
            Retry
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-5 text-sm font-semibold text-lot-ink"
          >
            Home
          </Link>
          <Link
            href="/help"
            className="inline-flex h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-5 text-sm font-semibold text-lot-ink"
          >
            Get help
          </Link>
        </div>
      </main>
    </div>
  );
}
