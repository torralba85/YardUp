"use client";

import { CookieConsentBanner } from "@/components/analytics/CookieConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { usePathname } from "next/navigation";

/**
 * Site-wide analytics surface: the consent banner plus the GA4 tag it gates.
 *
 * Mounted once in the root layout. Both halves render nothing unless
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, so builds without it — local dev, and
 * production until the ID is added to CI secrets — are completely unaffected.
 */
export function Analytics() {
  const pathname = usePathname();
  // A private layout URL contains a bearer token. Never load third-party analytics here.
  if (pathname?.startsWith("/layout/")) return null;
  return (
    <>
      <GoogleAnalytics />
      <CookieConsentBanner />
    </>
  );
}
