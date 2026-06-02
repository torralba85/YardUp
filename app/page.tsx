import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureBand } from "@/components/landing/FeatureBand";

export default function LandingPage() {
  return (
    <AmbientBackdrop>
      <header className="relative z-20 border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="LotFoundry home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto md:h-8" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-lf-muted lg:flex" aria-label="Primary">
            <a href="#how-it-works" className="transition-colors hover:text-lf-espresso">How it works</a>
            <a href="#start" className="transition-colors hover:text-lf-espresso">Start</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-md px-4 py-2 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-taupe/10 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-lf-mahogany px-3 py-2 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-clay sm:px-4"
            >
              <span className="sm:hidden">Estimate</span>
              <span className="hidden sm:inline">Estimate my lot</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <LandingHero />
        <FeatureBand />
      </main>

      <footer className="relative z-20 border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto" />
            <p className="text-sm text-lf-muted">A foundry for lots. Estimates, not guarantees.</p>
            <div className="flex items-center gap-4 text-sm text-lf-muted">
              <Link href="/terms" className="transition-colors hover:text-lf-espresso">Terms</Link>
              <Link href="/privacy" className="transition-colors hover:text-lf-espresso">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </AmbientBackdrop>
  );
}
