import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureBand } from "@/components/landing/FeatureBand";
import { FloatingNavBar } from "@/components/FloatingNavBar";

export default function LandingPage() {
  return (
    <AmbientBackdrop>
      <FloatingNavBar />

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
