import Link from "next/link";
import { DawnStudioLink } from "./DawnStudioLink";

/**
 * Landing top navigation for the Blue Hour theme: a fixed glass bar over the
 * night hero. Deliberately static (no scroll morph) — the hero carries the
 * page's motion budget.
 */
export function NocturneNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-(--z-index-nav) border-b border-ln-hairline/40 bg-ln-ink/55 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="LotFoundry home" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lotfoundry-lockup-horizontal-inverse.svg"
            alt="LotFoundry"
            className="h-4 w-auto min-[360px]:h-5 sm:h-7"
          />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary">
          <Link
            href="/login"
            className="hidden min-h-11 items-center whitespace-nowrap rounded-full px-3 text-xs font-medium text-ln-mist transition-colors hover:bg-ln-mist/10 min-[360px]:inline-flex sm:px-4 sm:text-sm"
          >
            Sign in
          </Link>
          <DawnStudioLink
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-ln-glow px-4 text-xs font-semibold text-ln-ink transition-colors duration-300 hover:bg-ln-mist active:scale-[0.98] sm:px-5 sm:text-sm"
          >
            <span className="sm:hidden">Check address</span>
            <span className="hidden sm:inline">Check my address</span>
          </DawnStudioLink>
        </nav>
      </div>
    </header>
  );
}
