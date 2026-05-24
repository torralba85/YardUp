"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { describeAuthError } from "../../lib/auth-errors";

export default function RegisterPage() {
  const { signUp, signInWithGoogle, configured } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Passwords need to be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password, name.trim() || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">New here</div>
        <h1>Create your YardUp account</h1>
        <p className="authLede">
          Save estimates, track your project, and get matched with ADU
          builders when you&apos;re ready.
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
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting || !configured}
            />
          </label>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || !configured}
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting || !configured}
            />
          </label>

          {error && <div className="authError">{error}</div>}

          <button
            type="submit"
            className="primaryAction authPrimary"
            disabled={submitting || !configured}
          >
            {submitting ? "Creating account…" : "Create account"}
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
          <span>
            Already have an account? <Link href="/login">Log in</Link>
          </span>
        </div>
      </section>
    </main>
  );
}
