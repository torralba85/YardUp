"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Field";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";

export interface SaveCertificateAccountCardProps {
  /** Called when linking hits an existing account so the buyer can sign in and claim by verified email. */
  onSignInExisting: () => void;
  /** Called right before linking begins so the parent can stash lot/step state across remounts or redirects. */
  onBeforeLink?: () => void;
  /** Called when linking fails in-place so temporary handoff state can be rolled back. */
  onLinkError?: () => void;
}

/**
 * Post-purchase save card shown to anonymous guest buyers.
 *
 * Links Google or email/password credentials onto the active anonymous Firebase
 * user (`linkWithPopup` / `linkWithCredential`) so the buyer keeps the same UID
 * and permanent access to their unlocked certificate across devices. When the
 * chosen credential already belongs to an existing account, guides them to sign
 * in so verified-email recovery can transfer the grant safely.
 */
export default function SaveCertificateAccountCard({
  onSignInExisting,
  onBeforeLink,
  onLinkError,
}: SaveCertificateAccountCardProps) {
  const { linkCheckoutWithEmail, linkCheckoutWithGoogle } = useAuth();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccountCollision, setExistingAccountCollision] = useState(false);

  const handleGoogleLink = async () => {
    setError(null);
    setExistingAccountCollision(false);
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    onBeforeLink?.();
    setBusy(true);
    try {
      await linkCheckoutWithGoogle(CURRENT_LEGAL_CONSENT);
    } catch (err: unknown) {
      onLinkError?.();
      const code = getAuthErrorCode(err);
      if (
        code === "auth/credential-already-in-use" ||
        code === "auth/email-already-in-use"
      ) {
        setExistingAccountCollision(true);
        setError(
          "An account with this email already exists. Sign in to that account — if you used the same email at Stripe checkout, your certificate will transfer automatically.",
        );
      } else {
        setError(
          code
            ? getAuthErrorMessage(code)
            : err instanceof Error
              ? err.message
              : "Could not link Google account. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccountCollision(false);
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    onBeforeLink?.();
    setBusy(true);
    try {
      await linkCheckoutWithEmail(email, password, displayName, CURRENT_LEGAL_CONSENT);
    } catch (err: unknown) {
      onLinkError?.();
      const code = getAuthErrorCode(err);
      if (
        code === "auth/email-already-in-use" ||
        code === "auth/credential-already-in-use"
      ) {
        setExistingAccountCollision(true);
        setError(
          "An account with this email already exists. Sign in to that account — if you used the same email at Stripe checkout, your certificate will transfer automatically.",
        );
      } else {
        setError(
          code
            ? getAuthErrorMessage(code)
            : err instanceof Error
              ? err.message
              : "Could not create your account. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="save-certificate-account-heading"
      className="rounded-none border border-lot-line bg-lot-chalk px-6 py-5"
    >
      <p className="lf-kicker text-lot-orange-ink">Keep permanent access</p>
      <h3
        id="save-certificate-account-heading"
        className="mt-1.5 text-base font-semibold text-lot-ink"
      >
        Save this certificate to an account
      </h3>
      <p className="lf-body-sm mt-1 text-lot-stone">
        Your certificate is unlocked in this browser. Link a free Google or email account to reopen
        it from any device and keep access if you clear browser data.
      </p>

      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-5 text-lot-stone">
        <Checkbox
          checked={legalAccepted}
          onChange={(e) => {
            setLegalAccepted(e.target.checked);
            if (error) setError(null);
          }}
          className="mt-0.5"
        />
        <span>
          I confirm I am 18 or older, agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener"
            className="text-lot-orange-ink underline underline-offset-2 motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
          >
            Terms &amp; Conditions
          </Link>
          , and acknowledge the{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="text-lot-orange-ink underline underline-offset-2 motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs leading-5 text-status-blocked"
        >
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <p>{error}</p>
            {existingAccountCollision && (
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={onSignInExisting}
              >
                Sign in to existing account
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="commit"
          size="sm"
          disabled={busy}
          loading={busy && !emailFormOpen}
          onClick={() => void handleGoogleLink()}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          leftIcon={<Mail size={14} />}
          onClick={() => {
            setEmailFormOpen((v) => !v);
            setError(null);
            setExistingAccountCollision(false);
          }}
        >
          {emailFormOpen ? "Hide email form" : "Save with email"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={busy}
          onClick={onSignInExisting}
        >
          Already have an account?
        </Button>
      </div>

      {emailFormOpen && (
        <form onSubmit={handleEmailLink} className="mt-4 space-y-3 border-t border-lot-line pt-4">
          <div>
            <label
              htmlFor="save-cert-name"
              className="lf-caption mb-1 block font-medium text-lot-stone"
            >
              Name
            </label>
            <Input
              id="save-cert-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Alma Reyes"
            />
          </div>
          <div>
            <label
              htmlFor="save-cert-email"
              className="lf-caption mb-1 block font-medium text-lot-stone"
            >
              Email
            </label>
            <Input
              id="save-cert-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="save-cert-password"
              className="lf-caption mb-1 block font-medium text-lot-stone"
            >
              Password
            </label>
            <Input
              id="save-cert-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            fullWidth
            loading={busy}
          >
            Save certificate to account
          </Button>
        </form>
      )}
    </section>
  );
}
