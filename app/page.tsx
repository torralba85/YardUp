import type { Viewport } from "next";
import { Fraunces } from "next/font/google";
import Link from "next/link";
import { NocturneNav } from "@/components/landing/nocturne/NocturneNav";
import { BlueHourHero } from "@/components/landing/nocturne/BlueHourHero";
import { SignalLedger } from "@/components/landing/nocturne/SignalLedger";
import { OwnerPath } from "@/components/landing/nocturne/OwnerPath";
import { DuskShowcase } from "@/components/landing/nocturne/DuskShowcase";
import { CertificateSpecimen } from "@/components/landing/nocturne/CertificateSpecimen";
import { ClosingCall } from "@/components/landing/nocturne/ClosingCall";
import { ComingSoonBanner } from "@/components/landing/nocturne/ComingSoonBanner";

// The landing's display face. Loaded here (not in the root layout) so the
// studio and auth pages don't pay for it; exposed as --font-display-ln for
// the ln-* type roles in globals.css.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display-ln",
});

/** Landing browser chrome matches the dark marketing ground. */
export const viewport: Viewport = {
  themeColor: "#0A1120",
  viewportFit: "cover",
};

/**
 * Marketing landing page (`/`): scroll-scrub hero, numbers band, how-it-works,
 * showcase, certificate sample, closing CTA, and footer.
 */
export default function LandingPage() {
  return (
    <div data-theme="blue-hour" className={`${fraunces.variable} bg-ln-ink text-ln-mist`}>
      <NocturneNav />

      <main id="main-content">
        <BlueHourHero />
        <SignalLedger />
        <OwnerPath />
        <DuskShowcase />
        <CertificateSpecimen />
        <ClosingCall />
        <ComingSoonBanner />
      </main>

      <footer className="border-t border-ln-hairline/60">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lotfoundry-lockup-horizontal-inverse.svg"
              alt="LotFoundry"
              className="h-7 w-auto"
            />
            <p className="text-sm text-ln-slate">
              ADU planning for homeowners. Estimates only—not guarantees.
            </p>
            <nav
              aria-label="Site"
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ln-slate"
            >
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center transition-colors hover:text-ln-mist"
              >
                About
              </Link>
              <Link
                href="/help"
                className="inline-flex min-h-11 items-center transition-colors hover:text-ln-mist"
              >
                Help
              </Link>
              <Link
                href="/feedback"
                className="inline-flex min-h-11 items-center transition-colors hover:text-ln-mist"
              >
                Feedback
              </Link>
              <Link
                href="/terms"
                className="inline-flex min-h-11 items-center transition-colors hover:text-ln-mist"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center transition-colors hover:text-ln-mist"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
