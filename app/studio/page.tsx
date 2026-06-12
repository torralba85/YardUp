"use client";

import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";

export default function StudioPage() {
  const { loading } = useAuth();

  // Wait for auth to resolve so saved scenarios and live-parcel access are
  // known before first render; guests proceed to the demo/estimated studio.
  if (loading) {
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
