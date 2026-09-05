"use client";

import { Button } from "@/components/ui/Button";
import { clearConsent, writeConsent } from "@/lib/analytics/consent";
import { clearAnalyticsCookies, isAnalyticsConfigured } from "@/lib/analytics/gtag";
import { useConsent } from "@/lib/analytics/use-consent";

const STATUS_LABEL: Record<string, string> = {
  granted: "Analytics cookies are on.",
  denied: "Analytics cookies are off.",
  unset: "You haven't chosen yet.",
};

/**
 * Lets a visitor read and change their analytics decision after the fact.
 *
 * Withdrawal has to be as easy as consent, so this mirrors the banner's two
 * choices on the privacy page rather than only offering a "reset" that
 * re-shows the banner. Turning analytics off also expires the GA cookies
 * already in the browser.
 *
 * Renders nothing when no measurement ID is configured — there are no
 * analytics cookies to have a preference about.
 */
export function CookiePreferences() {
  const consent = useConsent();

  if (!isAnalyticsConfigured()) return null;
  if (consent === "pending") return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="lf-caption text-lf-muted">{STATUS_LABEL[consent]}</p>
      <div className="flex shrink-0 gap-3">
        {/* Only a granted decision has anything to turn off; an undecided
            visitor is already untracked, so offering it would misdescribe state. */}
        {consent === "granted" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clearAnalyticsCookies();
              writeConsent("denied");
            }}
          >
            Turn off analytics
          </Button>
        )}
        {consent !== "granted" && (
          <Button variant="primary" size="sm" onClick={() => writeConsent("granted")}>
            Turn on analytics
          </Button>
        )}
        {consent !== "unset" && (
          <Button variant="ghost" size="sm" onClick={clearConsent}>
            Ask me again
          </Button>
        )}
      </div>
    </div>
  );
}
