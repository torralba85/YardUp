"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
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
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const fields = useRef<Record<string, HTMLInputElement | null>>({});

  function invalidate(id: string, message: string) {
    setInvalidField(id);
    setError(message);
    setStatus(null);
    fields.current[id]?.focus();
  }

  function field(id: string, label: string, type: string, value: string, onChange: (value: string) => void, autoComplete: string) {
    const invalid = invalidField === id;
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
        <Input id={id} name={id} type={type} value={value} autoComplete={autoComplete}
          ref={(element) => { fields.current[id] = element; }}
          spellCheck={false}
          onChange={(event) => { onChange(event.target.value); if (invalid) { setInvalidField(null); setError(null); } }}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
        {invalid && error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-status-blocked">{error}</p>}
      </div>
    );
  }

  if (!capabilities.canChangeEmail && !capabilities.canChangePassword) {
    return (
      <div className="rounded-none border border-lot-line bg-lot-chalk p-4">
        <p className="lf-body-sm text-lot-stone">
          Sign-in for this account is managed by{" "}
          <strong className="text-lot-ink">{capabilities.managedBy}</strong>. Update
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
      invalidate("security-email", emailError);
      return;
    }
    if (!emailPassword) {
      invalidate("security-email-password", "Enter your current password to change email.");
      return;
    }
    setInvalidField(null);
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await onChangeEmail(email.trim(), emailPassword);
      setStatus("Check your inbox to confirm the new email.");
      setEmailPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!onChangePassword) return;
    if (!passwordPassword) {
      invalidate("security-current-password", "Enter your current password.");
      return;
    }
    const pwError = validatePassword(nextPassword);
    if (pwError) {
      invalidate("security-new-password", pwError);
      return;
    }
    setInvalidField(null);
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await onChangePassword(passwordPassword, nextPassword);
      setStatus("Password updated.");
      setPasswordPassword("");
      setNextPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="lf-body-sm text-lot-stone">
        Managed by <strong className="text-lot-ink">{capabilities.managedBy}</strong>.
      </p>
      {capabilities.canChangeEmail && onChangeEmail ? (
        <form noValidate onSubmit={handleEmail} className="space-y-3">
          <h3 className="text-sm font-semibold text-lot-ink">Change email</h3>
          {field("security-email", "New email", "email", email, setEmail, "email")}
          {field("security-email-password", "Current password", "password", emailPassword, setEmailPassword, "current-password")}
          <Button type="submit" variant="secondary" loading={pending}>
            Update email
          </Button>
        </form>
      ) : null}
      {capabilities.canChangePassword && onChangePassword ? (
        <form noValidate onSubmit={handlePassword} className="space-y-3">
          <h3 className="text-sm font-semibold text-lot-ink">Change password</h3>
          {field("security-current-password", "Current password", "password", passwordPassword, setPasswordPassword, "current-password")}
          {field("security-new-password", "New password", "password", nextPassword, setNextPassword, "new-password")}
          <Button type="submit" variant="secondary" loading={pending}>
            Update password
          </Button>
        </form>
      ) : null}
      {error && !invalidField ? (
        <p role="alert" className="text-sm text-status-blocked">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="text-sm text-status-eligible">
          {status}
        </p>
      ) : null}
    </div>
  );
}
