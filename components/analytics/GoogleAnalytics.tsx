"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { getMeasurementId, isAnalyticsConfigured, pageview } from "@/lib/analytics/gtag";
import { GOOGLE_ADS_ID } from "@/lib/analytics/adsConversion";
import { useConsent } from "@/lib/analytics/use-consent";

/**
 * Sends a page view on the initial render and on every client-side navigation.
 *
 * Split out so the `useSearchParams` call sits inside a `Suspense` boundary:
 * reading search params opts a subtree out of static rendering, and without the
 * boundary that would deopt every prerendered page in the app.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    pageview(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Loads Google Analytics 4 plus the Google Ads account (purchase-conversion measurement) — but only with a measurement ID configured *and*
 * consent granted.
 *
 * Consent is opt-in (see `components/analytics/CookieConsentBanner.tsx`), so
 * this renders nothing at all until the visitor accepts: no script tag, no
 * network request to Google, no `_ga` cookie. Declining or ignoring the banner
 * leaves the page exactly as it is without analytics.
 *
 * Revoking consent stops all further collection immediately, because the
 * component unmounts the tag and `pageview()` no-ops without `window.gtag`.
 * Already-set cookies are cleared by `clearAnalyticsCookies()` in the banner.
 */
export function GoogleAnalytics() {
  const consent = useConsent();
  const measurementId = getMeasurementId();

  if (!isAnalyticsConfigured()) return null;
  if (consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="lf-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            anonymize_ip: true
          });
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
