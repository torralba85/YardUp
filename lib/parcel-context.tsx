"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import type { LiveParcelData } from "./parcel-types";
import type { ParcelPreset } from "./feasibility";
import type { EstimatedParcel } from "./estimated-parcel";
import { fetchParcel, ParcelFetchError } from "./parcel-api";
import { geocodeAddress, GeocodeError } from "./geocode-api";
import { canGuestLookup, consumeGuestLookup, resetGuestLookups } from "./guest-lookup";
import { clearInitialParcel, peekInitialParcel } from "./parcel-handoff";

/**
 * Shown once an anonymous visitor has spent their free lookup. Names what they
 * already got and what signing in buys, rather than reading as a refusal.
 */
const GUEST_LIMIT_MESSAGE =
  "That was your free lookup. Create a free account to search another address.";

/**
 * Which kind of parcel is currently active: a built-in demo `preset`, an
 * anonymous wizard `estimated` parcel, or a `live` parcel fetched by address.
 */
export type ParcelMode = "preset" | "estimated" | "live";
/** Any parcel shape the studio can render, regardless of {@link ParcelMode}. */
export type AnyParcel = LiveParcelData | ParcelPreset | EstimatedParcel;

interface ParcelContextValue {
  parcel: AnyParcel;
  parcelMode: ParcelMode;
  parcelLoading: boolean;
  parcelError: string | null;
  /** Search an address by lat/lng — switches to live mode. */
  searchParcel: (lat: number, lng: number, address?: string) => Promise<void>;
  /** Geocode a free-text address, then look up its parcel and switch to live mode. */
  searchByAddress: (query: string) => Promise<void>;
  /** Restore a previously saved live parcel without making a network request. */
  restoreLiveParcel: (parcel: LiveParcelData) => void;
  /** Return to demo preset mode and clear live parcel data. */
  resetToPreset: (preset: ParcelPreset) => void;
  /** Apply an anonymous estimated parcel (wizard flow) — switches to estimated mode. */
  setEstimatedParcel: (estimated: EstimatedParcel) => void;
}

const ParcelContext = createContext<ParcelContextValue | null>(null);

/**
 * Access the active parcel and its mutation actions.
 *
 * @returns The current {@link ParcelContextValue}.
 * @throws {Error} If called outside a {@link ParcelProvider}.
 */
export function useParcel(): ParcelContextValue {
  const ctx = useContext(ParcelContext);
  if (!ctx) {
    throw new Error("useParcel must be used inside <ParcelProvider>");
  }
  return ctx;
}

interface ParcelProviderProps {
  initialPreset: ParcelPreset;
  children: ReactNode;
}

/**
 * Provide parcel state to the studio subtree.
 *
 * Holds the active parcel, mode, loading, and error state, and exposes actions
 * to search by coordinates or address (which fetch live data and send an auth
 * token when available), restore a saved live parcel, apply an estimated
 * parcel, or reset to a demo preset. Anonymous visitors get a small allowance
 * of real lookups before the account ask — see `guest-lookup.ts` for why, and
 * for where the actual cost ceiling lives. A
 * one-shot live parcel handoff can replace
 * the preset on mount so authenticated users never see demo data while entering
 * the studio. On fetch errors the current parcel and mode are preserved and a
 * user-facing message is surfaced via `parcelError`.
 *
 * @param props - {@link ParcelProviderProps} with the initial preset and children.
 * @returns The context provider wrapping `children`.
 */
export function ParcelProvider({ initialPreset, children }: ParcelProviderProps) {
  const { user } = useAuth();
  const [initialLiveParcel] = useState(() => peekInitialParcel());
  const [parcel, setParcel] = useState<AnyParcel>(initialLiveParcel ?? initialPreset);
  const [parcelMode, setParcelMode] = useState<ParcelMode>(
    initialLiveParcel ? "live" : "preset",
  );
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelError, setParcelError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLiveParcel) clearInitialParcel();
  }, [initialLiveParcel]);

  // Signing in retires the anonymous allowance, so a member who later signs out
  // is not left permanently spent from a lookup they ran before registering.
  useEffect(() => {
    if (user) resetGuestLookups();
  }, [user]);

  const searchParcel = useCallback(
    async (lat: number, lng: number, address?: string) => {
      if (!user && !canGuestLookup()) {
        setParcelError(GUEST_LIMIT_MESSAGE);
        return;
      }
      setParcelLoading(true);
      setParcelError(null);
      try {
        const idToken = await user?.getIdToken();
        const data = await fetchParcel(lat, lng, idToken, address);
        // Spent only on a resolved lookup: a failed fetch must not burn the
        // visitor's single try.
        if (!user) consumeGuestLookup();
        setParcel(data);
        setParcelMode("live");
      } catch (err) {
        if (err instanceof ParcelFetchError) {
          setParcelError(err.userMessage);
        } else {
          setParcelError("An unexpected error occurred. Please try again.");
        }
        // Keep current parcel / mode on error
      } finally {
        setParcelLoading(false);
      }
    },
    [user],
  );

  const searchByAddress = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      // An anonymous visitor gets a real lookup before the account ask. Both
      // routes put a tokenless caller on the keyless provider chain, so this
      // costs no metered quota.
      if (!user && !canGuestLookup()) {
        setParcelError(GUEST_LIMIT_MESSAGE);
        return;
      }
      setParcelLoading(true);
      setParcelError(null);
      try {
        const idToken = await user?.getIdToken();
        const { lat, lng, formattedAddress } = await geocodeAddress(q, idToken);
        const data = await fetchParcel(lat, lng, idToken, formattedAddress.trim() || q);
        // Spent only on a resolved lookup: an address we could not find, or a
        // parcel service that did not answer, must not burn the free try.
        if (!user) consumeGuestLookup();
        setParcel(data);
        setParcelMode("live");
      } catch (err) {
        if (err instanceof GeocodeError || err instanceof ParcelFetchError) {
          setParcelError(err.userMessage);
        } else {
          setParcelError("An unexpected error occurred. Please try again.");
        }
        // Keep current parcel / mode on error
      } finally {
        setParcelLoading(false);
      }
    },
    [user],
  );

  const restoreLiveParcel = useCallback((nextParcel: LiveParcelData) => {
    setParcel(nextParcel);
    setParcelMode("live");
    setParcelError(null);
  }, []);

  const setEstimatedParcel = useCallback((estimated: EstimatedParcel) => {
    setParcel(estimated);
    setParcelMode("estimated");
    setParcelError(null);
  }, []);

  const resetToPreset = useCallback((preset: ParcelPreset) => {
    setParcel(preset);
    setParcelMode("preset");
    setParcelError(null);
  }, []);

  return (
    <ParcelContext.Provider
      value={{
        parcel,
        parcelMode,
        parcelLoading,
        parcelError,
        searchParcel,
        searchByAddress,
        restoreLiveParcel,
        setEstimatedParcel,
        resetToPreset,
      }}
    >
      {children}
    </ParcelContext.Provider>
  );
}
