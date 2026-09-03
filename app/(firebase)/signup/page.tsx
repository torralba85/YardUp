"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { AuthLayout } from "@/components/auth/AuthLayout";

function SignupForm() {
  const { signUp, signInWithGoogle, signInWithApple, user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  
  const initialRole = searchParams.get("role") === "builder" ? "builder" : "user";
  const [role, setRole] = useState<"user" | "builder">(initialRole);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      router.replace(profile.role === "builder" ? "/builder" : "/studio");
    }
  }, [profile, router, user]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await signUp(email, password, displayName, role, CURRENT_LEGAL_CONSENT);
        router.push(role === "builder" ? "/builder" : "/studio");
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      }
    });
  };

  const handleGoogle = async () => {
    setError(null);
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    startTransition(async () => {
      try {
        await signInWithGoogle(role, CURRENT_LEGAL_CONSENT);
        router.push(role === "builder" ? "/builder" : "/studio");
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      }
    });
  };

  const handleApple = async () => {
    setError(null);
    if (!legalAccepted) {
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      return;
    }
    startTransition(async () => {
      try {
        await signInWithApple(role, CURRENT_LEGAL_CONSENT);
        router.push(role === "builder" ? "/builder" : "/studio");
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Save ADU rent and build estimates for your lot."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="lf-body-sm rounded-lg border border-lf-brick/20 bg-lf-brick-soft px-3 py-2 text-lf-brick">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="displayName"
            className="lf-body-sm mb-1.5 block font-medium text-lf-espresso"
          >
            Full name
          </label>
          <input
            id="displayName"
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-base sm:text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay-ink focus:outline-none focus:ring-2 focus:ring-lf-clay-ink/20"
            placeholder="Alma Reyes"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="lf-body-sm mb-1.5 block font-medium text-lf-espresso"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-base sm:text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay-ink focus:outline-none focus:ring-2 focus:ring-lf-clay-ink/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="lf-body-sm mb-1.5 block font-medium text-lf-espresso"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-base sm:text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay-ink focus:outline-none focus:ring-2 focus:ring-lf-clay-ink/20"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className="lf-body-sm mb-1.5 block font-medium text-lf-espresso">
            I am a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            <RoleButton
              label="Homeowner"
              description="Estimating my lot"
              selected={role === "user"}
              onClick={() => setRole("user")}
            />
            <RoleButton
              label="Builder"
              description="Reviewing client lots"
              selected={role === "builder"}
              onClick={() => setRole("builder")}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 lf-caption text-lf-muted">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(event) => setLegalAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2"
          />
          <span>
            I confirm I am 18 or older, agree to the{" "}
            <Link href="/terms" className="text-lf-clay-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2">
              Terms &amp; Conditions
            </Link>
            , and acknowledge the{" "}
            <Link href="/privacy" className="text-lf-clay-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || !legalAccepted}
          className="min-h-11 w-full rounded-full bg-lf-clay py-3 text-sm font-semibold text-lf-sand shadow-[0_8px_24px_-12px_rgba(38,19,7,0.5)] transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-lf-clay-strong motion-safe:active:scale-[0.99] disabled:opacity-50"
        >
          {isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-lf-hairline" />
        </div>
        <div className="lf-caption relative flex justify-center">
          <span className="bg-lf-card px-2 text-lf-muted">or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={isPending || !legalAccepted}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card py-3 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-sand-2 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
        {isPending ? "Connecting..." : "Google"}
      </button>
      <button
        type="button"
        onClick={handleApple}
        disabled={isPending || !legalAccepted}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card py-3 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-sand-2 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.96-2.38 1.7-3.64 1.6-.1-1.1.4-2.26 1.18-3.08.9-.96 2.46-1.66 3.66-1.54zM20.5 17.2c-.62 1.42-1.36 2.8-2.42 2.82-1.04.02-1.38-.62-2.58-.62s-1.58.6-2.56.64c-1.04.04-1.84-1.3-2.48-2.7-1.28-2.82-.34-7 1.02-9.28.66-1.12 1.8-1.88 3.06-1.9 1.02-.02 1.98.68 2.58.68.6 0 1.74-.84 2.94-.72.5.02 1.9.2 2.8 1.52-.08.04-1.68 1-1.66 2.96.02 2.34 2.06 3.12 2.1 3.14-.02.06-.32 1.12-.82 2.2z" />
        </svg>
        {isPending ? "Connecting..." : "Apple"}
      </button>

      <p className="lf-body-sm mt-6 text-center text-lf-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-lf-clay-ink hover:text-lf-mahogany">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function RoleButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        selected
          ? "border-lf-clay bg-lf-clay-soft ring-2 ring-lf-clay-ink/20"
          : "border-lf-hairline bg-lf-card hover:border-lf-taupe"
      }`}
    >
      <div
        className={`text-sm font-semibold ${selected ? "text-lf-clay-ink" : "text-lf-espresso"}`}
      >
        {label}
      </div>
      <div className="lf-caption text-lf-muted">{description}</div>
    </button>
  );
}

/**
 * Sign-up route (`/signup`). Collects name, email, and password (plus Google
 * sign-up) to create an account via {@link useAuth}, then routes the new user
 * onward based on their role.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-lf-muted">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
