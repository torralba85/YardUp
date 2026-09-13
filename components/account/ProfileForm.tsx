"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateDisplayName(name);
    if (validation) {
      setError(validation);
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await onSaveName(name.trim());
      setStatus("Name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="settings-display-name" className="lf-body-sm mb-1.5 block font-medium">
          Display name
        </label>
        <input
          id="settings-display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[3px] border border-lf-hairline bg-lf-card px-3.5 py-3 text-sm focus-visible:border-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-ink"
          autoComplete="name"
        />
      </div>
      <div>
        <p className="lf-body-sm mb-1 font-medium">Email</p>
        <p className="text-sm text-lf-muted">{email || "—"}</p>
        <p className="mt-1 lf-kicker text-lf-muted">
          {emailVerified ? "Verified" : "Unverified"}
        </p>
        {!emailVerified && onSendVerification ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void onSendVerification()}
          >
            Send verification email
          </Button>
        ) : null}
      </div>
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
      <Button type="submit" variant="primary" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
