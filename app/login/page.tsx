"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { describeAuthError } from "../../lib/auth-errors";

function LoginForm() {
  const { signIn, signInWithGoogle, resetPassword, configured } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push(next);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push(next);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError("Enter your email above first, then tap reset.");
      return;
    }
    setError(null);
    setInfo(null);
    try {
      await resetPassword(email);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(describeAuthError(err));
    }
  };

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">Welcome back</div>
        <h1>Log in to YardUp</h1>
        <p className="authLede">
          Pick up where you left off — estimate income, save projects, and
          reach out to builders.
        </p>

        {!configured && (
          <div className="authNotice">
            Firebase isn&apos;t configured yet. Add your{" "}
            <code>NEXT_PUBLIC_FIREBASE_*</code> env vars and restart the dev
            server.
          </div>
        )}

        <form className="authForm" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || !configured}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || !configured}
            />
          </label>

          {error && <div className="authError">{error}</div>}
          {info && <div className="authInfo">{info}</div>}

          <button
            type="submit"
            className="primaryAction authPrimary"
            disabled={submitting || !configured}
          >
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="authDivider"><span>or</span></div>

        <button
          type="button"
          className="secondaryAction authSecondary"
          onClick={handleGoogle}
          disabled={submitting || !configured}
        >
          Continue with Google
        </button>

        <div className="authFooter">
          <button type="button" className="linkButton" onClick={handleReset}>
            Forgot password?
          </button>
          <span>
            New to YardUp? <Link href="/register">Create an account</Link>
          </span>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="authShell"><div className="authCard">Loading…</div></main>}>
      <LoginForm />
    </Suspense>
  );
}
