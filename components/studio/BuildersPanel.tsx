"use client";

import { useEffect, useState } from "react";
import { Hammer, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { fetchActiveBuilders } from "@/lib/marketplace-firestore";
import { getMatchedBuilders } from "@/lib/marketplace";
import type { BuilderProfile } from "@/lib/marketplace-types";

/** Props for {@link BuildersPanel}. */
export interface BuildersPanelProps {
  /** The active parcel's `"City, ST"` string, used for service-area matching. */
  parcelCity: string;
  /** Open the connect-with-builders flow (the existing BuilderLeadPanel). */
  onConnect: () => void;
}

/**
 * Step 5 — the Builders destination. Shows the matched local builders for the
 * active parcel (company, licensed marker, service areas — never contact info,
 * which stays behind the paid referral), an honest zero-state when none serve
 * the area yet, and a sign-in prompt for guests. The connect CTA hands off to
 * the existing {@link BuilderLeadPanel} flow, which creates the referral that
 * builders pay to unlock.
 */
export default function BuildersPanel({ parcelCity, onConnect }: BuildersPanelProps) {
  const { user } = useAuth();
  const [builders, setBuilders] = useState<BuilderProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

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
  const matched = builders ? getMatchedBuilders(builders, parcelCity) : [];
  const noneMatched = Boolean(user) && builders !== null && matched.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="text-center">
        <p className="lf-kicker text-lf-clay-ink">Step 5 · Builders</p>
        <h2 className="lf-section-heading mt-2 text-lf-espresso">Connect with local builders.</h2>
        <p className="lf-body mx-auto mt-2 max-w-md text-lf-muted">
          Share your concept with vetted builders in your area. They reach out with quotes and the real next steps.
        </p>
      </div>

      {!user ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-lf-hairline bg-lf-card p-6 text-center">
          <p className="lf-body-sm text-lf-muted">
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
          className="flex items-center justify-center gap-2 rounded-lg border border-lf-hairline bg-lf-card p-6 text-sm text-lf-muted"
        >
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
          Finding builders near you…
        </div>
      ) : noneMatched ? (
        <div className="rounded-lg border border-lf-hairline bg-lf-sand-2 p-6 text-center">
          <p className="text-sm font-semibold text-lf-espresso">
            No builders are registered for {parcelCity} yet.
          </p>
          <p className="lf-body-sm mt-1 text-lf-muted">
            {loadError
              ? "We couldn't load the builder network — check your connection and try again."
              : "The network is growing. Save your concept and check back; we'll match you as builders join."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-center lf-kicker text-lf-muted">
            {matched.length} builder{matched.length === 1 ? "" : "s"} serve{matched.length === 1 ? "s" : ""}{" "}
            {parcelCity}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {matched.map((b) => (
              <li key={b.id} className="rounded-lg border border-lf-hairline bg-lf-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-lf-espresso">{b.companyName}</span>
                  {b.licenseNumber ? (
                    <StatusChip status="clear" label="Licensed" size="sm" className="shrink-0" />
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(b.serviceAreas || []).slice(0, 3).map((area) => (
                    <span
                      key={area.key}
                      className="inline-flex items-center gap-1 rounded-md border border-lf-hairline bg-lf-sand-2 px-1.5 py-0.5 font-mono text-[10px] text-lf-muted"
                    >
                      <MapPin size={10} aria-hidden />
                      {area.city}, {area.state}
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
        <p className="lf-caption text-center text-lf-muted">
          Free for homeowners — builders pay LotFoundry for the introduction, never you.
          Your contact details are only shared with builders you choose to hear from.
        </p>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
