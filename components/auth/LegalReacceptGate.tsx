"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

/**
 * Blocking modal gating users whose stored legal consent receipt is not current.
 *
 * Prompts affirmatively for acceptance of the revised Terms and Privacy Policy.
 * Bypassed on `/delete-account` so users can delete their account without accepting.
 */
export function LegalReacceptGate() {
  const { user, profile, loading, acceptCurrentLegalTerms, logout } = useAuth();
  const pathname = usePathname();
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && profile && profile.legalConsentCurrent === false && pathname !== "/delete-account") {
      dialogRef.current?.focus();
    }
  }, [user, profile, pathname]);

  if (loading) return null;
  if (!user || !profile) return null;
  if (profile.legalConsentCurrent !== false) return null;
  if (pathname === "/delete-account") return null;

  // Keep Tab inside the dialog; the page behind it stays mounted.
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-lot-ink/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-reaccept-heading"
      onKeyDown={trapFocus}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-none border border-lot-line bg-lot-chalk p-6 text-lot-ink shadow-overlay focus:outline-none sm:p-8"
      >
        <h2
          id="legal-reaccept-heading"
          className="lf-panel-heading mb-4 text-lot-ink"
        >
          We updated our Terms and Privacy Policy
        </h2>
        <p className="lf-body-sm mb-6 text-lot-stone">
          Please review and accept the updated Terms &amp; Conditions and Privacy Policy (effective
          October 30, 2026) to keep using your account. The changes include an arbitration agreement with a
          30-day opt-out, a class action waiver, limits on our liability, and a release of claims for disputes
          with builders and other third parties.
        </p>

        <div className="mb-6">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                setIsChecked(e.target.checked);
                if (error) setError(null);
              }}
              className="mt-1 h-5 w-5 shrink-0 rounded-control border border-lot-stone text-lot-orange-ink accent-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink focus:ring-offset-2 focus:ring-offset-lot-chalk"
            />
            <span>
              I confirm I am 18 or older and agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener"
                className="text-lot-orange-ink underline underline-offset-2 hover:text-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
              >
                Terms &amp; Conditions
              </Link>{" "}
              (including the arbitration agreement, class action waiver and release of claims) and the{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener"
                className="text-lot-orange-ink underline underline-offset-2 hover:text-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-status-blocked">
            {error}
          </p>
        )}

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
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/delete-account"
            className="inline-flex min-h-11 items-center text-xs text-lot-stone underline underline-offset-2 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
          >
            Delete my account instead
          </Link>
        </div>
      </div>
    </div>
  );
}
