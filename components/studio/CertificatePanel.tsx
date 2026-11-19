"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type {
  AIProjectBrief,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
} from "@/lib/ai-types";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { AuthModal, type AuthModalCloseReason } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { trackPurchase } from "@/lib/analytics/adsConversion";
import {
  mapPurchaseChannel,
  trackCertificateCheckoutCancelled,
  trackCertificateCheckoutRedirected,
  trackCertificateCheckoutStarted,
  trackCertificatePassRedeemed,
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
import {
  CertificateCheckoutError,
  claimCertificatesByEmail,
  startCertificateCheckout,
} from "@/lib/certificate-checkout";
import { clearInitialParcel, stashInitialParcel } from "@/lib/parcel-handoff";
import { consumeAddressQuery, stashAddressQuery } from "@/lib/address-handoff";
import {
  clearCertificatePurchaseIntent,
  hasCertificatePurchaseIntent,
  rememberCertificatePurchaseIntent,
} from "@/lib/certificate-purchase-intent";
import type { LiveParcelData } from "@/lib/parcel-types";
import {
  AgentPassError,
  clearAgentPassRedeemIntent,
  clearAgentPass,
  hasAgentPassRedeemIntent,
  readAgentPass,
  redeemAgentPass,
  rememberAgentPass,
  rememberAgentPassRedeemIntent,
} from "@/lib/agent-pass";
import {
  FINANCING_SCENARIOS,
  formatOperatingShare,
} from "@/lib/certificate-pro-forma";
import {
  feeJurisdiction as resolveFeeJurisdiction,
} from "@/lib/certificate-permit-audit";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import AgentPassOffer from "./AgentPassOffer";
import SaveCertificateAccountCard from "./SaveCertificateAccountCard";

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
 * Point the current URL's `step` at the certificate, or drop it, without a
 * navigation, so a sign-in remount reopens this step.
 *
 * @returns Whether the URL changed.
 */
function setCertificateStepParam(on: boolean): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if ((params.get("step") === "certificate") === on) return false;
  if (on) params.set("step", "certificate");
  else params.delete("step");
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );
  return true;
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
  projectBriefLoading,
  projectBriefError,
  onGenerateProjectBrief,
}: CertificatePanelProps) {
  const {
    user,
    checkoutUser,
    profile,
    loading: authLoading,
    ensureCheckoutUser,
    refreshProfile,
    sendVerification,
  } = useAuth();
  const activeCheckoutUser = checkoutUser ?? user;
  const certKey = certificateKey(parcel);
  const { purchased, loading, refresh, analyticsOrderId, amount } = recovery.access;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLegalAccepted, setGuestLegalAccepted] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authModeOverride, setAuthModeOverride] = useState<"sign-in" | "sign-up" | null>(null);
  const [preparingBrief, setPreparingBrief] = useState(false);
  const [claimNotice, setClaimNotice] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const checkoutCancelled = recovery.intent?.kind === "cancel";
  const openedOnUnlock = useRef(false);
  const sawSettledUnpurchased = useRef(false);
  const adsConversionFiredFor = useRef<string | null>(null);
  const paywallViewedFor = useRef<string | null>(null);
  const autoClaimedFor = useRef<string | null>(null);
  const pendingClaimAfterSignIn = useRef(false);
  const [linkedPassCode, setLinkedPassCode] = useState<string | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const purchaseOperation = useRef(false);
  const linkHandoffRef = useRef<{
    stashedParcel: boolean;
    stashedAddress: boolean;
    addedStepParam: boolean;
  } | null>(null);

  const prepareLinkHandoff = useCallback(() => {
    const isLive =
      "source" in parcel &&
      (parcel.source === "regrid" ||
        parcel.source === "county-gis" ||
        parcel.source === "fallback");
    let stashedParcel = false;
    let stashedAddress = false;
    if (isLive) {
      stashedParcel = stashInitialParcel(parcel as unknown as LiveParcelData);
    } else if ("source" in parcel && parcel.source === "estimated") {
      // Demo presets restore from the scenario URL. Estimated parcels need a full address.
      const addressQuery =
        parcelName.trim() ||
        [parcel.address, parcel.city]
          .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
          .join(", ");
      if (addressQuery) {
        stashAddressQuery(addressQuery);
        stashedAddress = true;
      }
    }
    const addedStepParam = setCertificateStepParam(true);
    linkHandoffRef.current = { stashedParcel, stashedAddress, addedStepParam };
  }, [parcel, parcelName]);

  const rollbackLinkHandoff = useCallback(() => {
    const handoff = linkHandoffRef.current;
    linkHandoffRef.current = null;
    if (!handoff) return;
    if (handoff.stashedParcel) clearInitialParcel();
    if (handoff.stashedAddress) consumeAddressQuery();
    if (handoff.addedStepParam) setCertificateStepParam(false);
  }, []);

  // The agent's code was captured from the link when the Studio opened.
  useEffect(() => {
    // Reads sessionStorage once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinkedPassCode(readAgentPass());
  }, []);

  // A parcel switch is a new purchase context — never carry unlock history
  // from one certificate key to another.
  useEffect(() => {
    openedOnUnlock.current = false;
    sawSettledUnpurchased.current = false;
    adsConversionFiredFor.current = null;
    paywallViewedFor.current = null;
    autoClaimedFor.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaimNotice(null);
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
    if (!activeCheckoutUser) {
      setAuthOpen(true);
      return;
    }

    setPreparingBrief(true);
    setError(null);
    try {
      if (!projectBrief) {
        let idToken: string;
        try {
          idToken = await activeCheckoutUser.getIdToken();
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
  }, [activeCheckoutUser, onGenerateProjectBrief, onOpenCertificate, projectBrief]);

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
    if (purchased && activeCheckoutUser && unlockedThisSession && !openedOnUnlock.current) {
      if (recovery.intent && recovery.intent.kind !== "cancel" && !recovery.consumeOpen()) return;
      openedOnUnlock.current = true;
      // Preparing the Report follows an externally verified Grant transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void prepareAndOpenCertificate();
    }
    // Only an authenticated read (registered or anonymous checkout session)
    // counts as "settled unpurchased": before Firebase auth resolves, the
    // access hook reports not-loading/not-purchased for the guest uid, and
    // treating that as settled would make a returning purchaser's grant look
    // like an in-session unlock on every fresh load.
    if (activeCheckoutUser && !loading && !purchased) {
      sawSettledUnpurchased.current = true;
      openedOnUnlock.current = false;
    }
  }, [activeCheckoutUser, loading, prepareAndOpenCertificate, purchased, recovery]);

  // Report the GA4 purchase event and Google Ads conversion exactly once per Stripe
  // checkout return using the safe, opaque analyticsOrderId.
  // Suppresses emission if analyticsOrderId is absent to guarantee zero PII transmission.
  useEffect(() => {
    if (!purchased || !activeCheckoutUser) return;
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
  }, [activeCheckoutUser, purchased, certKey, analyticsOrderId, amount, recovery]);

  const attemptClaimForUser = useCallback(
    async (signedInUser: FirebaseUser, explicit: boolean) => {
      if (!signedInUser.emailVerified) {
        if (explicit) {
          setClaimNotice(
            "Verify your email address before recovering a guest purchase made with that email.",
          );
        }
        return;
      }
      if (explicit) {
        setClaimBusy(true);
        setClaimNotice(null);
      }
      try {
        // Forced: a token minted before email verification still says
        // email_verified=false, and the claim route rejects it.
        const idToken = await signedInUser.getIdToken(true);
        const outcome = await claimCertificatesByEmail(idToken, certKey);
        if (
          outcome.claimedCertKeys.includes(certKey) ||
          outcome.alreadyOwnedCertKeys.includes(certKey)
        ) {
          setClaimNotice(null);
          refresh();
        } else if (explicit) {
          setClaimNotice(
            "No paid guest purchase matching your verified email was found for this property.",
          );
        }
      } catch (err) {
        if (explicit) {
          setClaimNotice(
            err instanceof CertificateCheckoutError
              ? err.message
              : "Could not check for guest purchases right now.",
          );
        }
      } finally {
        if (explicit) setClaimBusy(false);
      }
    },
    [certKey, refresh],
  );

  // When a verified member lands on a lot they don't own yet (or just signed in
  // after an account-exists linking collision / cleared-storage return),
  // automatically check for a matching paid guest purchase once per uid:certKey.
  useEffect(() => {
    if (!user || authLoading || loading || purchased) return;
    const claimKey = `${user.uid}:${certKey}`;
    const explicit = pendingClaimAfterSignIn.current;
    if (!explicit && autoClaimedFor.current === claimKey) return;
    if (explicit && !user.emailVerified) {
      pendingClaimAfterSignIn.current = false;
      setClaimNotice(
        "Verify your email address before recovering a guest purchase made with that email.",
      );
      return;
    }
    if (!user.emailVerified) return;
    autoClaimedFor.current = claimKey;
    pendingClaimAfterSignIn.current = false;
    void attemptClaimForUser(user, explicit);
  }, [attemptClaimForUser, authLoading, certKey, loading, purchased, user]);

  const beginCheckout = useCallback(async (
    authenticatedUser: FirebaseUser,
    legalConsent?: typeof CURRENT_LEGAL_CONSENT,
  ) => {
    if (purchaseOperation.current) return;
    purchaseOperation.current = true;
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
        legalConsent,
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
      purchaseOperation.current = false;
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

  const redeemPass = useCallback(async (authenticatedUser: FirebaseUser, code: string) => {
    if (purchaseOperation.current) return;
    purchaseOperation.current = true;
    setPassBusy(true);
    setPassError(null);
    try {
      const idToken = await authenticatedUser.getIdToken();
      const isLive = "source" in parcel && Boolean(parcel.source);
      await redeemAgentPass({
        code,
        certKey,
        idToken,
        parcelName,
        address: "address" in parcel && typeof parcel.address === "string" ? parcel.address : undefined,
        city: "city" in parcel && typeof parcel.city === "string" ? parcel.city : undefined,
        state: "state" in parcel && typeof parcel.state === "string" ? parcel.state : undefined,
        zip: "zip" in parcel && typeof parcel.zip === "string" ? parcel.zip : undefined,
        lat: "lat" in parcel && typeof parcel.lat === "number" ? parcel.lat : undefined,
        lng: "lng" in parcel && typeof parcel.lng === "number" ? parcel.lng : undefined,
        parcelData: isLive ? (parcel as unknown as Record<string, unknown>) : undefined,
      });
      trackCertificatePassRedeemed({ feasibility_status: feasibilityStatus });
      refresh(); // the $0 grant is written; unlock in place
    } catch (err) {
      setPassError(
        err instanceof AgentPassError ? err.message : "Could not apply this code. Please try again.",
      );
    } finally {
      purchaseOperation.current = false;
      setPassBusy(false);
    }
  }, [certKey, feasibilityStatus, parcel, parcelName, refresh]);

  // A guest's claim click survives the account step the same way a purchase
  // click does, and resumes once the new session's reads have settled.
  useEffect(() => {
    if (!user || authLoading || loading) return;
    if (!hasAgentPassRedeemIntent(certKey)) return;
    clearAgentPassRedeemIntent();
    const code = readAgentPass();
    if (!code || profile?.role === "builder" || purchased) return;
    // Resuming follows an explicit claim click and a completed sign-in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void redeemPass(user, code);
  }, [authLoading, certKey, loading, profile, purchased, redeemPass, user]);

  async function handlePassRedeem(code: string) {
    if (purchaseOperation.current) return;
    clearCertificatePurchaseIntent();
    rememberAgentPass(code);
    setLinkedPassCode(code);
    if (!user) {
      if ("source" in parcel && Boolean(parcel.source)) {
        stashedForPurchase.current = stashInitialParcel(parcel as unknown as LiveParcelData);
      }
      rememberAgentPassRedeemIntent(certKey);
      setAuthOpen(true);
      return;
    }
    await redeemPass(user, code);
  }

  const certPrice = useStorePrice("certificate");
  const price = certPrice.amountCompact;
  const isWebChannel = certPrice.channel === "web";

  async function handleCta() {
    if (purchaseOperation.current) return;
    clearAgentPassRedeemIntent();
    const recoveryActive = Boolean(recovery.intent && recovery.intent.kind !== "cancel");
    if (recoveryActive && !purchased && activeCheckoutUser) return;
    if (purchased) {
      await prepareAndOpenCertificate();
      return;
    }
    if (!user) {
      if (!recoveryActive && isWebChannel) {
        if (!guestLegalAccepted) {
          setError(
            "Confirm that you are 18 or older and accept the Terms and Privacy Policy before continuing to checkout.",
          );
          return;
        }
        if (typeof ensureCheckoutUser === "function") {
          let targetUser = activeCheckoutUser;
          if (!targetUser) {
            setBusy(true);
            setError(null);
            try {
              targetUser = await ensureCheckoutUser();
            } catch (err: unknown) {
              const code = getAuthErrorCode(err);
              setBusy(false);
              setError(
                code === "auth/operation-not-allowed" ||
                  code === "auth/admin-restricted-operation"
                  ? "Guest checkout is not enabled yet. Please create a free account or sign in to continue."
                  : code
                    ? getAuthErrorMessage(code)
                    : "Could not start checkout. Please try again.",
              );
              return;
            }
          }
          await beginCheckout(targetUser, CURRENT_LEGAL_CONSENT);
          return;
        }
      }
      if (!recoveryActive) {
        // Signing in remounts the Studio for a real address, so keep the lot
        // and the purchase click where the next mount can find them.
        if ("source" in parcel && Boolean(parcel.source)) {
          stashedForPurchase.current = stashInitialParcel(parcel as unknown as LiveParcelData);
        }
        rememberCertificatePurchaseIntent(certKey);
      }
      setAuthModeOverride(recoveryActive ? "sign-in" : null);
      setAuthOpen(true);
      return;
    }
    await beginCheckout(user);
  }

  function handleAuthClose(reason: AuthModalCloseReason) {
    setAuthOpen(false);
    setAuthModeOverride(null);
    if (reason === "signed-in") return;
    pendingClaimAfterSignIn.current = false;
    rollbackLinkHandoff();
    // Dismissed without an account: never start this purchase or claim on a later sign-in.
    clearCertificatePurchaseIntent();
    clearAgentPassRedeemIntent();
    if (stashedForPurchase.current) {
      clearInitialParcel();
      stashedForPurchase.current = false;
    }
  }

  const guestPurchaseAction = isWebChannel
    ? "Continue to secure checkout"
    : "Continue to purchase";
  const feeJurisdiction = resolveFeeJurisdiction(parcel);
  const recoveryPending = !purchased && Boolean(recovery.intent && recovery.intent.kind !== "cancel");
  const reportBusy = busy || passBusy || loading || preparingBrief || projectBriefLoading || (recoveryPending && Boolean(activeCheckoutUser));

  const ctaLabel = recoveryPending
    ? activeCheckoutUser
      ? recovery.status === "unverified" ? "Certificate access unverified" : "Checking certificate access"
      : "Sign in to verify certificate access"
    : reportBusy
    ? purchased
      ? "Preparing complete certificate"
      : busy
        ? isWebChannel ? "Opening secure checkout" : "Opening purchase"
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

  // Web only: a store shell sells digital goods through its own billing.
  const showPassOffer = !purchased && !recoveryPending && profile?.role !== "builder" && certPrice.channel === "web";
  const passOffer = (
    <AgentPassOffer
      linkedCode={linkedPassCode}
      busy={passBusy || busy || loading}
      error={passError}
      signedIn={Boolean(user)}
      onRedeem={(code) => void handlePassRedeem(code)}
      onClear={() => {
        clearAgentPass();
        clearAgentPassRedeemIntent();
        setLinkedPassCode(null);
        setPassError(null);
      }}
    />
  );

  const guestConsentControl = !purchased && !recoveryPending && !user && isWebChannel ? (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-5 text-lot-stone">
      <Checkbox
        checked={guestLegalAccepted}
        onChange={(event) => {
          setGuestLegalAccepted(event.target.checked);
          if (error) setError(null);
        }}
        className="mt-0.5"
      />
      <span>
        I confirm I am 18 or older and agree to the{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener"
          className="text-lot-orange-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
        >
          Terms &amp; Conditions
        </Link>{" "}
        (including the arbitration agreement, class action waiver and release of claims) and{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener"
          className="text-lot-orange-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
        >
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  ) : undefined;

  return (
    // Centered artifact layout; the estimate and the unlock offer are its content.
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lot-orange-ink">{eyebrow}</p>
        <h2 className="lf-section-heading mt-2 text-lot-ink">Your Certificate of Feasibility.</h2>
        <p className="lf-body mx-auto mt-2 max-w-md text-lot-stone">
          Will rent cover your loan payment, and is your builder&apos;s scope complete? Unlock your financing cash flow model, itemized cost allowances, scope checklist, and site plan PDF.
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
          <p>{!activeCheckoutUser ? "Sign in to verify your Certificate access." : recovery.status === "checking"
            ? "Checking certificate access. Your access record may still be arriving."
            : "We could not verify Certificate access yet. This does not mean your payment failed."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {activeCheckoutUser && recovery.status === "unverified" && (
              <button type="button" className="inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink" onClick={recovery.retry}>
                Check again
              </button>
            )}
            {user && !user.emailVerified && typeof refreshProfile === "function" && (
              <Button
                type="button"
                variant="secondary"
                size="xs"
                loading={claimBusy}
                onClick={async () => {
                  await refreshProfile();
                }}
              >
                I&apos;ve verified my email
              </Button>
            )}
            {user && user.emailVerified && (
              <Button
                type="button"
                variant="secondary"
                size="xs"
                loading={claimBusy}
                onClick={() => void attemptClaimForUser(user, true)}
              >
                Check for guest purchase
              </Button>
            )}
            <Link className="inline-flex min-h-11 items-center rounded-control px-1 text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink" href="/certificates">
              My Certificates
            </Link>
          </div>
        </div>
      )}

      {claimNotice && !purchased && (
        <div role="status" className="rounded-none border border-lot-line bg-lot-surface px-4 py-3 text-xs leading-5 text-lot-ink">
          <p>{claimNotice}</p>
          {user && !user.emailVerified && (
            <div className="mt-2 flex flex-wrap gap-2">
              {typeof sendVerification === "function" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => void sendVerification().catch(() => undefined)}
                >
                  Resend verification email
                </Button>
              )}
              {typeof refreshProfile === "function" && (
                <Button
                  type="button"
                  variant="commit"
                  size="xs"
                  loading={claimBusy}
                  onClick={async () => {
                    pendingClaimAfterSignIn.current = true;
                    await refreshProfile();
                  }}
                >
                  I&apos;ve verified — check again
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* A buyer who arrived on an agent's link sees the free claim before the price. */}
      {showPassOffer && linkedPassCode && passOffer}

      <EstimateSummaryPanel
        parcelName={parcelName}
        result={result}
        feasibilityStatus={feasibilityStatus}
        onGenerateReport={() => void handleCta()}
        reportCtaLabel={ctaLabel}
        reportCtaBusy={reportBusy}
        reportCtaNote={ctaNote}
        consentControl={guestConsentControl}
        error={!purchased ? error : null}
        certificateUnlocked={purchased}
        feeJurisdiction={feeJurisdiction}
      />

      {showPassOffer && !linkedPassCode && passOffer}

      {!purchased && (
        <p className="text-center text-xs leading-5 text-lot-stone">
          Preliminary algorithmic planning estimate; does not constitute a municipal building permit, zoning warranty, or architectural certification.
        </p>
      )}

      {purchased && (
        <div hidden={recoveryPending} className="rounded-none border border-lot-line bg-lot-surface px-6 py-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-status-eligible" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-lot-ink">Certificate unlocked</h3>
                <StatusChip status="clear" label={amount === 0 ? "Complimentary" : "Purchased"} />
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

      {/* Anonymous web buyers can permanently link Google or email/password keeping the same UID. */}
      {purchased && !user && activeCheckoutUser?.isAnonymous && (
        <SaveCertificateAccountCard
          onBeforeLink={prepareLinkHandoff}
          onLinkError={rollbackLinkHandoff}
          onSignInExisting={() => {
            prepareLinkHandoff();
            pendingClaimAfterSignIn.current = true;
            setAuthModeOverride("sign-in");
            setAuthOpen(true);
          }}
        />
      )}

      {/* Methodology stays one tap away, below the purchase decision rather than above it. */}
      {purchased && <details className="rounded-none border border-lot-line bg-lot-chalk px-4">
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
            Preliminary planning estimate only. Not a survey, permit, zoning determination, appraisal, loan offer, contractor quote, or architectural, engineering, legal, tax, or financial advice. Parcel lines, setbacks, zoning signals, cost allowances, rent benchmarks, and financing scenarios are modeled approximations; site work, utilities, and local fees need site-specific verification. No one, including a builder, lender, or buyer you share this with, may rely on it as a statement of buildability, cost, or return. Verify requirements with your local jurisdiction and licensed professionals, and check any contractor&apos;s license at{" "}
            <a
              href="https://www.cslb.ca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-control text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              cslb.ca.gov
            </a>
            . Subject to the LotFoundry{" "}
            <Link
              href="/terms"
              className="rounded-control text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </details>}

      {!purchased && emailLinkCard && (
        <details className="group border-t border-lot-line">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-2 py-3 text-sm font-semibold text-lot-stone focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
            Email this layout for later
            <span aria-hidden="true" className="group-open:rotate-45">+</span>
          </summary>
          <div className="pb-4">{emailLinkCard}</div>
        </details>
      )}

      <AuthModal
        isOpen={authOpen}
        initialMode={authModeOverride ?? (recoveryPending ? "sign-in" : "sign-up")}
        analyticsSurface="studio"
        analyticsSource="certificate_purchase"
        onClose={handleAuthClose}
      />
    </div>
  );
}
