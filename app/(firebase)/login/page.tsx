import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Sign in — LotFoundry",
  // Account-utility page: nothing to rank for, and we don't want it competing
  // in search. Kept crawlable and reachable — de-indexed, not hidden.
  robots: { index: false, follow: true },
};

/**
 * Login route (`/login`). Renders the {@link LoginForm} inside the shared
 * {@link AuthLayout}, with a Suspense boundary for the search-params hook.
 */
export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Open your saved ADU estimates and reports."
    >
      <Suspense
        fallback={
          <div role="status" aria-label="Loading the sign-in form" className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <span className="sr-only">Loading…</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
