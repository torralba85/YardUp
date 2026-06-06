"use client";

import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/studio");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-lf-mahogany">
            LotFoundry
          </div>
          <p className="mt-2 text-sm text-lf-muted">Loading studio…</p>
        </div>
      </div>
    );
  }

  return <FeasibilityStudio />;
}
