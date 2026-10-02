"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type { AIProjectBrief, AIProjectBriefResponse } from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { StatusChip } from "@/components/ui/StatusChip";
import { trackPurchase } from "@/lib/analytics/adsConversion";
import {
  mapFeasibilityVerdict,
  mapPurchaseChannel,
  trackCertificateCheckoutStarted,
  trackCertificatePaywallViewed,
  trackCertificatePurchase,
} from "@/lib/analytics/events";
import { certificateKey } from "@/lib/certificate-key";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { useStorePrice } from "@/lib/commerce/store-price";
import { detectPurchaseChannel } from "@/lib/commerce/purchase-channel";
import { useCertificateAccess } from "@/lib/certificate-access";
import { getSiteFitCapacityStatus } from "@/lib/site-fit";
import {
  CertificateCheckoutError,
  startCertificateCheckout,
} from "@/lib/certificate-checkout";
import { stashInitialParcel } from "@/lib/parcel-handoff";
import type { LiveParcelData } from "@/lib/parcel-types";
import EstimateSummaryPanel from "./EstimateSummaryPanel";

/** What the complete certificate includes — the paid deliverable's contents. */
const CERTIFICATE_INCLUDES = [
  "Property-specific feasibility record",
  "Modeled site-fit flags and assumptions",
  "Cost, rent, NOI, and payback summary",
  "AI property notes and approval path, when available",
  "Recommended next steps",
  "Print, CSV, and shareable scenario link",
] as const;

/** Props for {@link CertificatePanel}. */
export interface CertificatePanelProps {
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
  parcel,
  result,
  parcelName,
  eyebrow = "Step 4 · Certificate",
  onOpenCertificate,
  projectBrief,
  projectBriefLoading,
  projectBriefError,
  onGenerateProjectBrief,
}: CertificatePanelProps) {
  const { user } = useAuth();
  const certKey = certificateKey(parcel);
  const { purchased, loading, refresh, analyticsOrderId, amount } = useCertificateAccess(user?.uid, certKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [preparingBrief, setPreparingBrief] = useState(false);
  const openedOnUnlock = useRef(false);
  const sawSettledUnpurchased = useRef(false);
  const returnedFromCheckout = useRef(false);
  const adsConversionFiredFor = useRef<string | null>(null);
  const paywallViewedFor = useRef<string | null>(null);

  // A parcel switch is a new purchase context — never carry unlock history
  // from one certificate key to another.
  useEffect(() => {
    openedOnUnlock.current = false;
    sawSettledUnpurchased.current = false;
    returnedFromCheckout.current = false;
    adsConversionFiredFor.current = null;
    paywallViewedFor.current = null;
  }, [certKey]);

  // Track certificate paywall view once per lot context for unpurchased visitors.
  useEffect(() => {
    if (loading || purchased) return;
    if (paywallViewedFor.current === certKey) return;
    paywallViewedFor.current = certKey;
    const channel = mapPurchaseChannel(detectPurchaseChannel());
    const status = mapFeasibilityVerdict(result.zoningStatus);
    trackCertificatePaywallViewed({
      auth_state: user ? "signed_in" : "guest",
      feasibility_status: status,
      purchase_channel: channel,
    });
  }, [loading, purchased, certKey, user, result.zoningStatus]);

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

  // Reconcile the Stripe return. The webhook writes the grant asynchronously, so
  // poll a few times after landing on ?cert=<certKey>, then strip the param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returned = params.get("cert");
    if (!returned) return;
    // The success URL stamps which certificate was bought; only treat the
    // return as this panel's unlock when the keys match. "1" is the legacy
    // stamp from sessions created before the key was included.
    const matchesThisPanel = returned === certKey || returned === "1";
    if (matchesThisPanel) returnedFromCheckout.current = true;
    // Always strip the marker — leaving it in place would re-arm the unlock
    // on every reload once the grant exists.
    params.delete("cert");
    const next = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${next ? `?${next}` : ""}`,
    );
    if (!matchesThisPanel || purchased) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      refresh();
      if (tries >= 5) window.clearInterval(timer);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [refresh, purchased, certKey]);

  // Open the artifact once when a purchase resolves in this session — a demo
  // or webhook grant observed after a settled unpurchased read, or a Stripe
  // checkout return. A grant read passively on a fresh visit must not
  // regenerate the AI brief or pop the certificate; the CTA covers that path.
  useEffect(() => {
    const unlockedThisSession =
      sawSettledUnpurchased.current || returnedFromCheckout.current;
    if (purchased && user && unlockedThisSession && !openedOnUnlock.current) {
      openedOnUnlock.current = true;
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
  }, [loading, prepareAndOpenCertificate, purchased, user]);

  // Report the GA4 purchase event and Google Ads conversion exactly once per Stripe
  // checkout return using the safe, opaque analyticsOrderId.
  // Suppresses emission if analyticsOrderId is absent to guarantee zero PII transmission.
  useEffect(() => {
    if (!purchased || !user) return;
    if (!returnedFromCheckout.current) return;
    if (adsConversionFiredFor.current === certKey) return;
    if (!analyticsOrderId) return;
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
  }, [purchased, user, certKey, analyticsOrderId, amount]);

  async function handleCta() {
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
  const reportBusy = busy || loading || preparingBrief || projectBriefLoading;
  const ctaLabel = reportBusy
    ? purchased
      ? "Preparing complete certificate"
      : "Preparing certificate"
    : purchased
    ? "View complete certificate"
    : !user
      ? "Sign in to generate your certificate"
      : certPrice.exact
        ? `Unlock complete certificate — ${price}`
        : "Unlock complete certificate";

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

      <EstimateSummaryPanel
        parcelName={parcelName}
        result={result}
        onGenerateReport={handleCta}
        reportCtaLabel={ctaLabel}
        reportCtaBusy={reportBusy}
        error={!purchased ? error : null}
      />

      <div className="rounded-none border border-lot-line bg-lot-surface px-6 py-5">
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
                    <p className="mt-0.5 text-[11px] leading-4 text-lot-stone">
                      Parcel assessment + {projectBrief.totalEstWeeksLow}&ndash;
                      {projectBrief.totalEstWeeksHigh} week approval timeline
                    </p>
                  </div>
                </div>
              ) : projectBriefLoading || preparingBrief ? (
                <div className="mt-3 border-t border-lot-line pt-3" role="status">
                  <span className="sr-only">Adding property notes and timeline</span>
                  <div className="motion-safe:animate-pulse">
                    <div className="h-2.5 w-28 rounded bg-lot-stone-soft" />
                    <div className="mt-2 h-2.5 w-4/5 rounded bg-lot-stone-soft" />
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
              The estimate above is free. The certificate turns this scenario into a
              decision record you can review with builders, lenders, and local professionals.
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
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {CERTIFICATE_INCLUDES.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-lot-stone">
                  <CheckCircle2 size={15} className="shrink-0 text-status-eligible" />
                  {item}
                </li>
              ))}
            </ul>
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
