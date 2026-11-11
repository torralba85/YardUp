"use client";

import { BrandLockup } from "@/components/ui/BrandLockup";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { LogOut, Search } from "lucide-react";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";
import { consumeAddressQuery } from "@/lib/address-handoff";
import { GeocodeError } from "@/lib/geocode-api";
import { ParcelFetchError } from "@/lib/parcel-api";
import { acquireLiveParcel } from "@/lib/live-parcel-acquisition";
import type { LiveParcelData } from "@/lib/parcel-types";
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

  const openWithParcel = useCallback((parcel: LiveParcelData) => {
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
        const parcel = await acquireLiveParcel({ kind: "coords", lat, lng, address }, user);
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
        const parcel = await acquireLiveParcel({ kind: "address", query: trimmed }, user);
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
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <header className="border-b border-lot-line bg-lot-chalk">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="inline-flex min-h-11 items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink"
          >
            <BrandLockup className="h-8 w-auto" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-64 truncate text-sm text-lot-stone sm:block">{identity}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-11 items-center gap-2 rounded-control border border-lot-line px-4 text-sm font-semibold motion-safe:transition hover:bg-lot-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center px-5 py-9 sm:px-8 sm:py-16">
        <section className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] lg:items-center lg:gap-14">
          <div>
            <p className="lf-kicker text-lot-orange-ink">Your workspace</p>
            <h2 className="lf-section-heading mt-3">Start with your property.</h2>
            <p className="lf-body mt-4 max-w-[42ch] text-lot-stone">
              See your lot in a new light. Find your property to explore its space, local rules, and estimated costs.
            </p>
            <div className="mt-7 max-w-xl">
              <AddressSearch
                onSelect={(found: AddressSearchResult) =>
                  void lookupCoordinates(found.lat, found.lng, found.formattedAddress)
                }
                onSubmitText={(query) => void lookupText(query)}
              />
              {lookupLoading && (
                <div role="status" className="mt-3 flex items-center gap-2 text-sm text-lot-stone">
                  <span className="block h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
                  Loading your property…
                </div>
              )}
              {lookupError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-none border border-status-blocked/30 bg-status-blocked-soft p-3 text-sm text-status-blocked"
                >
                  <Search size={16} className="mt-0.5 shrink-0" />
                  {lookupError}
                </div>
              )}
            </div>
          </div>

          <figure className="mt-9 min-w-0 border-t border-lot-line pt-5 lg:mt-0 lg:border-t-0 lg:pt-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/a-lot-more/parcel-after-mobile.webp"
              width={768}
              height={512}
              alt="Illustrative model of a home with a small orange backyard home"
              className="aspect-[3/2] w-full object-contain"
            />
            <figcaption className="mt-3 border-t border-lot-line pt-4">
              <p className="lf-kicker text-lot-stone">A little more possibility</p>
              <p className="mt-2 text-xs leading-5 text-lot-stone">Concept illustration, not your property. Your analysis starts with an address.</p>
            </figcaption>
          </figure>
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
