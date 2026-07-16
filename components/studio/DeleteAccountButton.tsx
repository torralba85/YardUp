"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export interface DeleteAccountButtonProps {
  /** Surface tone — matches {@link AccountMenu} dark mahogany vs light card. */
  tone?: "dark" | "light";
}

/**
 * Destructive "Delete account" affordance for the studio account block.
 *
 * Renders a subtle text trigger that expands to an inline two-step confirmation
 * (no separate modal), then calls {@link useAuth}'s `deleteAccount`. On success
 * the auth state clears and this component unmounts with the account block.
 */
export function DeleteAccountButton({ tone = "dark" }: DeleteAccountButtonProps) {
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = tone === "dark";
  // Brick on light surfaces; brick-on-dark for AA on mahogany.
  const errorText = isDark ? "text-lf-brick-on-dark" : "text-lf-brick";
  const ringOffset = isDark ? "focus-visible:ring-offset-lf-mahogany" : "focus-visible:ring-offset-lf-card";

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteAccount();
      // On success the user becomes null and the parent unmounts this control.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed.");
      setPending(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <div className="px-1">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className={cn(
            "inline-flex min-h-11 items-center text-[11px] text-lf-taupe underline-offset-2 transition hover:underline",
            isDark ? "hover:text-lf-brick-on-dark" : "hover:text-lf-brick",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2",
            ringOffset,
          )}
        >
          Delete account
        </button>
        {error && (
          <p role="alert" className={cn("mt-1 text-[11px]", errorText)}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        isDark
          ? "border-lf-brick-on-dark/40 bg-lf-brick/15"
          : "border-lf-brick/40 bg-lf-brick/10",
      )}
    >
      <p
        className={cn(
          "text-[11px] leading-snug",
          isDark ? "text-lf-sand-2" : "text-lf-espresso",
        )}
      >
        Permanently delete your account, saved concepts, and profile? This can&rsquo;t
        be undone.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={cn(
            "min-h-11 rounded-full bg-lf-brick px-4 py-2 text-[11px] font-semibold text-lf-sand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2 disabled:opacity-60",
            ringOffset,
          )}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className={cn(
            "min-h-11 rounded-full px-4 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 disabled:opacity-60",
            isDark ? "text-lf-taupe hover:text-lf-sand" : "text-lf-muted hover:text-lf-espresso",
            ringOffset,
          )}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className={cn("mt-2 text-[11px]", errorText)}>
          {error}
        </p>
      )}
    </div>
  );
}
