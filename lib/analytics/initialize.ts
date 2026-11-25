import type { ConsentState } from "./consent";
import { GOOGLE_ADS_ID } from "./adsConversion";
import {
  clearAnalyticsCookies,
  clearMeasurementSession,
  getMeasurementId,
  GTAG_READY_EVENT,
  measurementContext,
} from "./gtag";

const denied = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

const adsDisabled = `ga-disable-${GOOGLE_ADS_ID}`;

export function initializeAnalytics(consent: ConsentState): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // gtag.js expects an Arguments object in its command queue.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", denied);

  const flags = window as unknown as Record<string, boolean>;
  flags[adsDisabled] = true;
  delete flags[`ga-disable-${getMeasurementId()}`];
  window.gtag("js", new Date());
  window.gtag("config", getMeasurementId(), {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...measurementContext(),
  });
  updateMeasurementConsent(consent);
  window.dispatchEvent(new Event(GTAG_READY_EVENT));
}

export function updateMeasurementConsent(consent: ConsentState): void {
  if (!window.gtag) return;
  const flags = window as unknown as Record<string, boolean>;
  if (consent !== "granted") {
    const wasGranted = !flags[adsDisabled];
    flags[adsDisabled] = true;
    window.gtag("consent", "update", denied);
    if (wasGranted) {
      window.gtag("config", getMeasurementId(), {
        send_page_view: false,
        update: true,
        campaign_source: "",
        campaign_medium: "",
        campaign_name: "",
        campaign_content: "",
      });
    }
    clearAnalyticsCookies();
    clearMeasurementSession();
    return;
  }

  window.gtag("consent", "update", {
    ...denied,
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
  });
  if (flags[adsDisabled]) {
    delete flags[adsDisabled];
    const context = measurementContext();
    if (context.campaign_name) {
      window.gtag("config", getMeasurementId(), { send_page_view: false, update: true, ...context });
    }
    window.gtag("config", GOOGLE_ADS_ID, {
      send_page_view: false,
      ...context,
    });
  }
}
