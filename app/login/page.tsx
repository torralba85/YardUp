import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Skeleton } from "@/components/ui/Skeleton";

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
