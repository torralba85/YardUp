"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SignedInStudioGate from "@/components/studio/SignedInStudioGate";
import StudioWelcome from "@/components/studio/StudioWelcome";
import { useAuth } from "@/lib/auth-context";

/**
 * Studio route (`/studio`). Waits for auth to resolve, redirects builders to
 * their dashboard, and requires sign-in before mounting the workspace.
 * Guests see the introduction first; auth stays on this route so property
 * handoffs and shared scenario parameters survive sign-in unchanged.
 */
export default function StudioPage() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === "builder") {
      router.replace("/builder");
    }
  }, [loading, profile, router]);

  if (loading || profile?.role === "builder") {
    return (
      <div role="status" className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="px-6 text-center">
          <p className="font-display text-2xl tracking-[-0.035em]">LotFoundry.</p>
          <p className="mt-3 text-sm text-lf-muted">Getting your Studio ready…</p>
        </div>
      </div>
    );
  }

  return user ? <SignedInStudioGate key={user.uid} user={user} /> : <StudioWelcome />;
}
