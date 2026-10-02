"use client";

import { useEffect, useState, useTransition } from "react";
import { isNativeAppShell } from "@/lib/commerce/purchase-channel";
import { useWebBuilderAccess } from "@/lib/commerce/use-web-builder-access";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { Input } from "@/components/ui/Field";

/** Email/password, Google, and Apple sign-in with a validated redirect. */
export default function LoginForm() {
  const { signIn, signInWithGoogle, signInWithApple, user, profile } = useAuth();
  const router = useRouter();
  const buildersAllowed = useWebBuilderAccess();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [socialConsent, setSocialConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      const allowBuilder = !isNativeAppShell();
      const nextParam = searchParams.get("next");
      if (nextParam) {
        router.replace(safeRedirectPath(nextParam, allowBuilder));
      } else {
        router.replace(allowBuilder && profile.role === "builder" ? "/builder" : "/studio");
      }
    }
  }, [router, user, profile, searchParams]);

  if (user) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await signIn(email, password);
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      }
    });
  };

  const handleGoogle = () => {
    if (isPending) return;
    setError(null);
    if (!socialConsent) {
      setError("Confirm the legal terms before continuing with Google.");
      return;
    }
    startTransition(async () => {
      try {
        await signInWithGoogle("user", CURRENT_LEGAL_CONSENT);
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(
          code
            ? getAuthErrorMessage(code)
            : err instanceof Error
              ? err.message
              : "Google sign-in failed. Please try again.",
        );
      }
    });
  };

  const handleApple = () => {
    if (isPending) return;
    setError(null);
    if (!socialConsent) {
      setError("Confirm the legal terms before continuing with Apple.");
      return;
    }
    startTransition(async () => {
      try {
        await signInWithApple("user", CURRENT_LEGAL_CONSENT);
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        setError(
          code
            ? getAuthErrorMessage(code)
            : err instanceof Error
              ? err.message
              : "Apple sign-in failed. Please try again.",
        );
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="lf-body-sm rounded-none border border-status-blocked/20 bg-status-blocked-soft px-3 py-2 text-status-blocked">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="lf-body-sm mb-1.5 block font-medium text-lot-ink"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="lf-body-sm font-medium text-lot-ink"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="lf-body-sm text-lot-orange-ink motion-safe:transition-colors hover:text-lot-ink"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-control bg-lot-orange py-3 text-sm font-semibold text-lot-ink motion-safe:transition duration-(--duration-settle) ease-settle hover:bg-lot-orange-hover motion-safe:active:scale-[0.99] disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone">
        <input
          type="checkbox"
          checked={socialConsent}
          onChange={(event) => setSocialConsent(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
        />
        <span>
          For Google or Apple, I confirm I am 18 or older, agree to the{" "}
          <Link href="/terms" className="text-lot-orange-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2">
            Terms &amp; Conditions
          </Link>
          , and acknowledge the{" "}
          <Link href="/privacy" className="text-lot-orange-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-lot-line" />
        </div>
        <div className="lf-caption relative flex justify-center">
          <span className="bg-lot-chalk px-2 text-lot-stone">or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        aria-describedby="login-social-consent-help"
        disabled={isPending || !socialConsent}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-lot-ink bg-lot-ink py-3 text-sm font-medium text-lot-chalk motion-safe:transition-colors hover:bg-lot-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
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
        Google
      </button>
      <button
        type="button"
        onClick={handleApple}
        aria-describedby="login-social-consent-help"
        disabled={isPending || !socialConsent}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-lot-ink bg-lot-ink py-3 text-sm font-medium text-lot-chalk motion-safe:transition-colors hover:bg-lot-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.96-2.38 1.7-3.64 1.6-.1-1.1.4-2.26 1.18-3.08.9-.96 2.46-1.66 3.66-1.54zM20.5 17.2c-.62 1.42-1.36 2.8-2.42 2.82-1.04.02-1.38-.62-2.58-.62s-1.58.6-2.56.64c-1.04.04-1.84-1.3-2.48-2.7-1.28-2.82-.34-7 1.02-9.28.66-1.12 1.8-1.88 3.06-1.9 1.02-.02 1.98.68 2.58.68.6 0 1.74-.84 2.94-.72.5.02 1.9.2 2.8 1.52-.08.04-1.68 1-1.66 2.96.02 2.34 2.06 3.12 2.1 3.14-.02.06-.32 1.12-.82 2.2z" />
        </svg>
        Apple
      </button>

      <p id="login-social-consent-help" className="mt-3 text-xs leading-5 text-lot-stone" aria-live="polite">
        {socialConsent ? "Google and Apple sign-in are ready." : "Check the age, Terms and Privacy confirmation above to enable Google or Apple sign-in."}
      </p>
      <div className="mt-6 flex flex-col space-y-2">
        <p className="lf-body-sm text-center text-lot-stone">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-lot-orange-ink hover:text-lot-ink">
            Sign up
          </Link>
        </p>
        {buildersAllowed && <p className="lf-body-sm text-center text-lot-stone">
          Are you a builder?{" "}
          <Link
            href="/signup?role=builder"
            className="font-medium text-lot-orange-ink hover:text-lot-ink"
          >
            Register here
          </Link>
        </p>}
      </div>
    </>
  );
}

function safeRedirectPath(value: string | null, buildersAllowed: boolean): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/studio";
  }

  try {
    const parsed = new URL(value, "https://lotfoundry.local");
    if (parsed.origin !== "https://lotfoundry.local") {
      return "/studio";
    }
    const allowed = ["/studio", "/builder", "/settings", "/delete-account", "/feedback"];
    if (!allowed.includes(parsed.pathname) || (!buildersAllowed && parsed.pathname === "/builder")) {
      return "/studio";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/studio";
  }
}
