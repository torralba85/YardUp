"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CheckCircle } from "lucide-react";

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
      }
    });
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset instructions sent.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lf-clay-soft text-lf-clay-ink">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="lf-body-sm text-lf-muted">
            If <strong className="text-lf-espresso">{email}</strong> is registered,
            you&apos;ll receive a reset link shortly. Check your spam folder if it doesn&apos;t arrive.
          </p>
          <Link
            href="/login"
            className="lf-body-sm mt-2 font-medium text-lf-clay-ink hover:text-lf-mahogany"
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
          <div className="lf-body-sm rounded-none border border-lf-brick/20 bg-lf-brick-soft px-3 py-2 text-lf-brick">
            {error}
          </div>
        )}

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
            className="w-full rounded-[3px] border border-lf-taupe bg-lf-sand px-3.5 py-3 text-base sm:text-sm text-lf-espresso placeholder-lf-muted motion-safe:transition-colors focus:border-lf-espresso focus:outline-none focus:ring-2 focus:ring-lf-espresso"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 w-full rounded-[3px] bg-lf-clay py-3 text-sm font-semibold text-lf-primary-label motion-safe:transition-colors hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="lf-body-sm mt-6 text-center text-lf-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-lf-clay-ink hover:text-lf-mahogany">
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
