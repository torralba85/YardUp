"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { X, Mail, Lock, User as UserIcon } from "lucide-react";

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  /** Whether the modal is shown. */
  isOpen: boolean;
  /** Called to dismiss the modal. */
  onClose: () => void;
}

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

  // Keyboard users shouldn't lose their place when the modal closes: capture
  // whatever had focus when it opened and restore it on close.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    } else {
      triggerRef.current?.focus?.();
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="w-full max-w-md rounded-xl bg-lf-mahogany text-white shadow-2xl relative overflow-hidden border border-white/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-lf-taupe hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-lf-sand"
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
                    className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-10 pr-3 text-sm text-white placeholder-lf-taupe focus:outline-none focus:ring-2 focus:ring-lf-sand focus:border-transparent transition-all"
                    placeholder="Jane Doe"
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
                  className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-10 pr-3 text-sm text-white placeholder-lf-taupe focus:outline-none focus:ring-2 focus:ring-lf-sand focus:border-transparent transition-all"
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
                  className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-10 pr-3 text-sm text-white placeholder-lf-taupe focus:outline-none focus:ring-2 focus:ring-lf-sand focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="lf-body-sm rounded border border-red-400/20 bg-red-400/10 p-3 text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lf-sand text-lf-espresso hover:bg-white focus:ring-2 focus:ring-lf-sand focus:ring-offset-2 focus:ring-offset-lf-mahogany font-medium py-2 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="lf-caption relative flex justify-center">
                <span className="bg-lf-mahogany px-2 text-lf-taupe">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2 px-4 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-lf-sand focus:ring-offset-2 focus:ring-offset-lf-mahogany disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="bg-black/20 p-4 text-center border-t border-white/10">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-lf-taupe hover:text-white transition-colors focus:outline-none"
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
