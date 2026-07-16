import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

/** Props for {@link LegalPageShell}. */
export interface LegalPageShellProps {
  /** The page H1. */
  title: string;
  /** Optional mono kicker under the title (e.g. "Last updated: July 13, 2026"). */
  kicker?: string;
  /** Page body content. */
  children: ReactNode;
}

/**
 * Shared Golden Hour shell for public legal/support pages (`/privacy`,
 * `/terms`, `/about`, `/help`, `/feedback`, `/delete-account`): brand header
 * with the real lockup, a prose-width main column, and the shared
 * {@link SiteFooter}. Replaces the per-page header/footer markup that had
 * drifted (text-tile logos, footers missing support links).
 */
export function LegalPageShell({ title, kicker, children }: LegalPageShellProps) {
  return (
    <div className="lf-grain min-h-dvh bg-lf-sand text-lf-espresso">
      <header className="border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-prose px-6 py-16">
        <h1 className="lf-section-heading text-lf-espresso">{title}</h1>
        {kicker ? <p className="lf-kicker mt-3 text-lf-muted">{kicker}</p> : null}
        <div className="mt-10 space-y-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** A titled prose section inside a {@link LegalPageShell}. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold leading-snug text-lf-espresso">{title}</h2>
      <div className="lf-body mt-3 space-y-3 text-lf-muted">{children}</div>
    </section>
  );
}
