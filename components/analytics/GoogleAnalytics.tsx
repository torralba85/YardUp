"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  disableAnalytics,
  getMeasurementId,
  isAnalyticsConfigured,
  pageview,
} from "@/lib/analytics/gtag";
import { initializeAnalytics, updateMeasurementConsent } from "@/lib/analytics/initialize";
import { isAnalyticsSuppressed, readConsent, subscribeToConsent } from "@/lib/analytics/consent";

/**
 * Sends a page view on the initial render and on every client-side navigation.
 *
 * Always sends only the clean pathname without query parameters or hash fragments,
 * ensuring no address queries or user search terms ever reach Google Analytics.
 */
function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let sent = false;
    let observer: MutationObserver | null = null;
    let fallbackTimer: number | null = null;

    const send = () => {
      if (sent) return;
      sent = true;
      observer?.disconnect();
      observer = null;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      pageview(pathname);
    };

    // Defer one macrotask so Next.js App Router finishes committing route
    // metadata. If `<title>` is briefly empty during streaming reconciliation,
    // wait up to 250ms for `<head>` to populate it before sending.
    const tickTimer = window.setTimeout(() => {
      if (document.title.trim()) {
        send();
        return;
      }
      if (typeof MutationObserver !== "undefined" && document.head) {
        observer = new MutationObserver(() => {
          if (document.title.trim()) send();
        });
        observer.observe(document.head, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
      fallbackTimer = window.setTimeout(send, 250);
    }, 0);

    return () => {
      sent = true;
      window.clearTimeout(tickTimer);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}

/** Loads GA with denied defaults; measurement cookies and the Ads destination require consent. */
export function GoogleAnalytics() {
  const suppressed = isAnalyticsSuppressed();
  const configured = isAnalyticsConfigured();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (suppressed) {
      disableAnalytics();
      return;
    }
    if (!configured) return;
    const consent = readConsent();
    if (window.gtag) {
      updateMeasurementConsent(consent);
    } else {
      initializeAnalytics(consent);
    }
    // Mount the external tag only after its defaults and safe URL context are queued.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    return subscribeToConsent(updateMeasurementConsent);
  }, [configured, suppressed]);

  if (!ready || !configured || suppressed) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${getMeasurementId()}`}
        strategy="afterInteractive"
        referrerPolicy="no-referrer"
      />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
