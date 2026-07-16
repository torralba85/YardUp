"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getAccountCapabilities,
  validateDisplayName,
  validateEmail,
} from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";

const INPUT_CLASS =
  "w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20";

/**
 * Profile section of the settings page: display name, the account email with
 * its verification state, and (for password accounts) a verified email change.
 * Provider-managed accounts see who manages their email instead of a form.
 */
export function ProfileForm() {
  const { user, profile, updateAccountName, changeAccountEmail, sendVerification } =
    useAuth();
  const capabilities = getAccountCapabilities(user?.providerData ?? []);

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);

  const [emailDraft, setEmailDraft] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);

  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const nameValue = nameDraft ?? profile?.displayName ?? "";
  const email = profile?.email || user?.email || "";
  const emailVerified = user?.emailVerified ?? false;

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    setNameStatus(null);
    const invalid = validateDisplayName(nameValue);
    if (invalid) {
      setNameError(invalid);
      return;
    }
    setNameError(null);
    setNamePending(true);
    try {
      await updateAccountName(nameValue);
      setNameStatus("Saved.");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Name update failed.");
    } finally {
      setNamePending(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailStatus(null);
    const invalid = validateEmail(emailDraft);
    if (invalid) {
      setEmailError(invalid);
      return;
    }
    setEmailError(null);
    setEmailPending(true);
    try {
      await changeAccountEmail(emailDraft, emailPassword);
      setEmailStatus(
        "Verification sent to the new address. Your email updates once you confirm it.",
      );
      setEmailDraft("");
      setEmailPassword("");
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "Email change failed. Check your password.",
      );
    } finally {
      setEmailPending(false);
    }
  }

  async function handleSendVerification() {
    setVerifyStatus(null);
    try {
      await sendVerification();
      setVerifyStatus("Verification email sent. Check your inbox.");
    } catch {
      setVerifyStatus("Could not send the verification email. Try again later.");
    }
  }

  return (
    <div className="space-y-6 px-6 py-5">
      <form onSubmit={handleNameSubmit} className="space-y-2">
        <label htmlFor="settings-name" className="lf-body-sm block font-medium text-lf-espresso">
          Display name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="settings-name"
            type="text"
            autoComplete="name"
            value={nameValue}
            onChange={(e) => setNameDraft(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Alma Reyes"
          />
          <Button type="submit" loading={namePending} className="shrink-0">
            Save name
          </Button>
        </div>
        {nameError && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-lf-brick">
            <TriangleAlert size={12} aria-hidden /> {nameError}
          </p>
        )}
        {nameStatus && (
          <p role="status" className="text-xs text-lf-muted">
            {nameStatus}
          </p>
        )}
      </form>

      <div className="space-y-2">
        <p className="lf-body-sm font-medium text-lf-espresso">Email</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-lf-espresso">{email}</span>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-lf-forest-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-forest">
              <BadgeCheck size={11} aria-hidden /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-lf-amber-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-amber-ink">
              <TriangleAlert size={11} aria-hidden /> Unverified
            </span>
          )}
        </div>
        {!emailVerified && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => void handleSendVerification()}>
              Send verification link
            </Button>
            {verifyStatus && (
              <p role="status" className="mt-1 text-xs text-lf-muted">
                {verifyStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {capabilities.canChangeEmail ? (
        <form onSubmit={handleEmailSubmit} className="space-y-2">
          <label
            htmlFor="settings-new-email"
            className="lf-body-sm block font-medium text-lf-espresso"
          >
            Change email
          </label>
          <input
            id="settings-new-email"
            type="email"
            autoComplete="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            className={INPUT_CLASS}
            placeholder="new-address@example.com"
          />
          <label
            htmlFor="settings-email-password"
            className="lf-body-sm block font-medium text-lf-espresso"
          >
            Current password
          </label>
          <input
            id="settings-email-password"
            type="password"
            autoComplete="current-password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className={INPUT_CLASS}
          />
          <Button type="submit" loading={emailPending} disabled={!emailDraft || !emailPassword}>
            Send verification
          </Button>
          {emailError && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-lf-brick">
              <TriangleAlert size={12} aria-hidden /> {emailError}
            </p>
          )}
          {emailStatus && (
            <p role="status" className="text-xs text-lf-muted">
              {emailStatus}
            </p>
          )}
        </form>
      ) : (
        <p className="lf-body-sm text-lf-muted">
          Your email is managed by {capabilities.managedBy}. Change it in your{" "}
          {capabilities.managedBy} account settings.
        </p>
      )}
    </div>
  );
}
