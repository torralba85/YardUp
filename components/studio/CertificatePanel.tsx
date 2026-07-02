"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
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
  "Print / PDF + shareable link",
  "Builder-ready next steps",
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
}: CertificatePanelProps) {
  const { user } = useAuth();
  const certKey = certificateKey(parcel);
  const { purchased, loading, refresh } = useCertificateAccess(user?.uid, certKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const openedOnUnlock = useRef(false);

  // Reconcile the Stripe return. The webhook writes the grant asynchronously, so
  // poll a few times after landing on ?cert=1, then strip the param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("cert") !== "1") return;
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
  }, [refresh]);

  // When the purchase resolves (demo grant or webhook), open the artifact once.
  useEffect(() => {
    if (purchased && !openedOnUnlock.current) {
      openedOnUnlock.current = true;
      onOpenCertificate();
    }
    if (!purchased) openedOnUnlock.current = false;
  }, [purchased, onOpenCertificate]);

  async function handleCta() {
    if (purchased) {
      onOpenCertificate();
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
  const ctaLabel = purchased
    ? "View certificate"
    : !user
      ? "Sign in to generate your certificate"
      : `Generate complete certificate — ${price}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EstimateSummaryPanel
        parcelName={parcelName}
        result={result}
        onGenerateReport={handleCta}
        reportCtaLabel={ctaLabel}
        reportCtaBusy={busy || loading}
      />

      <div className="border-t border-lf-hairline bg-lf-sand-2 px-6 py-5">
        {purchased ? (
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-lf-forest" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-lf-espresso">Certificate unlocked</h3>
                <StatusChip status="clear" label="Purchased" />
              </div>
              <p className="lf-body-sm mt-1 text-lf-muted">
                Your complete Certificate of Feasibility for {parcelName} is ready to print, download, or share.
              </p>
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
              The estimate above is free. Unlock the engraved, shareable certificate to bring to a builder or lender.
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
