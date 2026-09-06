"use client";

import { BrandLockup } from "@/components/ui/BrandLockup";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BuilderDashboard from "@/components/builder/BuilderDashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";

/**
 * Builder route (`/builder`). Guards access by auth and role: redirects guests
 * to login and non-builders to the studio, then renders the
 * {@link BuilderDashboard} for signed-in builders.
 */
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
      <div className="min-h-dvh bg-lf-sand text-lf-espresso">
        <header className="border-b border-lf-hairline bg-lf-card">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
            <Link
              href="/"
              aria-label="LotFoundry home"
              className="rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
            >
              <BrandLockup className="h-7 w-auto" />
            </Link>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="p-4 lg:p-8" aria-busy="true">
          <div
            role="status"
            aria-label="Loading the builder dashboard"
            className="mx-auto max-w-6xl"
          >
            <p className="lf-kicker text-lf-clay">Builder workspace</p>
            <Skeleton className="mt-3 h-9 w-64 max-w-full" />
            <Skeleton className="mt-3 h-4 w-[28rem] max-w-full" />
            <div className="mt-8 border-y border-lf-hairline bg-lf-card">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="grid min-h-32 gap-5 border-b border-lf-hairline p-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center"
                >
                  <div>
                    <Skeleton className="h-5 w-44 max-w-full" />
                    <Skeleton className="mt-3 h-4 w-72 max-w-full" />
                    <Skeleton className="mt-2 h-4 w-52 max-w-full" />
                  </div>
                  <Skeleton className="h-11 w-full rounded-none" />
                </div>
              ))}
            </div>
            <span className="sr-only">Loading...</span>
          </div>
        </main>
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
