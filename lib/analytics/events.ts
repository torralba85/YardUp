/**
 * Typed GA4 event definitions, parameter contracts, and bucket helpers for LotFoundry.
 *
 * Implements the contract defined in `docs/analytics-measurement-spec.md`.
 * Strict invariants:
 * - No PII (no addresses, coordinates, emails, names, APNs, or free text).
 * - Bounded categories and buckets only.
 * - Delegates directly to `trackEvent` in `lib/analytics/gtag.ts`.
 */

import { trackEvent } from "./gtag";
import { readConsent } from "./consent";

// -----------------------------------------------------------------------------
// Bounded Parameter Types
// -----------------------------------------------------------------------------

export type AppSurface = "landing" | "studio" | "builder";
export type DeviceMode = "desktop" | "mobile";
export type AuthState = "guest" | "signed_in";
export type ParcelMode = "estimated" | "live" | "preset";
export type ParcelSource =
  | "regrid"
  | "county_gis"
  | "fallback"
  | "estimated"
  | "preset"
  | "unknown";
export type FeasibilityStatus =
  | "eligible"
  | "review_needed"
  | "blocked"
  | "unknown";
export type LotSizeBucket =
  | "under_3000"
  | "3000_4999"
  | "5000_7499"
  | "7500_9999"
  | "10000_plus";
export type AduSqftBucket =
  | "under_400"
  | "400_599"
  | "600_799"
  | "800_999"
  | "1000_plus";
export type LatencyBucket =
  | "under_500ms"
  | "500_1499ms"
  | "1500_2999ms"
  | "3000_9999ms"
  | "10000ms_plus"
  | "unknown";
export type ReportFormat = "print" | "html" | "csv" | "share";
export type PurchaseType = "certificate" | "lead_unlock" | "credit_pack";
export type AnalyticsPurchaseChannel =
  | "web_stripe"
  | "ios_storekit"
  | "android_play";
export type BuilderMatchBucket = "none" | "one" | "two_three" | "four_plus";
export type LookupResult = "success" | "fallback" | "error";
export type EntrySource = "landing_cta" | "shared_link" | "unknown";
export type SearchMode = "free_text" | "places";
export type RoofStyle = "shed" | "gable" | "flat";
export type Finish = "cedar" | "lap" | "stucco" | "board";
export type TriageStatus = "new" | "interested" | "not-a-fit";
export type AccessStatus = "locked" | "unlocked";
export type ProjectValueBucket =
  | "under_100000"
  | "100000_199999"
  | "200000_299999"
  | "300000_499999"
  | "500000_plus"
  | "unknown";
export type MatchReasonCountBucket = "none" | "one" | "two_three" | "four_plus";
export type UnlockMode = "paid" | "credit" | "demo" | "unknown";
export type AuthMethod = "password" | "google" | "apple";
export type AuthMode = "sign_in" | "sign_up";
export type AuthSurface = "landing" | "studio" | "signup_page" | "builder" | "native";
export type AuthPromptSource =
  | "account_control"
  | "certificate_purchase"
  | "save_scenario"
  | "guest_limit"
  | "post_result"
  | "feature_gate"
  | "builder_connect"
  | "direct_signup"
  | "unknown";
export type AuthErrorBucket =
  | "email_in_use"
  | "invalid_credentials"
  | "weak_password"
  | "popup_blocked"
  | "popup_closed"
  | "provider_disabled"
  | "network"
  | "profile_write"
  | "unknown";

// -----------------------------------------------------------------------------
// Bucket & Mapping Helpers
// -----------------------------------------------------------------------------

/**
 * Categorize lot area in square feet into standard reporting intervals.
 * Inclusive lower bound, exclusive upper bound.
 */
export function getLotSizeBucket(
  sqft: number | null | undefined,
): LotSizeBucket | undefined {
  if (sqft == null || !Number.isFinite(sqft) || sqft < 0) return undefined;
  if (sqft < 3000) return "under_3000";
  if (sqft < 5000) return "3000_4999";
  if (sqft < 7500) return "5000_7499";
  if (sqft < 10000) return "7500_9999";
  return "10000_plus";
}

/**
 * Categorize ADU floor area in square feet into standard reporting intervals.
 */
export function getAduSqftBucket(
  sqft: number | null | undefined,
): AduSqftBucket | undefined {
  if (sqft == null || !Number.isFinite(sqft) || sqft < 0) return undefined;
  if (sqft < 400) return "under_400";
  if (sqft < 600) return "400_599";
  if (sqft < 800) return "600_799";
  if (sqft < 1000) return "800_999";
  return "1000_plus";
}

/**
 * Categorize lookup latency in milliseconds into standard reporting intervals.
 */
export function getLatencyBucket(ms: number | null | undefined): LatencyBucket {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "unknown";
  if (ms < 500) return "under_500ms";
  if (ms < 1500) return "500_1499ms";
  if (ms < 3000) return "1500_2999ms";
  if (ms < 10000) return "3000_9999ms";
  return "10000ms_plus";
}

/**
 * Categorize builder match count.
 */
export function getBuilderMatchBucket(
  count: number | null | undefined,
): BuilderMatchBucket {
  if (count == null || !Number.isFinite(count) || count <= 0) return "none";
  if (count === 1) return "one";
  if (count <= 3) return "two_three";
  return "four_plus";
}

/**
 * Categorize match reason count.
 */
export function getMatchReasonCountBucket(
  count: number | null | undefined,
): MatchReasonCountBucket {
  if (count == null || !Number.isFinite(count) || count <= 0) return "none";
  if (count === 1) return "one";
  if (count <= 3) return "two_three";
  return "four_plus";
}

/**
 * Categorize project build value (USD) based on preview buildBandLow.
 */
export function getProjectValueBucket(
  dollars: number | null | undefined,
): ProjectValueBucket {
  if (dollars == null || !Number.isFinite(dollars) || dollars < 0) return "unknown";
  if (dollars < 100000) return "under_100000";
  if (dollars < 200000) return "100000_199999";
  if (dollars < 300000) return "200000_299999";
  if (dollars < 500000) return "300000_499999";
  return "500000_plus";
}

/**
 * Map `summarizeFeasibility().verdict` or `zoningStatus` to the bounded analytics status.
 *
 * "Likely Feasible" / "Eligible"     -> "eligible"
 * "Needs Review" / "Review Needed"   -> "review_needed"
 * "Unlikely" / "Blocked"             -> "blocked"
 */
export function mapFeasibilityVerdict(
  verdict: string | null | undefined,
): FeasibilityStatus {
  if (!verdict) return "unknown";
  const v = verdict.toLowerCase().trim();
  if (v === "likely feasible" || v === "eligible") return "eligible";
  if (v === "needs review" || v === "review needed") return "review_needed";
  if (v === "unlikely" || v === "blocked" || v === "not allowed") return "blocked";
  return "unknown";
}

/**
 * Map runtime purchase channel from `detectPurchaseChannel()` to analytics contract.
 */
export function mapPurchaseChannel(
  channel: string | null | undefined,
): AnalyticsPurchaseChannel {
  if (channel === "app-store") return "ios_storekit";
  if (channel === "google-play") return "android_play";
  return "web_stripe";
}

/**
 * Normalize parcel source string to bounded enum.
 */
export function mapParcelSource(source: string | null | undefined): ParcelSource {
  if (!source) return "unknown";
  const s = source.toLowerCase().trim();
  if (s === "regrid") return "regrid";
  if (s === "county-gis" || s === "county_gis") return "county_gis";
  if (s === "fallback") return "fallback";
  if (s === "estimated") return "estimated";
  if (s === "preset") return "preset";
  return "unknown";
}

/**
 * Extract a two-letter US state code from a parcel or address/city string.
 */
export function extractStateCode(
  parcel?: { state?: string; city?: string; address?: string } | null,
): string | undefined {
  if (!parcel) return undefined;
  if (parcel.state && /^[A-Za-z]{2}$/.test(parcel.state.trim())) {
    return parcel.state.trim().toUpperCase();
  }
  const match = (parcel.city || parcel.address || "").match(/,\s*([A-Za-z]{2})\b/);
  if (match) {
    return match[1].toUpperCase();
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Strongly-Typed Event Emitters (Phase 1)
// -----------------------------------------------------------------------------

/** 1. studio_opened */
export function trackStudioOpened(params: {
  device_mode: DeviceMode;
  auth_state: AuthState;
  parcel_mode?: ParcelMode;
  entry_source: EntrySource;
}): void {
  const p: Record<string, unknown> = {
    app_surface: "studio",
    device_mode: params.device_mode,
    auth_state: params.auth_state,
    entry_source: params.entry_source,
  };
  if (params.parcel_mode) p.parcel_mode = params.parcel_mode;
  trackEvent("studio_opened", p);
}

/**
 * Reduce Firebase/auth failures to bounded categories. Never send raw error
 * messages or user-entered values to analytics.
 */
export function getAuthErrorBucket(code: string | null | undefined): AuthErrorBucket {
  const normalized = (code ?? "").toLowerCase();
  if (normalized.includes("email-already-in-use")) return "email_in_use";
  if (
    normalized.includes("wrong-password") ||
    normalized.includes("invalid-credential") ||
    normalized.includes("user-not-found")
  ) return "invalid_credentials";
  if (normalized.includes("weak-password")) return "weak_password";
  if (normalized.includes("popup-blocked")) return "popup_blocked";
  if (normalized.includes("popup-closed")) return "popup_closed";
  if (
    normalized.includes("operation-not-allowed") ||
    normalized.includes("provider-disabled")
  ) return "provider_disabled";
  if (normalized.includes("network-request-failed")) return "network";
  if (normalized.includes("profile") || normalized.includes("firestore")) {
    return "profile_write";
  }
  return "unknown";
}

export function trackAuthPromptShown(params: {
  surface: AuthSurface;
  source: AuthPromptSource;
  mode: AuthMode;
}): void {
  trackEvent("auth_prompt_shown", {
    app_surface: params.surface,
    auth_source: params.source,
    auth_mode: params.mode,
  });
}

export function trackSignupStarted(params: {
  method: AuthMethod;
  surface: AuthSurface;
  source: AuthPromptSource;
  role: "user" | "builder";
}): void {
  trackEvent("signup_started", {
    method: params.method,
    app_surface: params.surface,
    auth_source: params.source,
    role: params.role,
  });
}

/** GA4 recommended sign_up event emitted only after account creation succeeds. */
export function trackSignupSucceeded(params: {
  method: AuthMethod;
  surface: AuthSurface;
  source: AuthPromptSource;
  role: "user" | "builder";
}): void {
  trackEvent("sign_up", {
    method: params.method,
    app_surface: params.surface,
    auth_source: params.source,
    role: params.role,
  });
}

export function trackSignupFailed(params: {
  method: AuthMethod;
  surface: AuthSurface;
  source: AuthPromptSource;
  role: "user" | "builder";
  error_code?: string | null;
}): void {
  trackEvent("signup_failed", {
    method: params.method,
    app_surface: params.surface,
    auth_source: params.source,
    role: params.role,
    error_bucket: getAuthErrorBucket(params.error_code),
  });
}

/** 2. address_search_submitted */
export function trackAddressSearchSubmitted(params: {
  search_mode: SearchMode;
  auth_state: AuthState;
  device_mode: DeviceMode;
}): void {
  trackEvent("address_search_submitted", {
    search_mode: params.search_mode,
    auth_state: params.auth_state,
    device_mode: params.device_mode,
  });
}

/** Helper for AddressSearch and search handlers to emit address_search_submitted. */
export function recordAddressSearchSubmission(
  searchMode: SearchMode,
  authState: AuthState,
): void {
  const deviceMode: DeviceMode =
    typeof window !== "undefined" && window.innerWidth < 800
      ? "mobile"
      : "desktop";
  trackAddressSearchSubmitted({
    search_mode: searchMode,
    auth_state: authState,
    device_mode: deviceMode,
  });
}

/** 3. parcel_lookup_completed */
export function trackParcelLookupCompleted(params: {
  result: LookupResult;
  parcel_mode: ParcelMode;
  parcel_source: ParcelSource;
  auth_state: AuthState;
  state_code?: string;
  latency_bucket: LatencyBucket;
}): void {
  const p: Record<string, unknown> = {
    result: params.result,
    parcel_mode: params.parcel_mode,
    parcel_source: params.parcel_source,
    auth_state: params.auth_state,
    latency_bucket: params.latency_bucket,
  };
  if (params.state_code && /^[A-Z]{2}$/i.test(params.state_code)) {
    p.state_code = params.state_code.toUpperCase();
  }
  trackEvent("parcel_lookup_completed", p);
}

/**
 * Handle returned by `startParcelLookupTracking` to settle or cancel an attempt.
 */
export interface ParcelLookupTracker {
  settle: (
    outcome:
      | { ok: true; parcel: { source?: string; state?: string; city?: string; address?: string } }
      | { ok: false; error?: unknown },
  ) => void;
  cancel: () => void;
}

/**
 * Shared tracker for SignedInStudioGate and ParcelProvider to measure parcel lookup latency
 * and emit parcel_lookup_completed according to the spec:
 * - Exactly once per accepted attempt.
 * - Suppresses cancelled/withdrawn attempts.
 * - Requires consent granted at start AND at settlement.
 */
export function startParcelLookupTracking(authState: AuthState): ParcelLookupTracker {
  const startTime = Date.now();
  const consentAtStart = readConsent() === "granted";
  let settled = false;

  return {
    settle: (outcome) => {
      if (settled) return;
      settled = true;
      if (!consentAtStart || readConsent() !== "granted") return;

      const ms = Date.now() - startTime;
      const latency_bucket = getLatencyBucket(ms);

      if (outcome.ok) {
        const parcel = outcome.parcel;
        const result: LookupResult =
          parcel.source === "fallback" ? "fallback" : "success";
        const parcel_source = mapParcelSource(parcel.source);
        const state_code = extractStateCode(parcel);
        trackParcelLookupCompleted({
          result,
          parcel_mode: "live",
          parcel_source,
          auth_state: authState,
          state_code,
          latency_bucket,
        });
      } else {
        trackParcelLookupCompleted({
          result: "error",
          parcel_mode: "live",
          parcel_source: "unknown",
          auth_state: authState,
          state_code: undefined,
          latency_bucket,
        });
      }
    },
    cancel: () => {
      settled = true;
    },
  };
}

/** 4. feasibility_result_viewed */
export function trackFeasibilityResultViewed(params: {
  parcel_mode: ParcelMode;
  parcel_source: ParcelSource;
  feasibility_status: FeasibilityStatus;
  lot_size_bucket?: LotSizeBucket;
  adu_sqft_bucket?: AduSqftBucket;
  auth_state: AuthState;
  state_code?: string;
}): void {
  const p: Record<string, unknown> = {
    parcel_mode: params.parcel_mode,
    parcel_source: params.parcel_source,
    feasibility_status: params.feasibility_status,
    auth_state: params.auth_state,
  };
  if (params.lot_size_bucket) p.lot_size_bucket = params.lot_size_bucket;
  if (params.adu_sqft_bucket) p.adu_sqft_bucket = params.adu_sqft_bucket;
  if (params.state_code && /^[A-Z]{2}$/i.test(params.state_code)) {
    p.state_code = params.state_code.toUpperCase();
  }
  trackEvent("feasibility_result_viewed", p);
}

/** How a used plan landed on the lot, in the Studio's own placement terms. */
export type PlanPlacementOutcome = "kept" | "moved" | "none" | "unknown";

/**
 * preapproved_plan_selected: the homeowner chose "Use this plan" for an official
 * pre-approved plan. Fired from the explicit action only, never when a saved
 * study or shared link restores a reference. Catalog IDs are repository-managed
 * slugs (bounded, no PII); the event carries no address or lot identity.
 */
export function trackPreapprovedPlanSelected(params: {
  jurisdiction_id: string;
  plan_id: string;
  parcel_mode: ParcelMode;
  placement_outcome: PlanPlacementOutcome;
  auth_state: AuthState;
}): void {
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slug.test(params.jurisdiction_id) || !slug.test(params.plan_id)) return;
  trackEvent("preapproved_plan_selected", {
    jurisdiction_id: params.jurisdiction_id.slice(0, 100),
    plan_id: params.plan_id.slice(0, 100),
    parcel_mode: params.parcel_mode,
    placement_outcome: params.placement_outcome,
    auth_state: params.auth_state,
  });
}

/** 5. adu_design_committed */
export function trackAduDesignCommitted(params: {
  adu_sqft_bucket?: AduSqftBucket;
  roof_style?: RoofStyle;
  finish?: Finish;
  feasibility_status: FeasibilityStatus;
}): void {
  const p: Record<string, unknown> = {
    feasibility_status: params.feasibility_status,
  };
  if (params.adu_sqft_bucket) p.adu_sqft_bucket = params.adu_sqft_bucket;
  if (params.roof_style) p.roof_style = params.roof_style;
  if (params.finish) p.finish = params.finish;
  trackEvent("adu_design_committed", p);
}

/** 6. scenario_saved */
export function trackScenarioSaved(params: {
  parcel_mode: ParcelMode;
  feasibility_status: FeasibilityStatus;
}): void {
  trackEvent("scenario_saved", {
    parcel_mode: params.parcel_mode,
    feasibility_status: params.feasibility_status,
  });
}

/** 7. report_opened */
export function trackReportOpened(params: {
  feasibility_status: FeasibilityStatus;
  has_ai_brief: boolean;
  auth_state: AuthState;
}): void {
  trackEvent("report_opened", {
    feasibility_status: params.feasibility_status,
    has_ai_brief: params.has_ai_brief,
    auth_state: params.auth_state,
  });
}

/** 8. report_exported */
export function trackReportExported(params: {
  report_format: ReportFormat;
  feasibility_status: FeasibilityStatus;
}): void {
  trackEvent("report_exported", {
    report_format: params.report_format,
    feasibility_status: params.feasibility_status,
  });
}

/** 9. certificate_paywall_viewed */
export function trackCertificatePaywallViewed(params: {
  auth_state: AuthState;
  feasibility_status: FeasibilityStatus;
  purchase_channel: AnalyticsPurchaseChannel;
}): void {
  trackEvent("certificate_paywall_viewed", {
    auth_state: params.auth_state,
    feasibility_status: params.feasibility_status,
    purchase_channel: params.purchase_channel,
  });
}

/** 10. certificate_checkout_started */
export function trackCertificateCheckoutStarted(params: {
  value?: number;
  currency?: string;
  purchase_channel: AnalyticsPurchaseChannel;
  feasibility_status: FeasibilityStatus;
}): void {
  const p: Record<string, unknown> = {
    purchase_channel: params.purchase_channel,
    feasibility_status: params.feasibility_status,
  };
  if (params.value != null && Number.isFinite(params.value)) {
    p.value = params.value;
    p.currency = params.currency ?? "USD";
  }
  trackEvent("certificate_checkout_started", p);
}

/**
 * 10a. certificate_checkout_redirected — the checkout API returned a Stripe
 * Checkout URL and the browser is about to navigate to it. Unlike
 * `certificate_checkout_started`, this confirms the handoff was initiated, not
 * that Stripe finished loading in the buyer's browser.
 */
export function trackCertificateCheckoutRedirected(params: {
  value?: number;
  currency?: string;
  purchase_channel: AnalyticsPurchaseChannel;
  feasibility_status: FeasibilityStatus;
}): void {
  const p: Record<string, unknown> = {
    purchase_channel: params.purchase_channel,
    feasibility_status: params.feasibility_status,
  };
  if (params.value != null && Number.isFinite(params.value)) {
    p.value = params.value;
    p.currency = params.currency ?? "USD";
  }
  trackEvent("certificate_checkout_redirected", p);
}

/**
 * 10b. certificate_checkout_cancelled — the buyer left Stripe Checkout through
 * its back/cancel link and returned with the server-stamped cancellation marker.
 */
export function trackCertificateCheckoutCancelled(params: {
  purchase_channel: AnalyticsPurchaseChannel;
}): void {
  trackEvent("certificate_checkout_cancelled", {
    purchase_channel: params.purchase_channel,
  });
}

/**
 * 10c. certificate_pass_redeemed — a buyer claimed a complimentary certificate
 * with a real estate agent's pass code. Never a purchase: no value, no
 * transaction id, and never the agent's code.
 */
export function trackCertificatePassRedeemed(params: {
  feasibility_status: FeasibilityStatus;
}): void {
  trackEvent("certificate_pass_redeemed", {
    feasibility_status: params.feasibility_status,
  });
}

/** 11. purchase (GA4 Recommended Ecommerce Event) */
export function trackCertificatePurchase(params: {
  transaction_id: string;
  value: number;
  currency?: string;
  purchase_channel: AnalyticsPurchaseChannel;
}): void {
  const transactionId = params.transaction_id.trim();
  if (!transactionId) return;
  if (!Number.isFinite(params.value) || params.value < 0) return;

  const currency = params.currency ?? "USD";
  trackEvent("purchase", {
    transaction_id: transactionId,
    value: params.value,
    currency,
    purchase_channel: params.purchase_channel,
    items: [
      {
        item_id: "certificate",
        item_name: "Certificate of Feasibility",
        item_category: "certificate",
        quantity: 1,
        price: params.value,
      },
    ],
  });
}

/** 12. builder_matches_viewed */
export function trackBuilderMatchesViewed(params: {
  builder_match_bucket: BuilderMatchBucket;
  state_code?: string;
  feasibility_status: FeasibilityStatus;
}): void {
  const p: Record<string, unknown> = {
    builder_match_bucket: params.builder_match_bucket,
    feasibility_status: params.feasibility_status,
  };
  if (params.state_code && /^[A-Z]{2}$/i.test(params.state_code)) {
    p.state_code = params.state_code.toUpperCase();
  }
  trackEvent("builder_matches_viewed", p);
}

/** 13. builder_connection_submitted */
export function trackBuilderConnectionSubmitted(params: {
  builder_match_bucket: BuilderMatchBucket;
  feasibility_status: FeasibilityStatus;
  adu_sqft_bucket?: AduSqftBucket;
  state_code?: string;
}): void {
  const p: Record<string, unknown> = {
    builder_match_bucket: params.builder_match_bucket,
    feasibility_status: params.feasibility_status,
  };
  if (params.adu_sqft_bucket) p.adu_sqft_bucket = params.adu_sqft_bucket;
  if (params.state_code && /^[A-Z]{2}$/i.test(params.state_code)) {
    p.state_code = params.state_code.toUpperCase();
  }
  trackEvent("builder_connection_submitted", p);
}

/** 14. builder_lead_preview_viewed */
export function trackBuilderLeadPreviewViewed(params: {
  triage_status: TriageStatus;
  access_status: AccessStatus;
  project_value_bucket: ProjectValueBucket;
  match_reason_count_bucket: MatchReasonCountBucket;
}): void {
  trackEvent("builder_lead_preview_viewed", {
    triage_status: params.triage_status,
    access_status: params.access_status,
    project_value_bucket: params.project_value_bucket,
    match_reason_count_bucket: params.match_reason_count_bucket,
  });
}

/** 15. builder_unlock_checkout_started */
export function trackBuilderUnlockCheckoutStarted(params: {
  value?: number;
  currency?: string;
  purchase_channel: AnalyticsPurchaseChannel;
}): void {
  const p: Record<string, unknown> = {
    purchase_type: "lead_unlock",
    purchase_channel: params.purchase_channel,
  };
  if (params.value != null && Number.isFinite(params.value)) {
    p.value = params.value;
    p.currency = params.currency ?? "USD";
  }
  trackEvent("builder_unlock_checkout_started", p);
}

/** 16. builder_lead_unlocked */
export function trackBuilderLeadUnlocked(params: {
  unlock_mode: UnlockMode;
  triage_status: TriageStatus;
}): void {
  trackEvent("builder_lead_unlocked", {
    purchase_type: "lead_unlock",
    unlock_mode: params.unlock_mode,
    triage_status: params.triage_status,
  });
}
