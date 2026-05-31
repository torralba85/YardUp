"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuilderDashboard from "@/components/builder/BuilderDashboard";
import { useAuth } from "@/lib/auth-context";

export default function BuilderPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/builder");
    }
    if (!loading && user && profile && profile.role !== "builder") {
      router.replace("/studio");
    }
  }, [loading, profile, router, user]);

  if (loading || !user || !profile || profile.role !== "builder") {
    return (
      <div className="flex h-screen items-center justify-center bg-lf-sand">
        <div className="text-center">
          <div className="text-2xl font-display font-black text-lf-mahogany">
            LotFoundry
          </div>
          <p className="mt-2 text-sm text-lf-muted">Loading builder dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <BuilderDashboard
      uid={user.uid}
      email={profile.email}
      displayName={profile.displayName}
    />
  );
}
