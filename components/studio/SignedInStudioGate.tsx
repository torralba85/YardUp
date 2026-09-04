"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { LogOut, Search } from "lucide-react";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";
import { consumeAddressQuery } from "@/lib/address-handoff";
import { geocodeAddress, GeocodeError } from "@/lib/geocode-api";
import { fetchParcel, ParcelFetchError } from "@/lib/parcel-api";
import { peekInitialParcel, stashInitialParcel } from "@/lib/parcel-handoff";
import AddressSearch, { type AddressSearchResult } from "./AddressSearch";

/**
 * Address-first entry for authenticated lot owners.
 *
 * The full studio is not mounted until a real parcel has resolved and been
 * handed to {@link FeasibilityStudio}. This keeps preset cities, addresses, and
 * estimates out of the signed-in first impression.
 */
export default function SignedInStudioGate({ user }: { user: User }) {
  const { logout } = useAuth();
  const [studioReady, setStudioReady] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const handoffStarted = useRef(false);

  const openWithParcel = useCallback((parcel: Awaited<ReturnType<typeof fetchParcel>>) => {
    if (!stashInitialParcel(parcel)) {
      setLookupError("Could not open your workspace in this browser. Check storage permissions and try again.");
      return;
    }
    setStudioReady(true);
  }, []);

  const lookupCoordinates = useCallback(
    async (lat: number, lng: number, address?: string) => {
      if (lookupLoading) return;
      setLookupLoading(true);
      setLookupError(null);
      try {
        const idToken = await user.getIdToken();
        const parcel = await fetchParcel(lat, lng, idToken, address);
        openWithParcel(parcel);
      } catch (error) {
        setLookupError(getLookupError(error));
      } finally {
        setLookupLoading(false);
      }
    },
    [lookupLoading, openWithParcel, user],
  );

  const lookupText = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || lookupLoading) return;
      setLookupLoading(true);
      setLookupError(null);
      try {
        const idToken = await user.getIdToken();
        const { lat, lng, formattedAddress } = await geocodeAddress(trimmed, idToken);
        const parcel = await fetchParcel(lat, lng, idToken, formattedAddress.trim() || trimmed);
        openWithParcel(parcel);
      } catch (error) {
        setLookupError(getLookupError(error));
      } finally {
        setLookupLoading(false);
      }
    },
    [lookupLoading, openWithParcel, user],
  );

  // Resolve browser-only handoff state after hydration so the server and first
  // client render stay identical. Address text is accepted only from the
  // session-storage handoff, never URL query parameters.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (handoffStarted.current || typeof window === "undefined") return;
    handoffStarted.current = true;

    const pendingAddress = consumeAddressQuery();
    if (pendingAddress) {
      void lookupText(pendingAddress);
      return;
    }

    if (peekInitialParcel() !== null) {
      setStudioReady(true);
    }
  }, [lookupText]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (studioReady) {
    return <FeasibilityStudio />;
  }

  const identity = user.displayName || user.email || "Account";

  return (
    <div className="min-h-dvh bg-lf-sand text-lf-espresso">
      <header className="border-b border-lf-hairline bg-lf-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-8 w-auto" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-64 truncate text-sm text-lf-muted sm:block">{identity}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-11 items-center gap-2 rounded-full border border-lf-hairline px-4 text-sm font-semibold transition hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center px-4 py-12 lg:px-8">
        <section className="w-full rounded-2xl border border-lf-hairline bg-lf-card p-6 shadow-sm sm:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:gap-12">
          <div>
            <p className="lf-kicker text-lf-clay-ink">Your workspace</p>
            <h1 className="lf-section-heading mt-3">Start with your property.</h1>
            <p className="lf-body mt-3 max-w-[58ch] text-lf-muted">
              Your account starts empty. Search an address to load its parcel, zoning, and local market data.
            </p>
            <div className="mt-7 max-w-xl">
              <AddressSearch
                onSelect={(found: AddressSearchResult) =>
                  void lookupCoordinates(found.lat, found.lng, found.formattedAddress)
                }
                onSubmitText={(query) => void lookupText(query)}
              />
              {lookupLoading && (
                <div role="status" className="mt-3 flex items-center gap-2 text-sm text-lf-muted">
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
                  Loading your property…
                </div>
              )}
              {lookupError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-lf-brick/30 bg-lf-brick-soft p-3 text-sm text-lf-brick"
                >
                  <Search size={16} className="mt-0.5 shrink-0" />
                  {lookupError}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 flex min-h-52 items-center justify-center rounded-xl border border-dashed border-lf-hairline bg-lf-sand-2 p-8 text-center lg:mt-0">
            <div>
              <Search size={28} className="mx-auto text-lf-clay-ink" aria-hidden="true" />
              <p className="mt-4 font-semibold">No property loaded</p>
              <p className="mt-2 text-sm text-lf-muted">Your analysis will appear here after you choose an address.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function getLookupError(error: unknown): string {
  if (error instanceof GeocodeError) return error.userMessage;
  if (error instanceof ParcelFetchError) {
    if (error.userMessage.includes("Demo mode")) {
      return "Parcel data is unavailable for this address. Try another address.";
    }
    if (error.userMessage.includes("demo preset")) {
      return "Your session could not authorize the address lookup. Sign out and sign in again.";
    }
    return error.userMessage;
  }
  return "An unexpected error occurred. Please try again.";
}
