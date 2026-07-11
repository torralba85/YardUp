"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
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
  "Engraved Certificate of Feasibility",
  "Income ledger & payback",
  "Site plan & 3D massing",
  "Zoning & compliance summary",
  "AI parcel readout & approval timeline",
  "Print / PDF + shareable link",
] as const;

/** Props for {@link CertificatePanel}. */
export interface CertificatePanelProps {
  /** The active parcel (its identity keys the purchase). */
  parcel: Parcel;
  /** The feasibility result summarized on the certificate. */
  result: FeasibilityResult;
  /** Display name of the lot. */
  parcelName: string;
  /** Open the unlocked certificate artifact (the report preview). */
  onOpenCertificate: () => void;
  /** Unified AI interpretation recorded in the certificate when available. */
  projectBrief: AIProjectBrief | null;
  projectBriefLoading: boolean;
  projectBriefError: string | null;
  /** Generate the parcel + timeline brief with the signed-in user's token. */
  onGenerateProjectBrief: (idToken: string) => Promise<AIProjectBrief>;
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
          setError("We could not verify your session. Please try again.");
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
  // poll a few times after landing on ?cert=1, then strip the param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("cert") !== "1" || purchased) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      refresh();
      if (tries >= 5) window.clearInterval(timer);
    }, 1500);
    params.delete("cert");
    const next = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next ? `?${next}` : ""}`,
    );
    return () => window.clearInterval(timer);
  }, [refresh, purchased]);

  // When the purchase resolves (demo grant or webhook), open the artifact once.
  useEffect(() => {
    if (purchased && user && !openedOnUnlock.current) {
      openedOnUnlock.current = true;
      void prepareAndOpenCertificate();
    }
    if (!loading && !purchased) openedOnUnlock.current = false;
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
    // Step 4 destination layout — a centered column like BuildersPanel, not a
    // right-rail sidebar; the estimate and the unlock offer are its content.
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lf-clay">Step 4 · Certificate</p>
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
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-forest">
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
                  <span className="sr-only">Adding the AI parcel and timeline brief</span>
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
                  The core certificate is ready. The AI parcel and timeline brief could not be
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
              <Lock size={16} className="shrink-0 text-lf-clay" />
              <h3 className="text-sm font-semibold text-lf-espresso">
                The complete certificate is a one-time {price}
              </h3>
            </div>
            <p className="lf-body-sm mt-1 text-lf-muted">
              The estimate above is free. Unlock the engraved, shareable certificate with its
              AI parcel interpretation and typical approval timeline.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {CERTIFICATE_INCLUDES.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-lf-muted">
                  <CheckCircle2 size={15} className="shrink-0 text-lf-mahogany" />
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
              Estimate only. Not a permit or a guarantee of income; confirm local rules with a professional.
            </p>
          </>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
