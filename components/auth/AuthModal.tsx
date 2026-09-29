"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import {
  trackAuthPromptShown,
  trackSignupFailed,
  trackSignupStarted,
  trackSignupSucceeded,
  type AuthPromptSource,
  type AuthSurface,
} from "@/lib/analytics/events";
import { X, Mail, Lock, User as UserIcon, TriangleAlert } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";

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
  /** Which mode should be shown whenever the modal opens. */
  initialMode?: "sign-in" | "sign-up";
  /** Bounded analytics context; never pass free text or PII. */
  analyticsSurface?: AuthSurface;
  analyticsSource?: AuthPromptSource;
  /** Called with the authenticated Firebase user before the modal closes. */
  onAuthenticated?: (user: FirebaseUser) => void;
}

/** Keyboard-reachable controls, excluding disabled ones the browser won't focus. */
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Sign-up subline for the moment the modal opened.
 *
 * The prompt appears at three very different points: the visitor just spent
 * their free lookup, just saw their own lot's numbers, or just tried to save.
 * One generic sentence undersells all three, so each names what the free
 * account gives *that* person. Only benefits that exist today are claimed.
 */
function signUpBlurb(source: AuthPromptSource): string {
  switch (source) {
    case "guest_limit":
      return "That was your free address lookup. A free account lets you look up more lots and keep your 3D design. No card needed.";
    case "post_result":
    case "save_scenario":
      return "Create a free account to save this lot and come back to your numbers and 3D design any time. No card needed.";
    default:
      return "Create an account to save ADU estimates, reports, and builder-ready snapshots.";
  }
}

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

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "sign-in",
  analyticsSurface = "studio",
  analyticsSource = "account_control",
  onAuthenticated,
}: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, signInWithApple, user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialMode === "sign-up");
  const [role, setRole] = useState<"user" | "builder">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
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
      if (!wasOpenRef.current) {
        const signUpMode = initialMode === "sign-up";
        // Open-edge synchronization is intentional: the modal stays mounted
        // between prompts, but each caller can choose its initial auth mode.
        setIsSignUp(signUpMode);
        trackAuthPromptShown({
          surface: analyticsSurface,
          source: analyticsSource,
          mode: signUpMode ? "sign_up" : "sign_in",
        });
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
  }, [
    isOpen,
    focusTriggerReplacement,
    initialMode,
    analyticsSurface,
    analyticsSource,
  ]);

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

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!legalAccepted) {
          throw new Error("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
        }
        trackSignupStarted({
          method: "password",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
        const credential = await signUp(
          email,
          password,
          displayName,
          role,
          CURRENT_LEGAL_CONSENT,
        );
        trackSignupSucceeded({
          method: "password",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
        onAuthenticated?.(credential.user);
      } else {
        const credential = await signIn(email, password);
        onAuthenticated?.(credential.user);
      }
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      if (isSignUp) {
        trackSignupFailed({
          method: "password",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
          error_code: code,
        });
      }
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
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        trackSignupStarted({
          method: "google",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
      }
      const credential = await signInWithGoogle(role, CURRENT_LEGAL_CONSENT);
      if (isSignUp) {
        trackSignupSucceeded({
          method: "google",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
      }
      onAuthenticated?.(credential.user);
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      if (isSignUp) {
        trackSignupFailed({
          method: "google",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
          error_code: code,
        });
      }
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
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        trackSignupStarted({
          method: "apple",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
      }
      const credential = await signInWithApple(role, CURRENT_LEGAL_CONSENT);
      if (isSignUp) {
        trackSignupSucceeded({
          method: "apple",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
        });
      }
      onAuthenticated?.(credential.user);
      signInInitiatedCloseRef.current = true;
      onClose("signed-in");
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      if (isSignUp) {
        trackSignupFailed({
          method: "apple",
          surface: analyticsSurface,
          source: analyticsSource,
          role,
          error_code: code,
        });
      }
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
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-lf-espresso/75 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div ref={panelRef} className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-none bg-lf-card text-lf-espresso shadow-[12px_16px_0_#16161630] relative border border-lf-hairline">
        <button
          type="button"
          onClick={() => onClose("dismissed")}
          className="absolute right-4 top-4 rounded-[3px] flex h-11 w-11 items-center justify-center text-lf-taupe hover:bg-lf-sand-2 hover:text-lf-espresso motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card"
        >
          <X size={20} />
          <span className="sr-only">Close</span>
        </button>

        <div className="p-8">
          <h2 id="auth-modal-title" className="lf-panel-heading mb-2 text-lf-espresso">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="lf-body-sm mb-6 text-lf-taupe">
            {isSignUp
              ? signUpBlurb(analyticsSource)
              : "Sign in to access your saved ADU estimates, reports, and builder-ready snapshots."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label
                  htmlFor="auth-role"
                  className="lf-caption mb-1 block font-medium text-lf-taupe"
                >
                  Account type
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as "user" | "builder")
                  }
                  className="w-full bg-lf-card border border-lf-taupe rounded-[3px] min-h-11 py-2 px-3 text-base sm:text-sm text-lf-espresso motion-safe:transition-colors focus:outline-none focus:border-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink"
                >
                  <option value="user">Homeowner</option>
                  <option value="builder">Builder</option>
                </select>
              </div>
            )}
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
                    className="w-full bg-lf-card border border-lf-taupe rounded-[3px] min-h-11 py-2 pl-10 pr-3 text-base sm:text-sm text-lf-espresso placeholder:text-lf-muted motion-safe:transition-colors focus:outline-none focus:border-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink"
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
                  className="w-full bg-lf-card border border-lf-taupe rounded-[3px] min-h-11 py-2 pl-10 pr-3 text-base sm:text-sm text-lf-espresso placeholder:text-lf-muted motion-safe:transition-colors focus:outline-none focus:border-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink"
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
                  className="w-full bg-lf-card border border-lf-taupe rounded-[3px] min-h-11 py-2 pl-10 pr-3 text-base sm:text-sm text-lf-espresso placeholder:text-lf-muted motion-safe:transition-colors focus:outline-none focus:border-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="lf-body-sm flex items-start gap-2 rounded-none border border-lf-brick bg-lf-brick-soft p-3 text-lf-brick">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-11 w-full rounded-[3px] bg-lf-clay px-4 py-2.5 text-sm font-semibold text-lf-espresso motion-safe:transition hover:bg-lf-clay-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <label className="mb-4 flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lf-taupe">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card"
              />
              <span>
                I confirm I am 18 or older, agree to the{" "}
                <a
                  href="/terms"
                  className="text-lf-clay-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card"
                >
                  Terms &amp; Conditions
                </a>
                , and acknowledge the{" "}
                <a
                  href="/privacy"
                  className="text-lf-clay-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card"
                >
                  Privacy Policy
                </a>
                . This confirmation is required for Google or Apple.
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-lf-taupe"></div>
              </div>
              <div className="lf-caption relative flex justify-center">
                <span className="bg-lf-card px-2 text-lf-taupe">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !legalAccepted}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-lf-taupe bg-lf-espresso px-4 py-2.5 text-sm font-medium text-lf-sand motion-safe:transition-colors hover:bg-lf-commit-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={loading || !legalAccepted}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-lf-taupe bg-lf-espresso px-4 py-2.5 text-sm font-medium text-lf-sand motion-safe:transition-colors hover:bg-lf-commit-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.96-2.38 1.7-3.64 1.6-.1-1.1.4-2.26 1.18-3.08.9-.96 2.46-1.66 3.66-1.54zM20.5 17.2c-.62 1.42-1.36 2.8-2.42 2.82-1.04.02-1.38-.62-2.58-.62s-1.58.6-2.56.64c-1.04.04-1.84-1.3-2.48-2.7-1.28-2.82-.34-7 1.02-9.28.66-1.12 1.8-1.88 3.06-1.9 1.02-.02 1.98.68 2.58.68.6 0 1.74-.84 2.94-.72.5.02 1.9.2 2.8 1.52-.08.04-1.68 1-1.66 2.96.02 2.34 2.06 3.12 2.1 3.14-.02.06-.32 1.12-.82 2.2z" />
              </svg>
              Apple
            </button>
          </div>
        </div>

        <div className="bg-lf-sand-2 p-4 text-center border-t border-lf-taupe">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="min-h-11 rounded-[3px] text-sm text-lf-taupe motion-safe:transition-colors hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card"
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
