import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as gtag from "./gtag";
import * as consent from "./consent";
import {
  extractStateCode,
  getAduSqftBucket,
  getBuilderMatchBucket,
  getLatencyBucket,
  getLotSizeBucket,
  getMatchReasonCountBucket,
  getProjectValueBucket,
  mapFeasibilityVerdict,
  mapParcelSource,
  mapPurchaseChannel,
  recordAddressSearchSubmission,
  startParcelLookupTracking,
  trackAddressSearchSubmitted,
  trackAduDesignCommitted,
  trackBuilderConnectionSubmitted,
  trackBuilderLeadPreviewViewed,
  trackBuilderLeadUnlocked,
  trackBuilderMatchesViewed,
  trackBuilderUnlockCheckoutStarted,
  trackCertificateCheckoutCancelled,
  trackCertificatePassRedeemed,
  trackCertificateCheckoutRedirected,
  trackCertificateCheckoutStarted,
  trackCertificatePaywallViewed,
  trackCertificatePurchase,
  trackFeasibilityResultViewed,
  trackLotAnswerOpenStudio,
  trackLotAnswerViewed,
  trackParcelLookupCompleted,
  trackPreapprovedPlanSelected,
  trackReportExported,
  trackReportOpened,
  trackScenarioSaved,
  trackStudioOpened,
} from "./events";

describe("analytics events module", () => {
  let trackEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    trackEventSpy = vi.spyOn(gtag, "trackEvent").mockImplementation(() => {});
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  describe("bucket and mapping helpers", () => {
    it("buckets lot size correctly", () => {
      expect(getLotSizeBucket(undefined)).toBeUndefined();
      expect(getLotSizeBucket(-10)).toBeUndefined();
      expect(getLotSizeBucket(2500)).toBe("under_3000");
      expect(getLotSizeBucket(3000)).toBe("3000_4999");
      expect(getLotSizeBucket(4999)).toBe("3000_4999");
      expect(getLotSizeBucket(5000)).toBe("5000_7499");
      expect(getLotSizeBucket(7500)).toBe("7500_9999");
      expect(getLotSizeBucket(10000)).toBe("10000_plus");
      expect(getLotSizeBucket(25000)).toBe("10000_plus");
    });

    it("buckets ADU square footage correctly", () => {
      expect(getAduSqftBucket(undefined)).toBeUndefined();
      expect(getAduSqftBucket(350)).toBe("under_400");
      expect(getAduSqftBucket(400)).toBe("400_599");
      expect(getAduSqftBucket(600)).toBe("600_799");
      expect(getAduSqftBucket(800)).toBe("800_999");
      expect(getAduSqftBucket(1000)).toBe("1000_plus");
      expect(getAduSqftBucket(1200)).toBe("1000_plus");
    });

    it("buckets lookup latency correctly", () => {
      expect(getLatencyBucket(undefined)).toBe("unknown");
      expect(getLatencyBucket(200)).toBe("under_500ms");
      expect(getLatencyBucket(500)).toBe("500_1499ms");
      expect(getLatencyBucket(1500)).toBe("1500_2999ms");
      expect(getLatencyBucket(3000)).toBe("3000_9999ms");
      expect(getLatencyBucket(12000)).toBe("10000ms_plus");
    });

    it("buckets builder match count correctly", () => {
      expect(getBuilderMatchBucket(0)).toBe("none");
      expect(getBuilderMatchBucket(undefined)).toBe("none");
      expect(getBuilderMatchBucket(1)).toBe("one");
      expect(getBuilderMatchBucket(2)).toBe("two_three");
      expect(getBuilderMatchBucket(3)).toBe("two_three");
      expect(getBuilderMatchBucket(4)).toBe("four_plus");
      expect(getBuilderMatchBucket(10)).toBe("four_plus");
    });

    it("buckets match reason count correctly", () => {
      expect(getMatchReasonCountBucket(0)).toBe("none");
      expect(getMatchReasonCountBucket(1)).toBe("one");
      expect(getMatchReasonCountBucket(3)).toBe("two_three");
      expect(getMatchReasonCountBucket(5)).toBe("four_plus");
    });

    it("buckets project value correctly", () => {
      expect(getProjectValueBucket(undefined)).toBe("unknown");
      expect(getProjectValueBucket(75000)).toBe("under_100000");
      expect(getProjectValueBucket(150000)).toBe("100000_199999");
      expect(getProjectValueBucket(250000)).toBe("200000_299999");
      expect(getProjectValueBucket(350000)).toBe("300000_499999");
      expect(getProjectValueBucket(600000)).toBe("500000_plus");
    });

    it("maps feasibility verdict to status", () => {
      expect(mapFeasibilityVerdict("Likely Feasible")).toBe("eligible");
      // Raw zoning status is not a rendered verdict: callers pass summarizeFeasibility().verdict.
      expect(mapFeasibilityVerdict("Compliant")).toBe("unknown");
      expect(mapFeasibilityVerdict("Needs Review")).toBe("review_needed");
      expect(mapFeasibilityVerdict("Unlikely")).toBe("blocked");
      expect(mapFeasibilityVerdict(undefined)).toBe("unknown");
      expect(mapFeasibilityVerdict("Other")).toBe("unknown");
    });

    it("maps purchase channel correctly", () => {
      expect(mapPurchaseChannel("web")).toBe("web_stripe");
      expect(mapPurchaseChannel("app-store")).toBe("ios_storekit");
      expect(mapPurchaseChannel("google-play")).toBe("android_play");
      expect(mapPurchaseChannel(undefined)).toBe("web_stripe");
    });

    it("normalizes parcel source correctly", () => {
      expect(mapParcelSource("regrid")).toBe("regrid");
      expect(mapParcelSource("county-gis")).toBe("county_gis");
      expect(mapParcelSource("county_gis")).toBe("county_gis");
      expect(mapParcelSource("fallback")).toBe("fallback");
      expect(mapParcelSource("estimated")).toBe("estimated");
      expect(mapParcelSource("preset")).toBe("preset");
      expect(mapParcelSource("unknown-provider")).toBe("unknown");
      expect(mapParcelSource(undefined)).toBe("unknown");
    });
  });

  describe("event emitters", () => {
    it("emits studio_opened with bounded params", () => {
      trackStudioOpened({
        device_mode: "desktop",
        auth_state: "guest",
        parcel_mode: "preset",
        entry_source: "landing_cta",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("studio_opened", {
        app_surface: "studio",
        device_mode: "desktop",
        auth_state: "guest",
        parcel_mode: "preset",
        entry_source: "landing_cta",
      });
    });

    it("emits address_search_submitted without search query", () => {
      trackAddressSearchSubmitted({
        search_mode: "places",
        auth_state: "signed_in",
        device_mode: "mobile",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("address_search_submitted", {
        search_mode: "places",
        auth_state: "signed_in",
        device_mode: "mobile",
      });
    });

    it("emits parcel_lookup_completed with latency bucket", () => {
      trackParcelLookupCompleted({
        result: "success",
        parcel_mode: "live",
        parcel_source: "regrid",
        auth_state: "guest",
        state_code: "WA",
        latency_bucket: "500_1499ms",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("parcel_lookup_completed", {
        result: "success",
        parcel_mode: "live",
        parcel_source: "regrid",
        auth_state: "guest",
        state_code: "WA",
        latency_bucket: "500_1499ms",
      });
    });

    it("emits feasibility_result_viewed with buckets", () => {
      trackFeasibilityResultViewed({
        parcel_mode: "live",
        parcel_source: "regrid",
        feasibility_status: "eligible",
        lot_size_bucket: "5000_7499",
        adu_sqft_bucket: "600_799",
        auth_state: "guest",
        state_code: "CA",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("feasibility_result_viewed", {
        parcel_mode: "live",
        parcel_source: "regrid",
        feasibility_status: "eligible",
        lot_size_bucket: "5000_7499",
        adu_sqft_bucket: "600_799",
        auth_state: "guest",
        state_code: "CA",
      });
    });

    it("emits adu_design_committed", () => {
      trackAduDesignCommitted({
        adu_sqft_bucket: "800_999",
        roof_style: "gable",
        finish: "cedar",
        feasibility_status: "eligible",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("adu_design_committed", {
        adu_sqft_bucket: "800_999",
        roof_style: "gable",
        finish: "cedar",
        feasibility_status: "eligible",
      });
    });

    it("emits preapproved_plan_selected with catalog slugs only", () => {
      trackPreapprovedPlanSelected({
        jurisdiction_id: "ca-carlsbad",
        plan_id: "carlsbad-studio-400",
        parcel_mode: "live",
        placement_outcome: "moved",
        auth_state: "guest",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("preapproved_plan_selected", {
        jurisdiction_id: "ca-carlsbad",
        plan_id: "carlsbad-studio-400",
        parcel_mode: "live",
        placement_outcome: "moved",
        auth_state: "guest",
      });
    });

    it("drops preapproved_plan_selected when an ID is not a catalog slug", () => {
      trackPreapprovedPlanSelected({
        jurisdiction_id: "123 Main St, San Diego",
        plan_id: "carlsbad-studio-400",
        parcel_mode: "live",
        placement_outcome: "kept",
        auth_state: "guest",
      });
      expect(trackEventSpy).not.toHaveBeenCalled();
    });

    it("emits scenario_saved", () => {
      trackScenarioSaved({
        parcel_mode: "live",
        feasibility_status: "eligible",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("scenario_saved", {
        parcel_mode: "live",
        feasibility_status: "eligible",
      });
    });

    it("emits report_opened and report_exported", () => {
      trackReportOpened({
        feasibility_status: "eligible",
        has_ai_brief: true,
        auth_state: "signed_in",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("report_opened", {
        feasibility_status: "eligible",
        has_ai_brief: true,
        auth_state: "signed_in",
      });

      trackReportExported({
        report_format: "print",
        feasibility_status: "eligible",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("report_exported", {
        report_format: "print",
        feasibility_status: "eligible",
      });
    });

    it("emits certificate_paywall_viewed and certificate_checkout_started", () => {
      trackCertificatePaywallViewed({
        auth_state: "guest",
        feasibility_status: "review_needed",
        purchase_channel: "web_stripe",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("certificate_paywall_viewed", {
        auth_state: "guest",
        feasibility_status: "review_needed",
        purchase_channel: "web_stripe",
      });

      trackCertificateCheckoutStarted({
        value: 49,
        currency: "USD",
        purchase_channel: "web_stripe",
        feasibility_status: "review_needed",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("certificate_checkout_started", {
        value: 49,
        currency: "USD",
        purchase_channel: "web_stripe",
        feasibility_status: "review_needed",
      });
    });

    it("emits certificate_checkout_redirected with bounded parameters only", () => {
      trackCertificateCheckoutRedirected({
        value: 29,
        currency: "USD",
        purchase_channel: "web_stripe",
        feasibility_status: "eligible",
        // A caller smuggling identifiers past the type must not reach GA4.
        ...({ email: "buyer@example.com", certKey: "lot-1" } as object),
      });

      expect(trackEventSpy).toHaveBeenCalledWith("certificate_checkout_redirected", {
        value: 29,
        currency: "USD",
        purchase_channel: "web_stripe",
        feasibility_status: "eligible",
      });
    });

    it("omits value and currency from certificate_checkout_redirected when the value is unknown", () => {
      trackCertificateCheckoutRedirected({
        purchase_channel: "web_stripe",
        feasibility_status: "unknown",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("certificate_checkout_redirected", {
        purchase_channel: "web_stripe",
        feasibility_status: "unknown",
      });
    });

    it("emits certificate_checkout_cancelled with bounded parameters only", () => {
      trackCertificateCheckoutCancelled({
        purchase_channel: "web_stripe",
        ...({ address: "123 Main St", stripeSessionId: "cs_123" } as object),
      });

      expect(trackEventSpy).toHaveBeenCalledWith("certificate_checkout_cancelled", {
        purchase_channel: "web_stripe",
      });
    });

    it("emits certificate_pass_redeemed without value, transaction id or the agent's code", () => {
      trackCertificatePassRedeemed({
        feasibility_status: "eligible",
        ...({ code: "SMITH-ELM", value: 29, transaction_id: "x" } as object),
      });

      expect(trackEventSpy).toHaveBeenCalledWith("certificate_pass_redeemed", {
        feasibility_status: "eligible",
      });
    });

    it("emits standard GA4 purchase event for certificate purchase", () => {
      trackCertificatePurchase({
        transaction_id: "safe-order-xyz-123",
        value: 49,
        currency: "USD",
        purchase_channel: "web_stripe",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("purchase", {
        transaction_id: "safe-order-xyz-123",
        value: 49,
        currency: "USD",
        purchase_channel: "web_stripe",
        items: [
          {
            item_id: "certificate",
            item_name: "Certificate of Feasibility",
            item_category: "certificate",
            quantity: 1,
            price: 49,
          },
        ],
      });
    });

    it("suppresses purchase event when transaction_id is blank or value is invalid", () => {
      trackCertificatePurchase({
        transaction_id: "   ",
        value: 49,
        purchase_channel: "web_stripe",
      });
      trackCertificatePurchase({
        transaction_id: "safe-id",
        value: -10,
        purchase_channel: "web_stripe",
      });
      trackCertificatePurchase({
        transaction_id: "safe-id",
        value: NaN,
        purchase_channel: "web_stripe",
      });

      expect(trackEventSpy).not.toHaveBeenCalled();
    });

    it("emits marketplace builder events", () => {
      trackBuilderMatchesViewed({
        builder_match_bucket: "two_three",
        state_code: "WA",
        feasibility_status: "eligible",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("builder_matches_viewed", {
        builder_match_bucket: "two_three",
        state_code: "WA",
        feasibility_status: "eligible",
      });

      trackBuilderConnectionSubmitted({
        builder_match_bucket: "one",
        feasibility_status: "eligible",
        adu_sqft_bucket: "600_799",
        state_code: "WA",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("builder_connection_submitted", {
        builder_match_bucket: "one",
        feasibility_status: "eligible",
        adu_sqft_bucket: "600_799",
        state_code: "WA",
      });

      trackBuilderLeadPreviewViewed({
        triage_status: "new",
        access_status: "locked",
        project_value_bucket: "200000_299999",
        match_reason_count_bucket: "two_three",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("builder_lead_preview_viewed", {
        triage_status: "new",
        access_status: "locked",
        project_value_bucket: "200000_299999",
        match_reason_count_bucket: "two_three",
      });

      trackBuilderUnlockCheckoutStarted({
        value: 39,
        currency: "USD",
        purchase_channel: "web_stripe",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("builder_unlock_checkout_started", {
        purchase_type: "lead_unlock",
        purchase_channel: "web_stripe",
        value: 39,
        currency: "USD",
      });

      trackBuilderLeadUnlocked({
        unlock_mode: "paid",
        triage_status: "new",
      });
      expect(trackEventSpy).toHaveBeenCalledWith("builder_lead_unlocked", {
        purchase_type: "lead_unlock",
        unlock_mode: "paid",
        triage_status: "new",
      });
    });

    it("extracts state code from parcel object or address/city string", () => {
      expect(extractStateCode(null)).toBeUndefined();
      expect(extractStateCode({})).toBeUndefined();
      expect(extractStateCode({ state: "WA" })).toBe("WA");
      expect(extractStateCode({ state: "ca" })).toBe("CA");
      expect(extractStateCode({ city: "Seattle, WA" })).toBe("WA");
      expect(extractStateCode({ address: "123 Main St, Denver, CO 80202" })).toBe("CO");
      expect(extractStateCode({ city: "Unknown City" })).toBeUndefined();
    });

    it("emits address search submission with auto-detected device mode", () => {
      recordAddressSearchSubmission("places", "guest");
      expect(trackEventSpy).toHaveBeenCalledWith("address_search_submitted", {
        search_mode: "places",
        auth_state: "guest",
        device_mode: "desktop",
      });
    });

    it("tracks parcel lookup completed upon settlement with correct latency bucket and parameters", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("granted");
      const tracker = startParcelLookupTracking("signed_in");
      tracker.settle({
        ok: true,
        parcel: { source: "regrid", state: "WA" },
      });

      expect(trackEventSpy).toHaveBeenCalledWith("parcel_lookup_completed", {
        result: "success",
        parcel_mode: "live",
        parcel_source: "regrid",
        auth_state: "signed_in",
        state_code: "WA",
        latency_bucket: expect.any(String),
      });
    });

    it("tracks parcel lookup error upon failed settlement", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("granted");
      const tracker = startParcelLookupTracking("guest");
      tracker.settle({
        ok: false,
        error: new Error("Network error"),
      });

      expect(trackEventSpy).toHaveBeenCalledWith("parcel_lookup_completed", {
        result: "error",
        parcel_mode: "live",
        parcel_source: "unknown",
        auth_state: "guest",
        state_code: undefined,
        latency_bucket: expect.any(String),
      });
    });

    it("suppresses parcel lookup tracking if consent was not granted at start", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("denied");
      const tracker = startParcelLookupTracking("guest");
      vi.spyOn(consent, "readConsent").mockReturnValue("granted");
      tracker.settle({
        ok: true,
        parcel: { source: "regrid", state: "WA" },
      });

      expect(trackEventSpy).not.toHaveBeenCalledWith("parcel_lookup_completed", expect.anything());
    });

    it("suppresses parcel lookup tracking if cancelled", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("granted");
      const tracker = startParcelLookupTracking("guest");
      tracker.cancel();
      tracker.settle({
        ok: true,
        parcel: { source: "regrid", state: "WA" },
      });

      expect(trackEventSpy).not.toHaveBeenCalledWith("parcel_lookup_completed", expect.anything());
    });

    it("emits lot_answer_viewed and lot_answer_open_studio with bounded non-PII parameters", () => {
      trackLotAnswerViewed({
        surface: "landing",
        parcel_source: "county_gis",
        feasibility_status: "review_needed",
        lot_size_bucket: "5000_7499",
        adu_sqft_bucket: "600_799",
        lot_quality: "parcel_record",
        state_code: "ca",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("lot_answer_viewed", {
        surface: "landing",
        parcel_source: "county_gis",
        feasibility_status: "review_needed",
        lot_size_bucket: "5000_7499",
        adu_sqft_bucket: "600_799",
        lot_quality: "parcel_record",
        state_code: "CA",
      });

      trackLotAnswerOpenStudio({
        surface: "quiz",
        parcel_source: "fallback",
        feasibility_status: "review_needed",
        adu_sqft_bucket: "400_599",
      });

      expect(trackEventSpy).toHaveBeenCalledWith("lot_answer_open_studio", {
        surface: "quiz",
        parcel_source: "fallback",
        feasibility_status: "review_needed",
        adu_sqft_bucket: "400_599",
      });
    });
  });
});

