"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AccountCapabilities } from "@/lib/account-settings";
import { validateEmail, validatePassword } from "@/lib/account-settings";

export interface SecurityPanelProps {
  capabilities: AccountCapabilities;
  onChangeEmail?: (email: string, currentPassword: string) => Promise<void>;
  onChangePassword?: (currentPassword: string, nextPassword: string) => Promise<void>;
}

/**
 * Provider-aware security controls: password accounts can change email/password;
 * OAuth accounts show managed-by guidance.
 */
export function SecurityPanel({
  capabilities,
  onChangeEmail,
  onChangePassword,
}: SecurityPanelProps) {
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [passwordPassword, setPasswordPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!capabilities.canChangeEmail && !capabilities.canChangePassword) {
    return (
      <div className="rounded-lg border border-lf-hairline bg-lf-card p-4">
        <p className="lf-body-sm text-lf-muted">
          Sign-in for this account is managed by{" "}
          <strong className="text-lf-espresso">{capabilities.managedBy}</strong>. Update
          your email or password in that provider&rsquo;s account settings.
        </p>
      </div>
    );
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!onChangeEmail) return;
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!emailPassword) {
      setError("Enter your current password to change email.");
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await onChangeEmail(email.trim(), emailPassword);
      setStatus("Check your inbox to confirm the new email.");
      setEmailPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email.");
    } finally {
      setPending(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!onChangePassword) return;
    const pwError = validatePassword(nextPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (!passwordPassword) {
      setError("Enter your current password.");
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await onChangePassword(passwordPassword, nextPassword);
      setStatus("Password updated.");
      setPasswordPassword("");
      setNextPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="lf-body-sm text-lf-muted">
        Managed by <strong className="text-lf-espresso">{capabilities.managedBy}</strong>.
      </p>
      {capabilities.canChangeEmail && onChangeEmail ? (
        <form onSubmit={handleEmail} className="space-y-3">
          <h3 className="text-sm font-semibold text-lf-espresso">Change email</h3>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="New email"
            autoComplete="email"
            className="w-full rounded-lg border border-lf-hairline bg-lf-card px-3.5 py-3 text-sm"
          />
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-lf-hairline bg-lf-card px-3.5 py-3 text-sm"
          />
          <Button type="submit" variant="secondary" loading={pending}>
            Update email
          </Button>
        </form>
      ) : null}
      {capabilities.canChangePassword && onChangePassword ? (
        <form onSubmit={handlePassword} className="space-y-3">
          <h3 className="text-sm font-semibold text-lf-espresso">Change password</h3>
          <input
            type="password"
            value={passwordPassword}
            onChange={(e) => setPasswordPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-lf-hairline bg-lf-card px-3.5 py-3 text-sm"
          />
          <input
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-lf-hairline bg-lf-card px-3.5 py-3 text-sm"
          />
          <Button type="submit" variant="secondary" loading={pending}>
            Update password
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-lf-brick">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-sm text-lf-forest">
          {status}
        </p>
      ) : null}
    </div>
  );
}
