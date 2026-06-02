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
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-taupe/10"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-lf-mahogany px-4 py-2 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Estimate my lot
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
