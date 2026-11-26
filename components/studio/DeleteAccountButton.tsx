"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

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
  const errorText = isDark ? "text-status-blocked-on-dark" : "text-status-blocked";
  const ringOffset = isDark ? "focus-visible:ring-offset-lot-ink" : "focus-visible:ring-offset-lot-chalk";
  const actionRing = isDark ? "focus-visible:ring-lot-chalk" : "focus-visible:ring-lot-orange-ink";
  const dangerRing = isDark ? "focus-visible:ring-status-blocked-on-dark" : "focus-visible:ring-status-blocked";

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteAccount();
      // On success the session ends and `deleteAccount` navigates to the public
      // landing, so this control goes away with the rest of the signed-in tree.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed. Please try again.");
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
            "inline-flex min-h-11 items-center text-[11px] underline-offset-2 motion-safe:transition hover:underline",
            isDark
              ? "text-lot-stone-on-dark hover:text-status-blocked-on-dark"
              : "text-lot-stone hover:text-status-blocked",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            dangerRing,
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
        "rounded-none border p-2.5",
        isDark
          ? "border-status-blocked-on-dark/40 bg-status-blocked/15"
          : "border-status-blocked/40 bg-status-blocked-soft",
      )}
    >
      <p
        className={cn(
          "text-[11px] leading-snug",
          isDark ? "text-lot-chalk" : "text-lot-ink",
        )}
      >
        Permanently delete your account, saved concepts, and profile? This can&rsquo;t
        be undone.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="md"
          onClick={handleDelete}
          loading={pending}
          className={cn(
            "px-4 text-[11px]",
            dangerRing,
            ringOffset,
          )}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className={cn(
            "min-h-11 rounded-control px-4 py-2 text-[11px] font-medium motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
            isDark ? "text-lot-stone-on-dark hover:text-lot-chalk" : "text-lot-stone hover:text-lot-ink",
            actionRing,
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
