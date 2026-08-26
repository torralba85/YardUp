"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type { AIProjectBrief, AIProjectBriefResponse } from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { StatusChip } from "@/components/ui/StatusChip";
import { certificateKey } from "@/lib/certificate-key";
import { formatCertificatePrice } from "@/lib/certificate-pricing";
import { useCertificateAccess } from "@/lib/certificate-access";
import {
  CertificateCheckoutError,
  startCertificateCheckout,
} from "@/lib/certificate-checkout";
import EstimateSummaryPanel from "./EstimateSummaryPanel";

/** What the complete certificate includes — the paid deliverable's contents. */
const CERTIFICATE_INCLUDES = [
  "Certificate of Feasibility",
  "Income and payback summary",
  "Site plan and 3D view",
  "Zoning and setback summary",
  "Property notes and approval timeline",
  "Print / PDF and shareable link",
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
  const { purchased, loading, refresh } = useCertificateAccess(user?.uid, certKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [preparingBrief, setPreparingBrief] = useState(false);
  const openedOnUnlock = useRef(false);
  const sawSettledUnpurchased = useRef(false);
  const returnedFromCheckout = useRef(false);

  // A parcel switch is a new purchase context — never carry unlock history
  // from one certificate key to another.
  useEffect(() => {
    openedOnUnlock.current = false;
    sawSettledUnpurchased.current = false;
    returnedFromCheckout.current = false;
  }, [certKey]);

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
      null,
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
    try {
      const idToken = await user.getIdToken();
      const outcome = await startCertificateCheckout({ certKey, parcelName, idToken });
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

  const price = formatCertificatePrice();
  const reportBusy = busy || loading || preparingBrief || projectBriefLoading;
  const ctaLabel = reportBusy
    ? purchased
      ? "Preparing complete certificate"
      : "Preparing certificate"
    : purchased
    ? "View complete certificate"
    : !user
      ? "Sign in to generate your certificate"
      : `Generate complete certificate — ${price}`;

  return (
    // Centered artifact layout; the estimate and the unlock offer are its content.
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lf-clay-ink">{eyebrow}</p>
        <h2 className="lf-section-heading mt-2 text-lf-espresso">Your Certificate of Feasibility.</h2>
        <p className="lf-body mx-auto mt-2 max-w-md text-lf-muted">
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
      />

      <div className="rounded-lg border border-lf-hairline bg-lf-sand-2 px-6 py-5">
        {purchased ? (
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-lf-forest" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-lf-espresso">Certificate unlocked</h3>
                <StatusChip status="clear" label="Purchased" />
              </div>
              <p className="lf-body-sm mt-1 text-lf-muted">
                Your complete Certificate of Feasibility for {parcelName} is ready to print,
                download, or share.
              </p>
              {projectBrief ? (
                <div className="mt-3 flex items-start gap-2 border-t border-lf-hairline pt-3">
                  <Sparkles
                    size={15}
                    className="mt-0.5 shrink-0 text-lf-forest"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="lf-dataprint text-lf-forest">
                      AI brief recorded
                    </p>
                    <p className="mt-1 text-xs font-semibold text-lf-espresso">
                      {projectBrief.headline}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-lf-muted">
                      Parcel assessment + {projectBrief.totalEstWeeksLow}&ndash;
                      {projectBrief.totalEstWeeksHigh} week approval timeline
                    </p>
                  </div>
                </div>
              ) : projectBriefLoading || preparingBrief ? (
                <div className="mt-3 border-t border-lf-hairline pt-3" role="status">
                  <span className="sr-only">Adding property notes and timeline</span>
                  <div className="motion-safe:animate-pulse">
                    <div className="h-2.5 w-28 rounded bg-lf-taupe-soft" />
                    <div className="mt-2 h-2.5 w-4/5 rounded bg-lf-taupe-soft" />
                  </div>
                </div>
              ) : projectBriefError ? (
                <div className="mt-3 flex items-start gap-2 border-t border-lf-hairline pt-3 text-xs leading-5 text-lf-brick">
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
                <p role="alert" className="mt-3 text-xs leading-5 text-lf-brick">
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Lock size={16} className="shrink-0 text-lf-clay-ink" />
              <h3 className="text-sm font-semibold text-lf-espresso">
                The complete certificate is a one-time {price}
              </h3>
            </div>
            <p className="lf-body-sm mt-1 text-lf-muted">
              The estimate above is free. Unlock the shareable certificate with
              property notes and a typical approval timeline.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {CERTIFICATE_INCLUDES.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-lf-muted">
                  <CheckCircle2 size={15} className="shrink-0 text-lf-forest" />
                  {item}
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="mt-3 text-xs text-lf-brick">
                {error}
              </p>
            )}
            <p className="lf-caption mt-3 text-lf-muted">
              Planning estimate only. Not a permit, appraisal, architectural or engineering opinion, lending decision, government determination, or guarantee of income. Third-party data may be incomplete or outdated; verify with local authorities and licensed professionals before building or investing.
            </p>
          </>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
