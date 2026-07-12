"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { X, Mail, Lock, User as UserIcon, TriangleAlert } from "lucide-react";

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  /** Whether the modal is shown. */
  isOpen: boolean;
  /** Called to dismiss the modal. */
  onClose: () => void;
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
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const triggerAncestorsRef = useRef<HTMLElement[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Keyboard users shouldn't lose their place when the modal closes: capture
  // whatever had focus when it opened, move focus into the dialog, and
  // restore the trigger's focus on close. A successful sign-in replaces the
  // trigger with account UI, so also capture its ancestor chain up front —
  // a detached node can't be walked upward after React removes it.
  useEffect(() => {
    if (isOpen) {
      const trigger = document.activeElement as HTMLElement | null;
      triggerRef.current = trigger;
      const ancestors: HTMLElement[] = [];
      for (let el = trigger?.parentElement; el; el = el.parentElement) {
        ancestors.push(el);
      }
      triggerAncestorsRef.current = ancestors;
      panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    } else {
      const trigger = triggerRef.current;
      if (trigger?.isConnected) {
        trigger.focus();
      } else if (trigger) {
        // Trigger was replaced (e.g. sign-in button → account controls):
        // land on the first focusable control in its nearest surviving host.
        const host = triggerAncestorsRef.current.find((el) => el.isConnected);
        host?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
      }
    }
  }, [isOpen]);

  // Escape dismisses; Tab cycles inside the dialog while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-lf-espresso/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div ref={panelRef} className="w-full max-w-md rounded-lg bg-lf-mahogany text-lf-sand shadow-2xl relative overflow-hidden border border-lf-taupe/25">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-lf-taupe hover:bg-lf-sand/10 hover:text-lf-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
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
                <label className="lf-caption mb-1 block font-medium text-lf-taupe">
                  Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay focus:ring-2 focus:ring-lf-clay/40"
                    placeholder="Alma Reyes"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="lf-caption mb-1 block font-medium text-lf-taupe">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay focus:ring-2 focus:ring-lf-clay/40"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="lf-caption mb-1 block font-medium text-lf-taupe">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lf-taupe">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-lf-espresso/40 border border-lf-taupe/25 rounded-md py-2 pl-10 pr-3 text-sm text-lf-sand placeholder:text-lf-taupe/80 transition-colors focus:outline-none focus:border-lf-clay focus:ring-2 focus:ring-lf-clay/40"
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-lf-sand px-4 py-2.5 text-sm font-semibold text-lf-espresso transition hover:bg-lf-card motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-lf-taupe/25 bg-lf-sand/5 px-4 py-2.5 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-sand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          </div>
        </div>

        <div className="bg-lf-espresso/30 p-4 text-center border-t border-lf-taupe/25">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="rounded-full text-sm text-lf-taupe transition-colors hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
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
