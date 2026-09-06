"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import SignedInStudioGate from "@/components/studio/SignedInStudioGate";
import { useAuth } from "@/lib/auth-context";
import { TYPICAL_MARKET } from "@/lib/typical-market";

/**
 * Studio route (`/studio`). Waits for auth to resolve, redirects builders to
 * their dashboard, gives signed-in lot owners an empty address-first workspace,
 * and keeps the exploratory demo studio available to guests.
 */
export default function StudioPage() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === "builder") {
      router.replace("/builder");
    }
  }, [loading, profile, router]);

  // Dawn arrival plate: auth resolution is the first thing a landing visitor
  // sees after the ramp, so it must keep the money moment alive (DESIGN.md
  // seam rule: money-green figure within 3s, no spinner-on-white). Parchment
  // ground so the landing's 520ms dawn ramp lands on a continuous surface.
  if (loading || profile?.role === "builder") {
    return (
      <div role="status" className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="px-6 text-center">
          <p className="lf-kicker-dense text-lf-muted">
            Opening studio · typical supported markets
          </p>
          <p data-money className="lf-money-lg mt-3 text-lf-money">
            {TYPICAL_MARKET.rentBand}
            <span className="ml-1 font-sans text-sm font-normal text-lf-muted">/mo</span>
          </p>
          <p className="lf-caption mt-3 text-lf-muted">Estimates, not guarantees.</p>
        </div>
      </div>
    );
  }

  return user ? <SignedInStudioGate user={user} /> : <FeasibilityStudio />;
}
