"use client";

import { useEffect, useState } from "react";
import { fetchActiveBuilders } from "@/lib/marketplace-firestore";
import { getMatchedBuilders } from "@/lib/marketplace";

/** What the connect form knows about the builders who serve a parcel. */
export type BuilderMatchState =
  | { status: "guest" }
  | { status: "loading" }
  | { status: "ready"; count: number }
  | { status: "error" };

/**
 * Counts the active builders whose service areas cover `location`, so the
 * connect form can say whom it will reach — or that nobody serves the area —
 * before anyone fills it in. The directory is readable only when signed in, so
 * guests get `guest`. Fetches only while `enabled` (the form is open).
 *
 * Matches the way the submit handler does, so the two never disagree.
 */
export function useBuilderMatches(
  signedIn: boolean,
  location: { city: string; state?: string; county?: string },
  enabled: boolean,
): BuilderMatchState {
  const { city, state, county } = location;
  const key = `${city}|${state ?? ""}|${county ?? ""}`;
  const [settled, setSettled] = useState<{ key: string; match: BuilderMatchState } | null>(null);

  useEffect(() => {
    if (!signedIn || !enabled) return;
    let cancelled = false;
    fetchActiveBuilders()
      .then((builders) => {
        if (cancelled) return;
        const count = getMatchedBuilders(builders, { city, state, county }).length;
        setSettled({ key, match: { status: "ready", count } });
      })
      .catch(() => {
        if (!cancelled) setSettled({ key, match: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, enabled, key, city, state, county]);

  if (!signedIn) return { status: "guest" };
  if (!settled || settled.key !== key) return { status: "loading" };
  return settled.match;
}
