"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { X, Mail, Lock, User as UserIcon, TriangleAlert } from "lucide-react";

/**
 * Why the modal closed.
 *
 * `"signed-in"` means the visitor authenticated; the session is about to
 * appear. `"dismissed"` means they backed out (Escape, backdrop, the X) and no
 * session is coming. Callers that own the surrounding `AuthProvider` must not
 * tear it down on `"signed-in"`, or they unmount the subscription before the
 * new user propagates.
 */
export type AuthModalCloseReason = "signed-in" | "dismissed";

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  /** Whether the modal is shown. */
  isOpen: boolean;
  /**
   * Called when the modal closes.
   *
   * @param reason - Why it closed. Omitted-parameter callers remain valid; they
   *   simply treat every close the same way, which is correct when an
   *   `AuthProvider` above them outlives the modal.
   */
  onClose: (reason: AuthModalCloseReason) => void;
}

/** Keyboard-reachable controls, excluding disabled ones the browser won't focus. */
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Modal that toggles between sign-in and sign-up, supporting email/password
 * and Google sign-in via {@link useAuth}. Renders nothing when closed.
 *
 * @param props - The {@link AuthModalProps}.
 */
interface TriggerHost {
  el: HTMLElement;
  /** The trigger's position among the host's focusable controls at open. */
  index: number;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, signInWithApple, user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const triggerHostsRef = useRef<TriggerHost[]>([]);
  const restoredTriggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Track open-edge so Strict Mode double-effects don't re-capture the
  // trigger after focus has already moved into the dialog (which would make
  // restore target the detached input and leave focus on <body>).
  const wasOpenRef = useRef(false);
  // Set right before onClose() on a successful sign-in/sign-up, so the close
  // effect can tell "this modal just signed someone in" apart from a plain
  // cancel (Escape, backdrop, the X button) — only the former should arm the
  // delayed post-auth recovery below.
  const signInInitiatedCloseRef = useRef(false);

  const releaseTriggerRefs = useCallback(() => {
    triggerRef.current = null;
    restoredTriggerRef.current = null;
    triggerHostsRef.current = [];
  }, []);

  // Focus the control standing where the trigger used to be: in the nearest
  // surviving host, pick the focusable at the trigger's captured position, so
  // sign-in's replacement account control wins over unrelated earlier
  // controls that share the same subtree.
  const focusTriggerReplacement = useCallback(() => {
    for (const { el, index } of triggerHostsRef.current) {
      if (!el.isConnected) continue;
      const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      // A single trigger can be replaced by a cluster of controls (e.g. the
      // sidebar's "Sign out" + delete-account actions) that's shorter than
      // the position we captured. Clamping to the last focusable in that
      // case risks landing on an unrelated (or destructive) action, so only
      // accept an in-range match and otherwise defer to a broader host.
      const target = index < focusables.length ? focusables[index] : undefined;
      if (target) {
        target.focus();
        // A hidden or since-removed target won't actually take focus; try
        // the next surviving host instead of giving up on it.
        if (document.activeElement === target) break;
      }
    }
    releaseTriggerRefs();
  }, [releaseTriggerRefs]);

  // Keyboard users shouldn't lose their place when the modal closes: capture
  // whatever had focus when it opened, move focus into the dialog, and
  // restore the trigger's focus on close. A successful sign-in replaces the
  // trigger with account UI, so also capture its ancestor chain (with the
  // trigger's focusable position in each) up front — a detached node can't
  // be walked upward after React removes it.
  useEffect(() => {
    if (isOpen) {
      // Capture the opener only on the closed→open edge. A re-run while
      // already open (Strict Mode, dependency churn) would otherwise snapshot
      // the dialog's focused input as the "trigger".
      if (!wasOpenRef.current) {
        const trigger = document.activeElement as HTMLElement | null;
        triggerRef.current = trigger;
        restoredTriggerRef.current = null;
        const hosts: TriggerHost[] = [];
        if (trigger) {
          for (
            let el = trigger.parentElement;
            el && el !== document.body;
            el = el.parentElement
          ) {
            const focusables = Array.from(
              el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            );
            hosts.push({ el, index: Math.max(0, focusables.indexOf(trigger)) });
          }
        }
        triggerHostsRef.current = hosts;
      }
      wasOpenRef.current = true;
      panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    } else {
      if (wasOpenRef.current) {
        const trigger = triggerRef.current;
        const initiatedBySignIn = signInInitiatedCloseRef.current;
        signInInitiatedCloseRef.current = false;
        if (trigger?.isConnected) {
          trigger.focus();
          // The auth observer can replace the trigger a render after this
          // close — but only arm the delayed re-check below when this close
          // was a completed sign-in, not a cancel. Otherwise unrelated auth
          // churn later (a token refresh, signing in from another surface)
          // could unmount this trigger and steal focus for a modal the user
          // already dismissed.
          if (initiatedBySignIn) {
            restoredTriggerRef.current = trigger;
          }
        } else if (trigger) {
          focusTriggerReplacement();
        }
      }
      wasOpenRef.current = false;
    }
  }, [isOpen, focusTriggerReplacement]);

  // Email/password sign-in closes the modal before AuthProvider's
  // onAuthStateChanged render swaps the trigger for account UI, so the
  // restore above can land on a control that unmounts a moment later. When
  // the auth user changes while closed, re-check and recover the focus.
  // restoredTriggerRef is only ever armed for a close that completed a
  // sign-in (see above), so this can't fire for a plain cancel.
  useEffect(() => {
    if (isOpen) return;
    const restored = restoredTriggerRef.current;
    if (restored && !restored.isConnected) {
      focusTriggerReplacement();
      return;
    }
    if (!user || !restored) return;
    // The trigger looks fine from here, but a parent that reacts to this
    // same auth change (e.g. the mobile wizard tearing down its whole
    // subtree once sign-in completes) can still remove it in a later
    // commit — including one that unmounts this component entirely. Don't
    // declare it safe yet: this cleanup runs both on the next dependency
    // change and on unmount, so either way it gets one more look at the
    // real DOM before giving up the ability to recover.
    return () => {
      const stillRestored = restoredTriggerRef.current;
      if (stillRestored && !stillRestored.isConnected) {
        focusTriggerReplacement();
      } else if (stillRestored) {
        releaseTriggerRefs();
      }
    };
  }, [user, isOpen, focusTriggerReplacement, releaseTriggerRefs]);

  // Escape dismisses; Tab cycles inside the dialog while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose("dismissed");
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, displayName, "user");
      } else {
        await signIn(email, password);
      }
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      setError(
        code
          ? getAuthErrorMessage(code)
          : err instanceof Error
            ? err.message
            : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      setError(
        code
          ? getAuthErrorMessage(code)
          : err instanceof Error
            ? err.message
            : "Google sign-in failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      setError(
        code
          ? getAuthErrorMessage(code)
          : err instanceof Error
            ? err.message
            : "Apple sign-in failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-lf-espresso/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div ref={panelRef} className="w-full max-w-md rounded-lg bg-lf-mahogany text-lf-sand shadow-2xl relative overflow-hidden border border-lf-taupe/25">
        <button
          type="button"
          onClick={() => onClose("dismissed")}
          className="absolute right-4 top-4 rounded-full p-1 text-lf-taupe hover:bg-lf-sand/10 hover:text-lf-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
        >
          <X size={20} />
          <span className="sr-only">Close</span>
        </button>

        <div className="p-8">
          <h2 id="auth-modal-title" className="lf-panel-heading mb-2 text-lf-sand">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="lf-body-sm mb-6 text-lf-taupe">
            {isSignUp
              ? "Create an account to save ADU estimates, reports, and builder-ready snapshots."
              : "Sign in to access your saved ADU estimates, reports, and builder-ready snapshots."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label
                  htmlFor="auth-display-name"
                  className="lf-caption mb-1 block font-medium text-lf-taupe"
                >
                  Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                    <UserIcon size={16} />
                  </div>
                  <input
                    id="auth-display-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-base sm:text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay-on-dark focus:ring-2 focus:ring-lf-clay-on-dark/35"
                    placeholder="Alma Reyes"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="lf-caption mb-1 block font-medium text-lf-taupe"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                  <Mail size={16} />
                </div>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-base sm:text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay-on-dark focus:ring-2 focus:ring-lf-clay-on-dark/35"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="lf-caption mb-1 block font-medium text-lf-taupe"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                  <Lock size={16} />
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-base sm:text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay-on-dark focus:ring-2 focus:ring-lf-clay-on-dark/35"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="lf-body-sm flex items-start gap-2 rounded-md border border-lf-brick-on-dark/40 bg-lf-brick/20 p-3 text-lf-brick-on-dark">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {isSignUp && (
              <p className="lf-caption text-lf-taupe">
                By creating an account, you agree to our{" "}
                <a
                  href="/terms"
                  className="text-lf-sand underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                >
                  Terms &amp; Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="text-lf-sand underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                >
                  Privacy Policy
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-11 w-full rounded-full bg-lf-sand px-4 py-2.5 text-sm font-semibold text-lf-espresso transition hover:bg-lf-card motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-lf-taupe/25"></div>
              </div>
              <div className="lf-caption relative flex justify-center">
                <span className="bg-lf-mahogany px-2 text-lf-taupe">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-lf-taupe/25 bg-lf-sand/5 px-4 py-2.5 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-sand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-lf-taupe/25 bg-lf-sand/5 px-4 py-2.5 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-sand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.96-2.38 1.7-3.64 1.6-.1-1.1.4-2.26 1.18-3.08.9-.96 2.46-1.66 3.66-1.54zM20.5 17.2c-.62 1.42-1.36 2.8-2.42 2.82-1.04.02-1.38-.62-2.58-.62s-1.58.6-2.56.64c-1.04.04-1.84-1.3-2.48-2.7-1.28-2.82-.34-7 1.02-9.28.66-1.12 1.8-1.88 3.06-1.9 1.02-.02 1.98.68 2.58.68.6 0 1.74-.84 2.94-.72.5.02 1.9.2 2.8 1.52-.08.04-1.68 1-1.66 2.96.02 2.34 2.06 3.12 2.1 3.14-.02.06-.32 1.12-.82 2.2z" />
              </svg>
              Apple
            </button>
          </div>
        </div>

        <div className="bg-lf-espresso/30 p-4 text-center border-t border-lf-taupe/25">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="rounded-full text-sm text-lf-taupe transition-colors hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
