"use client";

import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getAccountCapabilities,
  validateNewPassword,
} from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";

const INPUT_CLASS =
  "w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20";

/**
 * Security section of the settings page: password change for password
 * accounts, or a provider-managed notice for Google/Apple sign-ins. Requires
 * the current password (reauthentication) before any change.
 */
export function SecurityPanel() {
  const { user, changeAccountPassword } = useAuth();
  const capabilities = getAccountCapabilities(user?.providerData ?? []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    const invalid = validateNewPassword(nextPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await changeAccountPassword(currentPassword, nextPassword);
      setStatus("Password updated.");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password change failed. Check your current password.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!capabilities.canChangePassword) {
    return (
      <div className="px-6 py-5">
        <p className="lf-body-sm text-lf-muted">
          Your sign-in and password are managed by {capabilities.managedBy}. Manage
          them in your {capabilities.managedBy} account settings.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 px-6 py-5">
      <label
        htmlFor="settings-current-password"
        className="lf-body-sm block font-medium text-lf-espresso"
      >
        Current password
      </label>
      <input
        id="settings-current-password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className={INPUT_CLASS}
      />
      <label
        htmlFor="settings-new-password"
        className="lf-body-sm block font-medium text-lf-espresso"
      >
        New password
      </label>
      <input
        id="settings-new-password"
        type="password"
        autoComplete="new-password"
        value={nextPassword}
        onChange={(e) => setNextPassword(e.target.value)}
        className={INPUT_CLASS}
      />
      <label
        htmlFor="settings-confirm-password"
        className="lf-body-sm block font-medium text-lf-espresso"
      >
        Confirm new password
      </label>
      <input
        id="settings-confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={INPUT_CLASS}
      />
      <Button
        type="submit"
        loading={pending}
        disabled={!currentPassword || !nextPassword || !confirmPassword}
      >
        Update password
      </Button>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-lf-brick">
          <TriangleAlert size={12} aria-hidden /> {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-xs text-lf-muted">
          {status}
        </p>
      )}
    </form>
  );
}
