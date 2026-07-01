"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";

/**
 * Studio route (`/studio`). Waits for auth to resolve (so saved scenarios and
 * live-parcel access are known) before rendering {@link FeasibilityStudio};
 * guests fall through to the demo/estimated studio. Builders are redirected.
 */
export default function StudioPage() {
  const { loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === "builder") {
      router.replace("/builder");
    }
  }, [loading, profile, router]);

  // Wait for auth to resolve so saved scenarios and live-parcel access are
  // known before first render; guests proceed to the demo/estimated studio.
  if (loading || profile?.role === "builder") {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-lf-mahogany">
            LotFoundry
          </div>
          <p className="mt-2 text-sm text-lf-muted">Loading studio...</p>
        </div>
      </div>
    );
  }

  return <FeasibilityStudio />;
}
