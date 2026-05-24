"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "../lib/auth-context";

export default function RequireAuth({
  children,
  redirectTo = "/login",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      const next =
        typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(`${redirectTo}?next=${encodeURIComponent(next)}`);
    }
  }, [user, loading, configured, redirectTo, router]);

  if (!configured) {
    return (
      <main className="authShell">
        <div className="authCard">
          <div className="eyebrow">Setup needed</div>
          <h1>Configure Firebase to continue</h1>
          <p className="authLede">
            Add your <code>NEXT_PUBLIC_FIREBASE_*</code> env vars to{" "}
            <code>.env.local</code> and restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  if (loading || !user) {
    return (
      <main className="authShell">
        <div className="authCard">
          <span className="navMuted">Loading your account…</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
