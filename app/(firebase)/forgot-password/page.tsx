"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/Field";

/**
 * Forgot-password route (`/forgot-password`). Sends a Firebase password-reset
 * email via {@link useAuth} and shows a confirmation once sent.
 */
export default function ForgotPasswordPage() {
  const { sendPasswordReset, user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace("/studio");
    }
  }, [user, router]);

  const emailRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sent) confirmationRef.current?.focus();
  }, [sent]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await sendPasswordReset(email);
        setSent(true);
      } catch (err: unknown) {
        const code = err instanceof Error && "code" in err
          ? (err as { code: string }).code
          : "";
        setError(getResetErrorMessage(code));
        emailRef.current?.focus();
      }
    });
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset instructions sent.">
        <div ref={confirmationRef} tabIndex={-1} role="status" aria-label="Password reset instructions sent" className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lot-orange-soft text-lot-orange-ink">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="lf-body-sm text-lot-stone">
            If <strong className="text-lot-ink">{email}</strong> is registered,
            you&apos;ll receive a reset link shortly. Check your spam folder if it doesn&apos;t arrive.
          </p>
          <Link
            href="/login"
            className="lf-body-sm mt-2 font-medium text-lot-orange-ink hover:text-lot-ink"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we'll send a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div id="reset-email-error" role="alert" className="lf-body-sm rounded-none border border-status-blocked/20 bg-status-blocked-soft px-3 py-2 text-status-blocked">
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
            name="email"
            ref={emailRef}
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? "reset-email-error" : undefined}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 w-full rounded-control bg-lot-orange py-3 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="lf-body-sm mt-6 text-center text-lot-stone">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-lot-orange-ink hover:text-lot-ink">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function getResetErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many requests. Please wait a moment before trying again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}
