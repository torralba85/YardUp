"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type {
  AIProjectBrief,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
} from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { AuthModal, type AuthModalCloseReason } from "@/components/auth/AuthModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { trackPurchase } from "@/lib/analytics/adsConversion";
import {
  mapPurchaseChannel,
  trackCertificateCheckoutCancelled,
  trackCertificateCheckoutRedirected,
  trackCertificateCheckoutStarted,
  trackCertificatePaywallViewed,
  trackCertificatePurchase,
  type FeasibilityStatus,
} from "@/lib/analytics/events";
import { certificateKey } from "@/lib/certificate-key";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { useStorePrice } from "@/lib/commerce/store-price";
import { detectPurchaseChannel } from "@/lib/commerce/purchase-channel";
import type { CertificateRecovery } from "@/lib/certificate-recovery";
import Link from "next/link";
import { getSiteFitCapacityStatus } from "@/lib/site-fit";
import {
  CertificateCheckoutError,
  startCertificateCheckout,
} from "@/lib/certificate-checkout";
import { clearInitialParcel, stashInitialParcel } from "@/lib/parcel-handoff";
import {
  clearCertificatePurchaseIntent,
  hasCertificatePurchaseIntent,
  rememberCertificatePurchaseIntent,
} from "@/lib/certificate-purchase-intent";
import type { LiveParcelData } from "@/lib/parcel-types";
import {
  FINANCING_SCENARIOS,
  financingTermsLabel,
  formatOperatingShare,
} from "@/lib/certificate-pro-forma";
import {
  assessImpactFeeThreshold,
  feeJurisdiction as resolveFeeJurisdiction,
  permitAuditPreviewLines,
  permitAuditTitle,
} from "@/lib/certificate-permit-audit";
import { BID_CHECKLIST_PREVIEW_COUNT, BID_LEVELING_CHECKLIST } from "@/lib/certificate-bid-checklist";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import EstimateSummaryPanel from "./EstimateSummaryPanel";

/** One locked row of the paywall's "Included in your certificate" preview. */
interface IncludedSection {
  title: string;
  detail: string;
}

/** "1 ranked risk" / "4 ranked risks". */
function countNoun(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * What the complete certificate adds beyond the free estimate, in the order a
 * buyer weighs it: what could stop the project, what happens next, then the
 * record itself. Counts come only from an already generated brief preview,
 * whose server-side counts are honest; without one every row stays descriptive.
 */
function includedSections(preview: AIProjectBriefPreview | null | undefined): IncludedSection[] {
  const locked = preview?.locked;
  return [
    {
      title: "Property-specific risk review",
      detail:
        locked && locked.riskCount > 0
          ? `${countNoun(locked.riskCount, "ranked risk")} to verify`
          : "Findings ranked for this lot, with what to verify",
    },
    {
      title: "Typical local approval path",
      detail:
        locked && locked.stageCount > 0
          ? `${locked.stageCount}-stage permit path`
          : "Permit track and the review stages to expect",
    },
    {
      title: "Approval timeline",
      detail:
        preview && preview.totalEstWeeksHigh > 0
          ? `${preview.totalEstWeeksLow}–${preview.totalEstWeeksHigh} week typical approval timeline`
          : "Typical week ranges for each review stage",
    },
    {
      title: "Recommended next actions",
      detail:
        locked && locked.nextStepCount > 0
          ? countNoun(locked.nextStepCount, "recorded next step")
          : "What to do next, in order",
    },
    {
      title: "Print-ready report, CSV export & permanent share link",
      detail: "Print or save as PDF, export CSV, share a link, or connect with builders",
    },
  ];
}

/** A locked dollar figure: a sign-neutral mask, so the preview never hints at profit or loss. */
function MaskedFigure({ label }: { label: string }) {
  return (
    <span className="shrink-0 text-sm font-semibold tabular-nums text-lot-ink">
      <span aria-hidden="true" className="select-none blur-xs">±$•,•••/mo</span>
      <span className="sr-only">{label} locked</span>
    </span>
  );
}

/** Props for {@link CertificatePanel}. */
export interface CertificatePanelProps {
  emailLinkCard?: ReactNode;
  recovery: CertificateRecovery;
  /** The active parcel (its identity keys the purchase). */
  parcel: Parcel;
  /** The feasibility result summarized on the certificate. */
  result: FeasibilityResult;
  /** Analytics status of the rendered verdict (not the raw zoning status). */
  feasibilityStatus: FeasibilityStatus;
  /** Display name of the lot. */
  parcelName: string;
  /** Context-specific label above the certificate artifact. */
  eyebrow?: string;
  /** Open the unlocked certificate artifact, optionally carrying an AI setup error. */
  onOpenCertificate: (projectBriefError?: string) => void;
  /** Unified AI interpretation recorded in the certificate when available. */
  projectBrief: AIProjectBrief | null;
  projectBriefSavedAt?: string | null;
  /** The free preview tier of the brief, when one was generated for this concept. */
  projectBriefPreview?: AIProjectBriefPreview | null;
  projectBriefLoading: boolean;
  projectBriefError: string | null;
  /** Generate the parcel + timeline brief with the signed-in user's token. */
  onGenerateProjectBrief: (idToken: string) => Promise<AIProjectBriefResponse>;
}

/**
 * The Certificate step: the free estimate snapshot plus the paywall for the
 * complete, downloadable Certificate of Feasibility (the user-revenue moment).
 *
 * States: guest → sign in; signed-in & unpaid → buy; paid → unlocked. Owns its
 * own auth modal and reconciles the `?cert=1` Stripe return by polling for the
 * webhook-written grant.
 */
export default function CertificatePanel({
  emailLinkCard,
  recovery,
  parcel,
  result,
  feasibilityStatus,
  parcelName,
  eyebrow = "Step 4 · Certificate",
  onOpenCertificate,
  projectBrief,
  projectBriefSavedAt,
  projectBriefPreview,
  projectBriefLoading,
  projectBriefError,
  onGenerateProjectBrief,
}: CertificatePanelProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const certKey = certificateKey(parcel);
  const { purchased, loading, refresh, analyticsOrderId, amount } = recovery.access;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [preparingBrief, setPreparingBrief] = useState(false);
  const checkoutCancelled = recovery.intent?.kind === "cancel";
  const includedHeadingId = useId();
  const openedOnUnlock = useRef(false);
  const sawSettledUnpurchased = useRef(false);
  const adsConversionFiredFor = useRef<string | null>(null);
  const paywallViewedFor = useRef<string | null>(null);

  // A parcel switch is a new purchase context — never carry unlock history
  // from one certificate key to another.
  useEffect(() => {
    openedOnUnlock.current = false;
    sawSettledUnpurchased.current = false;
    adsConversionFiredFor.current = null;
    paywallViewedFor.current = null;
  }, [certKey]);

  // Track certificate paywall view once per lot context for unpurchased visitors.
  useEffect(() => {
    if (loading || purchased) return;
    if (recovery.intent && recovery.intent.kind !== "cancel") return;
    if (paywallViewedFor.current === certKey) return;
    paywallViewedFor.current = certKey;
    const channel = mapPurchaseChannel(detectPurchaseChannel());
    trackCertificatePaywallViewed({
      auth_state: user ? "signed_in" : "guest",
      feasibility_status: feasibilityStatus,
      purchase_channel: channel,
    });
  }, [loading, purchased, certKey, user, feasibilityStatus, recovery]);

  const prepareAndOpenCertificate = useCallback(async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setPreparingBrief(true);
    setError(null);
    try {
      if (!projectBrief) {
        let idToken: string;
        try {
          idToken = await user.getIdToken();
        } catch {
          const message = "We could not verify your session. Please try again.";
          setError(message);
          onOpenCertificate(message);
          return;
        }
        try {
          await onGenerateProjectBrief(idToken);
        } catch {
          // The deterministic certificate remains available. ReportPreview carries
          // the persistent inline AI error and the user can refresh the brief.
        }
      }
      onOpenCertificate();
    } finally {
      setPreparingBrief(false);
    }
  }, [onGenerateProjectBrief, onOpenCertificate, projectBrief, user]);

  // Return recovery owns marker consumption and acknowledgement across panel remounts.
  useEffect(() => {
    if (recovery.intent?.kind !== "cancel") return;
    if (recovery.consumeCancellation()) {
      trackCertificateCheckoutCancelled({
        purchase_channel: mapPurchaseChannel(detectPurchaseChannel()),
      });
    }
  }, [recovery]);

  // Open the artifact once when a purchase resolves in this session — a demo
  // or webhook grant observed after a settled unpurchased read, or a Stripe
  // checkout return. A grant read passively on a fresh visit must not
  // regenerate the AI brief or pop the certificate; the CTA covers that path.
  useEffect(() => {
    const unlockedThisSession =
      sawSettledUnpurchased.current || (recovery.status === "granted" && recovery.intent?.kind !== "cancel" && Boolean(recovery.intent));
    if (purchased && user && unlockedThisSession && !openedOnUnlock.current) {
      if (recovery.intent && recovery.intent.kind !== "cancel" && !recovery.consumeOpen()) return;
      openedOnUnlock.current = true;
      // Preparing the Report follows an externally verified Grant transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void prepareAndOpenCertificate();
    }
    // Only a signed-in read counts as "settled unpurchased": before Firebase
    // auth resolves, the access hook reports not-loading/not-purchased for
    // the guest uid, and treating that as settled would make a returning
    // purchaser's grant look like an in-session unlock on every fresh load.
    if (user && !loading && !purchased) {
      sawSettledUnpurchased.current = true;
      openedOnUnlock.current = false;
    }
  }, [loading, prepareAndOpenCertificate, purchased, user, recovery]);

  // Report the GA4 purchase event and Google Ads conversion exactly once per Stripe
  // checkout return using the safe, opaque analyticsOrderId.
  // Suppresses emission if analyticsOrderId is absent to guarantee zero PII transmission.
  useEffect(() => {
    if (!purchased || !user) return;
    if (recovery.intent?.kind !== "checkout") return;
    if (adsConversionFiredFor.current === certKey) return;
    if (!analyticsOrderId || !recovery.consumePurchase()) return;
    adsConversionFiredFor.current = certKey;

    const valueDollars = amount ? amount / 100 : CERTIFICATE_PRICE_CENTS / 100;
    const channel = mapPurchaseChannel(detectPurchaseChannel());

    trackCertificatePurchase({
      transaction_id: analyticsOrderId,
      value: valueDollars,
      currency: "USD",
      purchase_channel: channel,
    });

    trackPurchase({
      value: valueDollars,
      transactionId: analyticsOrderId,
    });
  }, [purchased, user, certKey, analyticsOrderId, amount, recovery]);

  const beginCheckout = useCallback(async (authenticatedUser: FirebaseUser) => {
    setBusy(true);
    setError(null);
    recovery.acknowledgeCancellation();

    const channel = mapPurchaseChannel(detectPurchaseChannel());

    try {
      const idToken = await authenticatedUser.getIdToken();
      const isLive = "source" in parcel && Boolean(parcel.source);
      if (isLive) {
        stashInitialParcel(parcel as unknown as LiveParcelData);
      }
      trackCertificateCheckoutStarted({
        value: CERTIFICATE_PRICE_CENTS / 100,
        currency: "USD",
        purchase_channel: channel,
        feasibility_status: feasibilityStatus,
      });
      const outcome = await startCertificateCheckout({
        certKey,
        parcelName,
        idToken,
        returnSearch: typeof window !== "undefined" ? window.location.search : undefined,
        address: "address" in parcel && typeof parcel.address === "string" ? parcel.address : undefined,
        city: "city" in parcel && typeof parcel.city === "string" ? parcel.city : undefined,
        state: "state" in parcel && typeof parcel.state === "string" ? parcel.state : undefined,
        zip: "zip" in parcel && typeof parcel.zip === "string" ? parcel.zip : undefined,
        lat: "lat" in parcel && typeof parcel.lat === "number" ? parcel.lat : undefined,
        lng: "lng" in parcel && typeof parcel.lng === "number" ? parcel.lng : undefined,
        parcelData: isLive ? (parcel as unknown as Record<string, unknown>) : undefined,
      });
      if (outcome.kind === "redirect") {
        // Record the successful URL handoff, immediately before navigation.
        trackCertificateCheckoutRedirected({
          value: CERTIFICATE_PRICE_CENTS / 100,
          currency: "USD",
          purchase_channel: channel,
          feasibility_status: feasibilityStatus,
        });
        window.location.assign(outcome.url);
        return; // navigating away
      }
      refresh(); // demo / already-purchased grant is written; unlock in place
    } catch (err) {
      setError(
        err instanceof CertificateCheckoutError
          ? err.message
          : "Could not start checkout. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [certKey, feasibilityStatus, parcel, parcelName, recovery, refresh]);

  // A guest's purchase click survives the account step, including the Studio
  // remount a real-address sign-in causes and a redirect-based social sign-in
  // (the intent is persisted, not held in this component). Checkout resumes
  // only once the new session's profile and access reads have settled: builder
  // accounts work from /builder, so they are never routed into homeowner
  // Checkout, and an account that already owns this certificate is not sent
  // back to Stripe.
  const stashedForPurchase = useRef(false);
  useEffect(() => {
    if (!user || authLoading || loading) return;
    if (recovery.intent && recovery.intent.kind !== "cancel") return;
    if (!hasCertificatePurchaseIntent(certKey)) return;
    clearCertificatePurchaseIntent();
    if (profile?.role === "builder" || purchased) return;
    // Resuming follows an explicit purchase click and a completed sign-in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void beginCheckout(user);
  }, [authLoading, beginCheckout, certKey, loading, profile, purchased, recovery, user]);

  async function handleCta() {
    const recoveryActive = Boolean(recovery.intent && recovery.intent.kind !== "cancel");
    if (recoveryActive && !purchased && user) return;
    if (purchased) {
      await prepareAndOpenCertificate();
      return;
    }
    if (!user) {
      if (!recoveryActive) {
        // Signing in remounts the Studio for a real address, so keep the lot
        // and the purchase click where the next mount can find them.
        if ("source" in parcel && Boolean(parcel.source)) {
          stashedForPurchase.current = stashInitialParcel(parcel as unknown as LiveParcelData);
        }
        rememberCertificatePurchaseIntent(certKey);
      }
      setAuthOpen(true);
      return;
    }
    await beginCheckout(user);
  }

  function handleAuthClose(reason: AuthModalCloseReason) {
    setAuthOpen(false);
    if (reason === "signed-in") return;
    // Dismissed without an account: never start this purchase on a later sign-in.
    clearCertificatePurchaseIntent();
    if (stashedForPurchase.current) {
      clearInitialParcel();
      stashedForPurchase.current = false;
    }
  }

  // A store shell is charged the store's own localized amount, so the paywall
  // names a price only when it is the one that will actually be billed.
  const certPrice = useStorePrice("certificate");
  const price = certPrice.amountCompact;
  const guestPurchaseAction = certPrice.channel === "web"
    ? "Continue to secure checkout"
    : "Continue to purchase";
  const siteFitStatus = getSiteFitCapacityStatus(result.remainingCapacity, parcel);
  const feeJurisdiction = resolveFeeJurisdiction(parcel);
  const feeThreshold = assessImpactFeeThreshold(result.aduSqft);
  const lockedBidItems = BID_LEVELING_CHECKLIST.length - BID_CHECKLIST_PREVIEW_COUNT;
  const recoveryPending = !purchased && Boolean(recovery.intent && recovery.intent.kind !== "cancel");
  const reportBusy = busy || loading || preparingBrief || projectBriefLoading || (recoveryPending && Boolean(user));

  const ctaLabel = recoveryPending
    ? user
      ? recovery.status === "unverified" ? "Certificate access unverified" : "Checking certificate access"
      : "Sign in to verify certificate access"
    : reportBusy
    ? purchased
      ? "Preparing complete certificate"
      : "Preparing certificate"
    : purchased
    ? "View complete certificate"
    : !user
      ? certPrice.exact
        ? `${guestPurchaseAction} — ${price}`
        : guestPurchaseAction
      : certPrice.exact
        ? `Unlock property certificate — ${price}`
        : "Unlock property certificate";
  // Purchase terms beside the decision. Every channel sells a one-time,
  // per-property unlock; the amount is named only where it is the one billed.
  const ctaNote = purchased || recoveryPending
    ? undefined
    : `${certPrice.exact ? `One-time ${price}` : "One-time purchase"} · No subscription · Unlocks this property permanently`;

  return (
    // Centered artifact layout; the estimate and the unlock offer are its content.
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lot-orange-ink">{eyebrow}</p>
        <h2 className="lf-section-heading mt-2 text-lot-ink">Your Certificate of Feasibility.</h2>
        <p className="lf-body mx-auto mt-2 max-w-md text-lot-stone">
          Review your estimate, then create one recorded parcel, income, and approval-timeline
          artifact to share with builders and lenders.
        </p>
      </div>

      {checkoutCancelled && !purchased && (
        <p
          role="status"
          className="rounded-none border border-lot-line bg-lot-surface px-4 py-3 text-sm leading-5 text-lot-ink"
        >
          Checkout cancelled. Your property analysis is still here whenever you&apos;re ready.
        </p>
      )}

      {recoveryPending && (
        <div className="rounded-none border border-lot-line bg-lot-surface px-4 py-3 text-sm leading-5 text-lot-ink" role="status">
          <p>{!user ? "Sign in to verify your Certificate access." : recovery.status === "checking"
            ? "Checking certificate access. Your access record may still be arriving."
            : "We could not verify Certificate access yet. This does not mean your payment failed."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {user && recovery.status === "unverified" && (
              <button type="button" className="inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink" onClick={recovery.retry}>
                Check again
              </button>
            )}
            <Link className="inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink" href="/certificates">
              My Certificates
            </Link>
          </div>
        </div>
      )}

      {!purchased && (
        <div hidden={recoveryPending} className="rounded-none border border-lot-line bg-lot-surface px-4 py-5 sm:px-6">
          <div className="flex items-start gap-2">
            <Lock size={16} className="mt-0.5 shrink-0 text-lot-orange-ink" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-lot-ink">
              Unlock the complete ADU feasibility &amp; builder bid packet
              {certPrice.exact ? ` — one-time ${price}` : " — one-time purchase"}
            </h3>
          </div>
          <p className="lf-body-sm mt-1 text-lot-stone">
            For {parcel.address}. The estimate below is free. The certificate adds what you
            need to decide and to compare builders: whether rent covers the loan, the fees and
            permit paperwork for this size, and a scope sheet that makes three quotes cover the
            same job.
          </p>
          <div
            className={`mt-4 flex items-start gap-3 rounded-none border px-4 py-3 ${
              siteFitStatus.tone === "ok"
                ? "border-status-eligible/25 bg-status-eligible/5"
                : "border-status-review/35 bg-status-review/5"
            }`}
          >
            {siteFitStatus.tone === "ok" ? (
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0 text-status-eligible"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-status-review"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="lf-dataprint text-lot-orange-ink">Current concept</p>
              <p className="mt-1 text-sm font-semibold text-lot-ink">
                {siteFitStatus.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-lot-stone">
                {siteFitStatus.action} The certificate preserves this finding with the
                assumptions, financial model, and next steps behind it.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-none border border-lot-line bg-lot-chalk">
            <p
              id={includedHeadingId}
              className="lf-dataprint border-b border-lot-line px-4 py-2.5 text-lot-orange-ink"
            >
              Included in your certificate
            </p>
            <ul aria-labelledby={includedHeadingId} className="divide-y divide-lot-line">
              <li className="flex items-start gap-3 px-4 py-3">
                <Lock size={14} className="mt-0.5 shrink-0 text-lot-stone" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-lot-ink">Leveraged monthly cash-flow pro forma</h4>
                  <p className="mt-0.5 text-xs leading-5 text-lot-stone">
                    Two financing options against local rent, the equity each payment builds, and the
                    rent or cash in that makes it positive
                  </p>
                  <dl className="mt-2 divide-y divide-lot-line border-y border-lot-line">
                    {FINANCING_SCENARIOS.map((scenario) => (
                      <div key={scenario.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                        <dt className="min-w-0 text-xs leading-5 text-lot-ink">
                          {scenario.label}
                          <span className="block text-lot-stone">{financingTermsLabel(scenario)}</span>
                        </dt>
                        <dd>
                          <MaskedFigure label={`${scenario.label} monthly cash flow`} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </li>
              <li className="flex items-start gap-3 px-4 py-3">
                <Lock size={14} className="mt-0.5 shrink-0 text-lot-stone" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-lot-ink">
                    {feeJurisdiction === "other"
                      ? permitAuditTitle(feeJurisdiction)
                      : "SB 13 (750 sq ft) impact-fee & permit submittal audit"}
                  </h4>
                  <p className="mt-0.5 text-xs leading-5 text-lot-stone">
                    {feeJurisdiction === "other"
                      ? "The fees and paperwork to confirm with your city for this layout"
                      : feeThreshold.isExempt
                        ? `At ${feeThreshold.sqft.toLocaleString()} sq ft: within the exemption, with the fees and paperwork that still apply`
                        : `At ${feeThreshold.sqft.toLocaleString()} sq ft: ${feeThreshold.sqftOverLimit.toLocaleString()} sq ft over the exemption, with the fees that follow and the trim that avoids them`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {permitAuditPreviewLines(feeJurisdiction).map((line) => (
                      <li key={line} className="flex items-start gap-2 text-xs leading-5 text-lot-stone">
                        <Lock size={12} className="mt-1 shrink-0" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              <li className="flex items-start gap-3 px-4 py-3">
                <Lock size={14} className="mt-0.5 shrink-0 text-lot-stone" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-lot-ink">
                    Contractor bid-leveling RFQ checklist
                  </h4>
                  <p className="mt-0.5 text-xs leading-5 text-lot-stone">
                    {BID_LEVELING_CHECKLIST.length} scope items builders often exclude, printable with
                    columns for three builders
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {BID_LEVELING_CHECKLIST.slice(0, BID_CHECKLIST_PREVIEW_COUNT).map((item, index) => (
                      <li key={item.id} className="grid grid-cols-[20px_1fr] gap-2 text-xs leading-5">
                        <span className="tabular-nums text-lot-stone">{String(index + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 text-lot-ink">
                          {item.title}
                          <span className="block text-lot-stone">{item.ask}</span>
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-xs leading-5 text-lot-stone">
                      <Lock size={12} className="shrink-0" aria-hidden="true" />
                      {lockedBidItems} more scope items, locked in the certificate
                    </li>
                  </ol>
                </div>
              </li>
              {includedSections(projectBriefPreview).map((section) => (
                <li key={section.title} className="flex items-start gap-3 px-4 py-3">
                  <Lock size={14} className="mt-0.5 shrink-0 text-lot-stone" aria-hidden="true" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-lot-ink">{section.title}</h4>
                    <p className="mt-0.5 text-xs leading-5 text-lot-stone">{section.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="lf-caption border-t border-lot-line px-4 py-2.5 text-lot-stone">
              The risk review, approval path, and timeline are AI-assisted planning estimates
              for this property.
            </p>
          </div>
          <p className="mt-4 rounded-none border border-lot-line bg-lot-chalk px-3 py-2 text-xs leading-5 text-lot-ink">
            <strong>One purchase unlocks this property.</strong> Revise the backyard home concept and
            regenerate its certificate without paying again.
          </p>
        </div>
      )}

      <EstimateSummaryPanel
        parcelName={parcelName}
        result={result}
        feasibilityStatus={feasibilityStatus}
        onGenerateReport={handleCta}
        reportCtaLabel={ctaLabel}
        reportCtaBusy={reportBusy}
        reportCtaNote={ctaNote}
        error={!purchased ? error : null}
        certificateUnlocked={purchased}
        feeJurisdiction={feeJurisdiction}
      />

      {purchased && (
        <div hidden={recoveryPending} className="rounded-none border border-lot-line bg-lot-surface px-6 py-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-status-eligible" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-lot-ink">Certificate unlocked</h3>
                <StatusChip status="clear" label="Purchased" />
              </div>
              <p className="lf-body-sm mt-1 text-lot-stone">
                Your complete Certificate of Feasibility for {parcelName} is ready to print,
                download, or share. This property remains unlocked when you revise the concept
                and regenerate the certificate.
              </p>
              {projectBrief ? (
                <div className="mt-3 flex items-start gap-2 border-t border-lot-line pt-3">
                  <Sparkles
                    size={15}
                    className="mt-0.5 shrink-0 text-status-eligible"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="lf-dataprint text-status-eligible">
                      AI brief recorded
                    </p>
                    <p className="mt-1 text-xs font-semibold text-lot-ink">
                      {projectBrief.headline}
                    </p>
                    {projectBriefSavedAt && (
                      <p className="mt-1 text-xs leading-5 text-lot-stone">
                        Saved Brief snapshot. Verify these historical notes against current guidance.
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] leading-4 text-lot-stone">
                      Parcel assessment + {projectBrief.totalEstWeeksLow}&ndash;
                      {projectBrief.totalEstWeeksHigh} week approval timeline
                    </p>
                  </div>
                </div>
              ) : projectBriefLoading || preparingBrief ? (
                <div className="mt-3 border-t border-lot-line pt-3" role="status">
                  <span className="sr-only">Adding property notes and timeline</span>
                  <div>
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="mt-2 h-2.5 w-4/5" />
                  </div>
                </div>
              ) : projectBriefError ? (
                <div className="mt-3 flex items-start gap-2 border-t border-lot-line pt-3 text-xs leading-5 text-status-blocked">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  The core certificate is ready. Property notes could not be
                  added yet.
                </div>
              ) : null}
              {error && (
                <p role="alert" className="mt-3 text-xs leading-5 text-status-blocked">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Methodology stays one tap away, below the purchase decision rather than above it. */}
      <details className="rounded-none border border-lot-line bg-lot-chalk px-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
          Methodology &amp; data sources
        </summary>
        <div className="space-y-2 pb-4 text-xs leading-5 text-lot-stone">
          <p>
            <strong className="font-semibold text-lot-ink">Build cost:</strong> a per-square-foot
            construction base by exterior finish, roof and openings, adjusted by a regional cost
            factor where the market data has one, plus an allowance for design, engineering and
            permits.
          </p>
          <p>
            <strong className="font-semibold text-lot-ink">Rent:</strong> {result.rentBasis}.{" "}
            {marketProvenanceLine(result.market)}.
          </p>
          <p>
            <strong className="font-semibold text-lot-ink">Net income and payback:</strong> annual
            net income subtracts a {formatOperatingShare(result.operatingExpenseRatio)} operating
            allowance from gross rent; payback divides the mid-range build cost by that income,
            before financing.
          </p>
          <p>
            <strong className="font-semibold text-lot-ink">Cash flow (certificate):</strong>{" "}
            fixed-rate, fully amortizing payments on the build cost range at{" "}
            {FINANCING_SCENARIOS.map((scenario) => `${(scenario.annualRate * 100).toFixed(1)}% over ${scenario.years} years (${Math.round(scenario.financedShare * 100)}% financed)`).join(" or ")},
            after the same operating allowance. Illustrative terms, not a lender quote.
          </p>
          {feeJurisdiction !== "other" && (
            <p>
              <strong className="font-semibold text-lot-ink">Impact fees (certificate):</strong>{" "}
              California&apos;s exemption for ADUs of 750 sq ft of interior livable space or less
              (HCD ADU Handbook, March 2026), checked against the Studio&apos;s outside footprint.
            </p>
          )}
          <p>
            Planning estimate only. Not a permit, appraisal, architectural or engineering opinion, lending decision, government determination, or guarantee of income. Third-party data may be incomplete or outdated; verify with local authorities and licensed professionals before building or investing.
          </p>
        </div>
      </details>

      {!purchased && emailLinkCard}

      <AuthModal
        isOpen={authOpen}
        initialMode={recoveryPending ? "sign-in" : "sign-up"}
        analyticsSurface="studio"
        analyticsSource="certificate_purchase"
        onClose={handleAuthClose}
      />
    </div>
  );
}
