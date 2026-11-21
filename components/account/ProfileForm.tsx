"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { validateDisplayName } from "@/lib/account-settings";

export interface ProfileFormProps {
  initialName: string;
  email: string;
  emailVerified: boolean;
  onSaveName: (name: string) => Promise<void>;
  onSendVerification?: () => Promise<void>;
}

/**
 * Profile section: display name edit + verified email display.
 */
export function ProfileForm({
  initialName,
  email,
  emailVerified,
  onSaveName,
  onSendVerification,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateDisplayName(name);
    if (validation) {
      setFieldError(validation);
      setError(null);
      setStatus(null);
      nameInputRef.current?.focus();
      return;
    }
    setPending(true);
    setFieldError(null);
    setError(null);
    setStatus(null);
    try {
      await onSaveName(name.trim());
      setStatus("Name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleSendVerification() {
    if (!onSendVerification) return;
    setSendingVerification(true);
    setVerificationStatus(null);
    setVerificationError(null);
    try {
      await onSendVerification();
      setVerificationStatus("Verification email sent. Check your inbox.");
    } catch (err) {
      setVerificationError(
        err instanceof Error ? err.message : "Could not send verification email. Try again.",
      );
    } finally {
      setSendingVerification(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="settings-display-name" className="lf-body-sm mb-1.5 block font-medium">
          Display name
        </label>
        <Input
          ref={nameInputRef}
          id="settings-display-name"
          name="displayName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          autoComplete="name"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "settings-display-name-error" : undefined}
        />
        {fieldError ? (
          <p id="settings-display-name-error" role="alert" className="mt-1 text-sm text-status-blocked">
            {fieldError}
          </p>
        ) : null}
      </div>
      <div>
        <p className="lf-body-sm mb-1 font-medium">Email</p>
        <p className="break-all text-sm text-lot-stone">{email || "—"}</p>
        <p className="mt-1 lf-kicker text-lot-stone">
          {emailVerified ? "Verified" : "Unverified"}
        </p>
        {!emailVerified && onSendVerification ? (
          <div className="mt-2 space-y-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={sendingVerification}
              onClick={() => void handleSendVerification()}
            >
              {sendingVerification ? "Sending…" : "Send verification email"}
            </Button>
            {verificationStatus ? (
              <p role="status" aria-live="polite" className="text-sm text-status-eligible">
                {verificationStatus}
              </p>
            ) : null}
            {verificationError ? (
              <p role="alert" className="text-sm text-status-blocked">
                {verificationError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-status-blocked">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" aria-live="polite" className="text-sm text-status-eligible">
          {status}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
