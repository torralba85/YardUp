"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { writeConsent } from "@/lib/analytics/consent";
import { clearAnalyticsCookies, isAnalyticsConfigured } from "@/lib/analytics/gtag";
import { useConsent } from "@/lib/analytics/use-consent";

/**
 * Opt-in cookie banner gating Google Analytics.
 *
 * Shown only when analytics is actually configured for the build and the
 * visitor has not decided yet. With no measurement ID there is nothing to
 * consent to, so asking would be a consent prompt that changes nothing.
 *
 * Accept and Decline carry equal visual weight (both `secondary`-weight
 * controls sized alike): a banner where refusing is harder to find than
 * accepting is the pattern GDPR enforcement actions target. Declining writes a
 * decision so the banner stays dismissed, and clears any GA cookie left from
 * an earlier grant.
 *
 * Per DESIGN.md this is a read-only content frame, so the card stays
 * rectangular (`rounded-lg`) while the controls inside are pills.
 */
export function CookieConsentBanner() {
  const consent = useConsent();

  if (!isAnalyticsConfigured()) return null;
  // "pending" covers SSR and hydration; only "unset" means genuinely undecided.
  if (consent !== "unset") return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-(--z-index-toast) px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-lf-hairline bg-lf-card p-5 shadow-lg sm:flex-row sm:items-center sm:gap-6">
        <p className="lf-caption flex-1 text-lf-muted">
          We&rsquo;d like to use Google Analytics to understand which parts of LotFoundry
          people actually use. It sets cookies in your browser. We never send your address,
          email, or feasibility results to Google. Read our{" "}
          <Link href="/privacy" className="font-medium text-lf-clay-ink underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="sm:w-auto"
            onClick={() => {
              clearAnalyticsCookies();
              writeConsent("denied");
            }}
          >
            Decline
          </Button>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            className="sm:w-auto"
            onClick={() => writeConsent("granted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
