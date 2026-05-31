import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Return to your saved ADU income concepts.">
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
