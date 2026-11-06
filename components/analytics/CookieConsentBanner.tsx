"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, writeConsent } from "@/lib/analytics/consent";
import { clearAnalyticsCookies, isAnalyticsConfigured } from "@/lib/analytics/gtag";
import { useConsent } from "@/lib/analytics/use-consent";

/**
 * Runs while the server HTML is parsed, before the banner below it paints.
 * It marks `<html data-lf-consent="unset">` only when `readConsent` would
 * return `"unset"`, and the stylesheet keeps the server-rendered banner hidden
 * otherwise, so returning visitors never see it flash and a visitor without
 * JavaScript (who could not press its buttons) never sees it at all.
 */
const CONSENT_PREPAINT_SCRIPT = `(function(){var unset=true;try{var r=JSON.parse(localStorage.getItem(${JSON.stringify(
  CONSENT_STORAGE_KEY,
)})||"null");unset=!(r&&(r.decision==="granted"||r.decision==="denied")&&r.version===${CONSENT_VERSION});}catch(e){}if(unset)document.documentElement.setAttribute("data-lf-consent","unset");})();`;

/**
 * Opt-in cookie banner gating Google Analytics.
 *
 * Shown only when analytics is actually configured for the build and the
 * visitor has not decided yet. With no measurement ID there is nothing to
 * consent to, so asking would be a consent prompt that changes nothing.
 *
 * Accept and Decline carry equal visual weight (both `secondary`-weight
 * controls sized alike, same width, side by side in one row at every width):
 * a banner where refusing is harder to find than accepting is the pattern
 * GDPR enforcement actions target. Declining writes a decision so the banner
 * stays dismissed, and clears any GA cookie left from an earlier grant.
 *
 * Below `sm` (640px) this renders as a compact full-width bar flush to the
 * bottom edge (target height <= 118px at 390px wide) so the hero address
 * field and explore button remain visible. At `sm` and above it renders as a
 * centered card.
 *
 * The banner is in the server HTML so it paints with the page. A first-time
 * visitor sees it as soon as the page renders. It used to wait for hydration,
 * and that late paint made it the homepage's mobile Largest Contentful Paint.
 * While the snapshot is `"pending"` (server render and hydration) it carries
 * `data-pending` and the pre-paint script decides whether it shows. Once the
 * client has read storage it either unmounts or renders without the flag.
 */
export function CookieConsentBanner() {
  const consent = useConsent();

  if (!isAnalyticsConfigured()) return null;
  const pending = consent === "pending";
  if (!pending && consent !== "unset") return null;

  return (
    <>
      {pending ? (
        // The script must precede the banner so it runs before the banner paints.
        <script dangerouslySetInnerHTML={{ __html: CONSENT_PREPAINT_SCRIPT }} />
      ) : null}
      <div
        role="region"
        aria-label="Cookie consent"
        data-consent-banner=""
        data-pending={pending ? "" : undefined}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-index-toast) sm:px-4 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-none border-t border-lot-line bg-lot-chalk px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-none sm:flex-row sm:items-center sm:gap-6 sm:border sm:p-5">
          <p className="lf-caption flex-1 text-lot-stone">
            Allow Google Analytics and Google Ads cookies to measure how people find and use LotFoundry? Personalized ads stay off, and Google never gets your address, email, phone, or results.
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/privacy"
              className="inline-flex min-h-11 shrink-0 items-center lf-caption font-medium text-lot-orange-ink underline"
            >
              Privacy Policy
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:w-24 sm:flex-none"
              onClick={() => {
                clearAnalyticsCookies();
                writeConsent("denied");
              }}
            >
              Decline
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:w-24 sm:flex-none"
              onClick={() => writeConsent("granted")}
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
