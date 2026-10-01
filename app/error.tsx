"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

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
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center bg-lf-sand px-6 py-16 text-center text-lf-espresso"
    >
      <h1 className="lf-section-heading">Something went wrong</h1>
      <p className="lf-body-sm mx-auto mt-3 max-w-md text-lf-muted">
        We hit an unexpected error. Try again, or visit Help if it keeps happening.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="commit" onClick={reset}>
          Retry
        </Button>
        <Link
          href="/help"
          className="inline-flex h-11 items-center rounded-control border border-lf-hairline bg-lf-card px-5 text-sm font-semibold text-lf-espresso"
        >
          Get help
        </Link>
      </div>
    </main>
  );
}
