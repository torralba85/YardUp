"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function SignupPage() {
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "builder">("user");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace("/studio");
    }
  }, [router, user]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await signUp(email, password, displayName, role);
        router.push("/studio");
      } catch (err: unknown) {
        const message =
          err instanceof Error && "code" in err
            ? getAuthErrorMessage((err as { code: string }).code)
            : "Something went wrong. Please try again.";
        setError(message);
      }
    });
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/studio");
    } catch (err: unknown) {
      const message =
        err instanceof Error && "code" in err
          ? getAuthErrorMessage((err as { code: string }).code)
          : "Something went wrong. Please try again.";
      setError(message);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start placing ADUs on real parcels in minutes"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-lf-brick/20 bg-lf-brick/5 px-3 py-2 text-sm text-lf-brick">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="displayName"
            className="mb-1.5 block text-sm font-medium text-lf-espresso"
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
            className="w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2.5 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-lf-espresso"
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
            className="w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2.5 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-lf-espresso"
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
            className="w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2.5 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20"
            placeholder="At least 8 characters"
          />
        </div>

        {/* Role selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-lf-espresso">
            I am a…
          </label>
          <div className="grid grid-cols-2 gap-3">
            <RoleButton
              label="Homeowner"
              description="Evaluating my own lot"
              selected={role === "user"}
              onClick={() => setRole("user")}
            />
            <RoleButton
              label="Builder"
              description="Working with clients"
              selected={role === "builder"}
              onClick={() => setRole("builder")}
            />
          </div>
        </div>

        <p className="text-xs text-lf-muted">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-lf-clay hover:text-lf-mahogany">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-lf-clay hover:text-lf-mahogany">
            Privacy Policy
          </Link>.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-lf-mahogany py-2.5 text-sm font-semibold text-lf-sand transition-colors hover:bg-lf-clay disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-lf-hairline" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-lf-card px-2 text-lf-muted">or continue with</span>
        </div>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-lf-hairline bg-lf-card py-2.5 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-sand-2"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
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

      <p className="mt-6 text-center text-sm text-lf-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-lf-clay hover:text-lf-mahogany">
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
      className={`rounded-lg border p-3 text-left transition-all ${
        selected
          ? "border-lf-clay bg-lf-clay/5 ring-2 ring-lf-clay/20"
          : "border-lf-hairline bg-lf-card hover:border-lf-taupe"
      }`}
    >
      <div
        className={`text-sm font-semibold ${selected ? "text-lf-clay" : "text-lf-espresso"}`}
      >
        {label}
      </div>
      <div className="text-xs text-lf-muted">{description}</div>
    </button>
  );
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}
