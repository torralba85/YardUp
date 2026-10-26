"use client";

import { useEffect, useRef, useState } from "react";
import { Hammer, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { fetchActiveBuilders } from "@/lib/marketplace-firestore";
import { getMatchedBuilders } from "@/lib/marketplace";
import type { BuilderDirectoryProfile } from "@/lib/marketplace-types";
import {
  trackBuilderMatchesViewed,
  getBuilderMatchBucket,
  extractStateCode,
  type FeasibilityStatus,
} from "@/lib/analytics/events";

/** Props for {@link BuildersPanel}. */
export interface BuildersPanelProps {
  /** The active parcel's `"City, ST"` string, used for service-area matching. */
  parcelCity: string;
  parcelState?: string;
  parcelCounty?: string;
  /** Open the connect-with-builders flow (the existing BuilderLeadPanel). */
  onConnect: () => void;
  /** Feasibility status of the current scenario. */
  feasibilityStatus?: FeasibilityStatus;
}

/**
 * Step 5 — the Builders destination. Shows the matched local builders for the
 * active parcel (company, license-information marker, service areas — never contact info,
 * which stays behind the paid referral), an honest zero-state when none serve
 * the area yet, and a sign-in prompt for guests. The connect CTA hands off to
 * the existing {@link BuilderLeadPanel} flow, which creates the referral that
 * builders pay to unlock.
 */
export default function BuildersPanel({
  parcelCity,
  parcelState,
  parcelCounty,
  onConnect,
  feasibilityStatus = "unknown",
}: BuildersPanelProps) {
  const { user } = useAuth();
  const [builders, setBuilders] = useState<BuilderDirectoryProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const hasTrackedParcelRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || builders === null) return;
    if (hasTrackedParcelRef.current === parcelCity) return;
    hasTrackedParcelRef.current = parcelCity;

    const matchedList = getMatchedBuilders(builders, { city: parcelCity, state: parcelState, county: parcelCounty });
    const stateCode = extractStateCode({ city: parcelCity });

    trackBuilderMatchesViewed({
      builder_match_bucket: getBuilderMatchBucket(matchedList.length),
      state_code: stateCode,
      feasibility_status: feasibilityStatus,
    });
  }, [user, builders, parcelCity, parcelState, parcelCounty, feasibilityStatus]);

  useEffect(() => {
    let cancelled = false;
    // Intentional sync reset: clear any prior identity's list before the guest
    // branch renders or a re-fetch begins (mirrors the URL-hydration pattern).
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setBuilders(null);
    if (!user) return;
    fetchActiveBuilders()
      .then((all) => {
        if (!cancelled) setBuilders(all);
      })
      .catch(() => {
        if (!cancelled) {
          setBuilders([]);
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loading = Boolean(user) && builders === null;
  const matched = builders ? getMatchedBuilders(builders, { city: parcelCity, state: parcelState, county: parcelCounty }) : [];
  const noneMatched = Boolean(user) && builders !== null && matched.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lot-orange-ink">Step 5 · Builders</p>
        <h2 className="lf-section-heading mt-2 text-lot-ink">Connect with local builders.</h2>
        <p className="lf-body mx-auto mt-2 max-w-md text-lot-stone">
          Share your concept with registered builders in your area. They may reach out with quotes and next steps.
        </p>
      </div>

      {!user ? (
        <div className="flex flex-col items-center gap-3 rounded-none border border-lot-line bg-lot-chalk p-6 text-center">
          <p className="lf-body-sm text-lot-stone">
            Sign in to see the builders who serve your area and send them your concept.
          </p>
          <Button variant="primary" onClick={() => setAuthOpen(true)}>
            Sign in to see matched builders
          </Button>
        </div>
      ) : loading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex items-center justify-center gap-2 rounded-none border border-lot-line bg-lot-chalk p-6 text-sm text-lot-stone"
        >
          <span className="block h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
          Finding builders near you…
        </div>
      ) : noneMatched ? (
        <div className="rounded-none border border-lot-line bg-lot-surface p-6 text-center">
          <p className="text-sm font-semibold text-lot-ink">
            No builders are registered for {parcelCity} yet.
          </p>
          <p className="lf-body-sm mt-1 text-lot-stone">
            {loadError
              ? "We couldn't load the builder network — check your connection and try again."
              : "The network is growing. Save your concept and check back; we'll match you as builders join."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-center lf-kicker text-lot-stone">
            {matched.length} builder{matched.length === 1 ? "" : "s"} serve{matched.length === 1 ? "s" : ""}{" "}
            {parcelCity}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {matched.map((b) => (
              <li key={b.id} className="rounded-none border border-lot-line bg-lot-chalk p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-lot-ink">{b.companyName}</span>
                  {b.licensed ? (
                    <StatusChip status="clear" label="License provided" size="sm" className="shrink-0" />
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(b.serviceAreas || []).slice(0, 3).map((area) => (
                    <span
                      key={area.key}
                      className="inline-flex items-center gap-1 rounded-none border border-lot-line bg-lot-surface px-1.5 py-0.5 font-sans text-[10px] text-lot-stone"
                    >
                      <MapPin size={10} aria-hidden />
                      {area.scope === "state" ? "Entire state" : area.county ? `${area.county} County` : area.city}, {area.state}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-col items-center gap-2.5">
        <Button
          variant="commit"
          size="lg"
          leftIcon={<Hammer size={17} />}
          onClick={onConnect}
          disabled={Boolean(user) && (loading || noneMatched)}
        >
          Connect with builders
        </Button>
        <p className="lf-caption text-center text-lot-stone">
          Free for homeowners — builders pay LotFoundry for the introduction, never you. Builder registration and license information are not guarantees of licensing, insurance, qualifications, availability, or work quality.
          Your contact details are only shared with builders you choose to hear from.
        </p>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
