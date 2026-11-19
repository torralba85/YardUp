"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";

/**
 * Routes the gate never covers: account deletion must work without accepting,
 * and the auth pages redirect a signed-in user to a gated page anyway, so
 * covering them only flashes the dialog mid-redirect.
 */
const UNGATED_PATHS = new Set(["/delete-account", "/login", "/signup", "/forgot-password"]);

/**
 * Blocking modal gating users whose stored legal consent receipt is not current.
 *
 * Prompts affirmatively for acceptance of the revised Terms and Privacy Policy.
 */
export function LegalReacceptGate() {
  const { user, profile, loading, acceptCurrentLegalTerms, logout } = useAuth();
  const pathname = usePathname();
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = !loading &&
    Boolean(user && profile) &&
    profile?.legalConsentCurrent === false &&
    !UNGATED_PATHS.has(pathname);

  if (!open) return null;

  const handleAccept = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await acceptCurrentLegalTerms();
    } catch {
      setError("We couldn't save your acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Blocking: no onClose, so Escape and the scrim do nothing and focus starts on the sheet.
  return (
    <Dialog
      title="We updated our Terms and Privacy Policy"
      kicker="Legal update"
      titleId="legal-reaccept-heading"
      size="md"
      footer={
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            fullWidth
            disabled={!isChecked || submitting}
            loading={submitting}
            onClick={handleAccept}
          >
            Accept and continue
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={submitting}
            onClick={() => void logout()}
          >
            Sign out
          </Button>
          <Link
            href="/delete-account"
            className="inline-flex min-h-11 items-center justify-center text-xs text-lot-stone underline underline-offset-2 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
          >
            Delete my account instead
          </Link>
        </div>
      }
    >
      <p className="lf-body-sm mb-6 text-lot-stone">
        Please review and accept the updated Terms &amp; Conditions and Privacy Policy (effective
        November 19, 2026) to keep using your account. They include an arbitration agreement with a 30-day
        opt-out, a class action waiver, limits on our liability, and a release of claims for disputes with
        builders and other third parties. This update explains how Realie uses the property address and coordinates
        for paid certificate records and comparable sales. It also identifies providers used for rental
        estimates, 3D maps, and certificate fonts.
      </p>

      <div className="mb-6">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone">
          <Checkbox
            checked={isChecked}
            onChange={(e) => {
              setIsChecked(e.target.checked);
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
              className="text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
            >
              Terms &amp; Conditions
            </Link>{" "}
            (including the arbitration agreement, class action waiver and release of claims) and the{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-status-blocked">
          {error}
        </p>
      )}
    </Dialog>
  );
}
