"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

/** Props for {@link DeleteAccountButton}. */
export interface DeleteAccountButtonProps {
  /**
   * Tone of the surface the control sits on. `"dark"` (default) styles for the
   * mahogany account block/menus; `"light"` styles for sand/card surfaces like
   * the settings page.
   */
  surface?: "dark" | "light";
}

/**
 * Destructive "Delete account" affordance for the studio account block.
 *
 * Renders a subtle text trigger that expands to an inline two-step confirmation
 * (no separate modal), then calls {@link useAuth}'s `deleteAccount`. On success
 * the auth state clears and this component unmounts with the account block.
 */
export function DeleteAccountButton({ surface = "dark" }: DeleteAccountButtonProps) {
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = surface === "dark";

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
          className={`min-h-11 text-[11px] underline-offset-2 transition hover:text-lf-brick hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2 ${
            dark
              ? "text-lf-taupe focus-visible:ring-offset-lf-mahogany"
              : "text-lf-muted focus-visible:ring-offset-lf-card"
          }`}
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
      <p className={`text-[11px] leading-snug ${dark ? "text-lf-sand-2" : "text-lf-espresso"}`}>
        Permanently delete your account, saved concepts, and profile? This can&rsquo;t
        be undone.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`min-h-11 rounded-full bg-lf-brick px-4 py-2 text-[11px] font-semibold text-lf-sand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brick focus-visible:ring-offset-2 disabled:opacity-60 ${
            dark ? "focus-visible:ring-offset-lf-mahogany" : "focus-visible:ring-offset-lf-card"
          }`}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className={`min-h-11 rounded-full px-4 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 disabled:opacity-60 ${
            dark
              ? "text-lf-taupe hover:text-lf-sand focus-visible:ring-offset-lf-mahogany"
              : "text-lf-muted hover:text-lf-espresso focus-visible:ring-offset-lf-card"
          }`}
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
