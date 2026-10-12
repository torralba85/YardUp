"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type {
  AIProjectBrief,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
} from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { trackPurchase } from "@/lib/analytics/adsConversion";
import {
  mapFeasibilityVerdict,
  mapPurchaseChannel,
  trackCertificateCheckoutCancelled,
  trackCertificateCheckoutRedirected,
  trackCertificateCheckoutStarted,
  trackCertificatePaywallViewed,
  trackCertificatePurchase,
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
import { stashInitialParcel } from "@/lib/parcel-handoff";
import type { LiveParcelData } from "@/lib/parcel-types";
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
      title: "Printable, shareable property record",
      detail: "Print, export CSV, share a link, or connect with builders",
    },
  ];
}

/** Props for {@link CertificatePanel}. */
export interface CertificatePanelProps {
  recovery: CertificateRecovery;
  /** The active parcel (its identity keys the purchase). */
  parcel: Parcel;
  /** The feasibility result summarized on the certificate. */
  result: FeasibilityResult;
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
  recovery,
  parcel,
  result,
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
  const { user } = useAuth();
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
    const status = mapFeasibilityVerdict(result.zoningStatus);
    trackCertificatePaywallViewed({
      auth_state: user ? "signed_in" : "guest",
      feasibility_status: status,
      purchase_channel: channel,
    });
  }, [loading, purchased, certKey, user, result.zoningStatus, recovery]);

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

  async function handleCta() {
    if (recovery.intent && recovery.intent.kind !== "cancel" && !purchased && user) return;
    if (purchased) {
      await prepareAndOpenCertificate();
      return;
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    recovery.acknowledgeCancellation();

    const channel = mapPurchaseChannel(detectPurchaseChannel());
    const status = mapFeasibilityVerdict(result.zoningStatus);
    trackCertificateCheckoutStarted({
      value: CERTIFICATE_PRICE_CENTS / 100,
      currency: "USD",
      purchase_channel: channel,
      feasibility_status: status,
    });

    try {
      const idToken = await user.getIdToken();
      const isLive = "source" in parcel && Boolean(parcel.source);
      if (isLive) {
        stashInitialParcel(parcel as unknown as LiveParcelData);
      }
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
          feasibility_status: status,
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
  }

  // A store shell is charged the store's own localized amount, so the paywall
  // names a price only when it is the one that will actually be billed.
  const certPrice = useStorePrice("certificate");
  const price = certPrice.amountCompact;
  const siteFitStatus = getSiteFitCapacityStatus(result.remainingCapacity, parcel);
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
      ? "Sign in to generate your certificate"
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
        <div className="border border-lot-line bg-lot-surface px-4 py-3 text-sm leading-5 text-lot-ink" role="status">
          <p>{!user ? "Sign in to verify your Certificate access." : recovery.status === "checking"
            ? "Checking certificate access. Your access record may still be arriving."
            : "We could not verify Certificate access yet. This does not mean your payment failed."}</p>
          {user && recovery.status === "unverified" && (
            <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-lot-orange-ink underline" onClick={recovery.retry}>
              Check again
            </button>
          )}
          <Link className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline" href="/certificates">
            My Certificates
          </Link>
        </div>
      )}

      <EstimateSummaryPanel
        parcelName={parcelName}
        result={result}
        onGenerateReport={handleCta}
        reportCtaLabel={ctaLabel}
        reportCtaBusy={reportBusy}
        reportCtaNote={ctaNote}
        error={!purchased ? error : null}
      />

      <div hidden={recoveryPending} className="rounded-none border border-lot-line bg-lot-surface px-6 py-5">
        {purchased ? (
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-status-eligible" />
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
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Lock size={16} className="shrink-0 text-lot-orange-ink" />
              <h3 className="text-sm font-semibold text-lot-ink">
                Unlock the complete record for {parcel.address}
                {certPrice.exact ? ` — one-time ${price}` : " — one-time purchase"}
              </h3>
            </div>
            <p className="lf-body-sm mt-1 text-lot-stone">
              The estimate above is free. The certificate adds what it leaves out: what could
              stop this project, what to verify, and what happens next, recorded for this
              property so you can take it to builders, lenders, and local professionals.
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
              <strong>One purchase unlocks this property.</strong> Revise the ADU concept and
              regenerate its certificate without paying again.
            </p>
            <p className="lf-caption mt-3 text-lot-stone">
              Planning estimate only. Not a permit, appraisal, architectural or engineering opinion, lending decision, government determination, or guarantee of income. Third-party data may be incomplete or outdated; verify with local authorities and licensed professionals before building or investing.
            </p>
          </>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
