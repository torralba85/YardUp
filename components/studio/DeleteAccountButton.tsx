"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Destructive "Delete account" affordance for the studio account block.
 *
 * Renders a subtle text trigger that expands to an inline two-step confirmation
 * (no separate modal), then calls {@link useAuth}'s `deleteAccount`. On success
 * the auth state clears and this component unmounts with the account block.
 */
export function DeleteAccountButton() {
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          className="text-[11px] text-lf-taupe underline-offset-2 transition hover:text-lf-brick hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
        >
          Delete account
        </button>
        {error && (
          <p role="alert" className="mt-1 text-[11px] text-lf-brick">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-2.5">
      <p className="text-[11px] leading-snug text-lf-sand-2">
        Permanently delete your account, saved concepts, and profile? This can&rsquo;t
        be undone.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-full bg-lf-brick px-3 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-full px-3 py-1 text-[11px] font-medium text-lf-taupe transition hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-lf-brick">
          {error}
        </p>
      )}
    </div>
  );
}
