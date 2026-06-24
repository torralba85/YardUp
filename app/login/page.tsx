import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

/**
 * Login route (`/login`). Renders the {@link LoginForm} inside the shared
 * {@link AuthLayout}, with a Suspense boundary for the search-params hook.
 */
export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Open your saved ADU estimates and concept reports."
    >
      <Suspense
        fallback={
          <div className="text-center text-sm text-lf-muted">Loading...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
