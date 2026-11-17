"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import type { LiveParcelData } from "./parcel-types";
import type { ParcelPreset } from "./feasibility";
import type { EstimatedParcel } from "./estimated-parcel";
import { ParcelFetchError } from "./parcel-api";
import { GeocodeError } from "./geocode-api";
import { acquireLiveParcel, type LiveParcelLookup } from "./live-parcel-acquisition";
import { canGuestLookup, consumeGuestLookup, resetGuestLookups } from "./guest-lookup";
import { clearInitialParcel, peekInitialParcel } from "./parcel-handoff";
import { peekAddressQuery } from "./address-handoff";

/**
 * Shown once an anonymous visitor has spent their free lookups. Names what they
 * already got and what signing in buys, rather than reading as a refusal.
 */
const GUEST_LIMIT_MESSAGE =
  "You've used your 3 free lookups. Create a free account to search another address.";

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
  /** The address query currently being acquired or that failed lookup, if any. */
  targetAddress: string | null;
  /** True when the active flow originated from a real-address lookup (not an intentional demo). */
  isRealAddressFlow: boolean;
  /** Changes when a Homeowner chooses a new Parcel, before a lookup finishes. */
  selectionVersion: number;
  /** True when a guest lookup is blocked until account creation/sign-in. */
  authRequired: boolean;
  /** Dismiss the account-required state without changing the active parcel. */
  clearAuthRequired: () => void;
  /** Search an address by lat/lng — switches to live mode. */
  searchParcel: (lat: number, lng: number, address?: string) => Promise<void>;
  /** Geocode a free-text address, then look up its parcel and switch to live mode. */
  searchByAddress: (query: string, expectedSelectionVersion?: number) => Promise<void>;
  /** Re-run the last attempted real-address lookup. */
  retryLookup: () => Promise<void>;
  /** Restore a previously saved live parcel without making a network request. */
  restoreLiveParcel: (parcel: LiveParcelData, expectedSelectionVersion?: number) => void;
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
  const [initialAddressQuery] = useState(() => {
    if (typeof window === "undefined") return null;
    return peekAddressQuery() ?? new URLSearchParams(window.location.search).get("q")?.trim() ?? null;
  });

  const [parcel, setParcel] = useState<AnyParcel>(initialLiveParcel ?? initialPreset);
  const [parcelMode, setParcelMode] = useState<ParcelMode>(
    initialLiveParcel ? "live" : "preset",
  );
  const [targetAddress, setTargetAddress] = useState<string | null>(() => {
    if (initialLiveParcel) {
      return `${initialLiveParcel.address}, ${initialLiveParcel.city}`;
    }
    return initialAddressQuery;
  });
  const [isRealAddressFlow, setIsRealAddressFlow] = useState<boolean>(() => {
    return Boolean(initialLiveParcel || initialAddressQuery);
  });
  const [parcelLoading, setParcelLoading] = useState(
    Boolean(!initialLiveParcel && initialAddressQuery),
  );
  const [parcelError, setParcelError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const lookupGeneration = useRef(0);
  const activeLookupRef = useRef<{ generation: number; uid: string | undefined } | null>(null);
  const lastLookupRef = useRef<LiveParcelLookup | null>(
    initialAddressQuery ? { kind: "address", query: initialAddressQuery } : null,
  );
  const selectionRef = useRef(0);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const markSelection = useCallback(() => {
    selectionRef.current += 1;
    setSelectionVersion(selectionRef.current);
  }, []);
  const identityRef = useRef(user?.uid);
  useEffect(() => {
    if (identityRef.current === user?.uid) return;
    identityRef.current = user?.uid;
    if (activeLookupRef.current && activeLookupRef.current.uid === user?.uid) {
      return;
    }
    lookupGeneration.current += 1;
    activeLookupRef.current = null;
    setParcelLoading(false);
  }, [user?.uid]);
  const pendingLookupRef = useRef<
    | { kind: "coords"; lat: number; lng: number; address?: string }
    | { kind: "address"; query: string }
    | null
  >(null);

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
      setTargetAddress(address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setIsRealAddressFlow(true);
      lastLookupRef.current = { kind: "coords", lat, lng, address };
      if (!user && !canGuestLookup()) {
        pendingLookupRef.current = { kind: "coords", lat, lng, address };
        setAuthRequired(true);
        setParcelError(GUEST_LIMIT_MESSAGE);
        return;
      }
      setAuthRequired(false);
      markSelection();
      setParcelLoading(true);
      setParcelError(null);
      const generation = ++lookupGeneration.current;
      activeLookupRef.current = { generation, uid: user?.uid };
      try {
        const data = await acquireLiveParcel({ kind: "coords", lat, lng, address }, user);
        if (generation !== lookupGeneration.current) return;
        // Spent only on a resolved lookup: a failed fetch must not burn the
        // visitor's single try.
        if (!user) consumeGuestLookup();
        setParcel(data);
        setParcelMode("live");
        setTargetAddress(`${data.address}, ${data.city}`);
      } catch (err) {
        if (generation !== lookupGeneration.current) return;
        if (err instanceof ParcelFetchError) {
          setParcelError(err.userMessage);
        } else {
          setParcelError("An unexpected error occurred. Please try again.");
        }
        // Keep current parcel / mode on error
      } finally {
        if (generation === lookupGeneration.current) {
          activeLookupRef.current = null;
          setParcelLoading(false);
        }
      }
    },
    [user, markSelection],
  );

  const searchByAddress = useCallback(
    async (query: string, expectedSelectionVersion?: number) => {
      const q = query.trim();
      if (!q) return;
      if (expectedSelectionVersion !== undefined && expectedSelectionVersion !== selectionRef.current) return;
      setTargetAddress(q);
      setIsRealAddressFlow(true);
      lastLookupRef.current = { kind: "address", query: q };
      // An anonymous visitor gets a real lookup before the account ask. Both
      // routes put a tokenless caller on the keyless provider chain, so this
      // costs no metered quota.
      if (!user && !canGuestLookup()) {
        pendingLookupRef.current = { kind: "address", query: q };
        setAuthRequired(true);
        setParcelError(GUEST_LIMIT_MESSAGE);
        return;
      }
      setAuthRequired(false);
      if (expectedSelectionVersion === undefined) markSelection();
      setParcelLoading(true);
      setParcelError(null);
      const generation = ++lookupGeneration.current;
      activeLookupRef.current = { generation, uid: user?.uid };
      try {
        const data = await acquireLiveParcel({ kind: "address", query: q }, user);
        if (generation !== lookupGeneration.current) return;
        // Spent only on a resolved lookup: an address we could not find, or a
        // parcel service that did not answer, must not burn the free try.
        if (!user) consumeGuestLookup();
        setParcel(data);
        setParcelMode("live");
        setTargetAddress(`${data.address}, ${data.city}`);
      } catch (err) {
        if (generation !== lookupGeneration.current) return;
        if (err instanceof GeocodeError || err instanceof ParcelFetchError) {
          setParcelError(err.userMessage);
        } else {
          setParcelError("An unexpected error occurred. Please try again.");
        }
        // Keep current parcel / mode on error
      } finally {
        if (generation === lookupGeneration.current) {
          activeLookupRef.current = null;
          setParcelLoading(false);
        }
      }
    },
    [user, markSelection],
  );

  const retryLookup = useCallback(async () => {
    if (lastLookupRef.current) {
      if (lastLookupRef.current.kind === "coords") {
        await searchParcel(lastLookupRef.current.lat, lastLookupRef.current.lng, lastLookupRef.current.address);
      } else {
        await searchByAddress(lastLookupRef.current.query);
      }
    } else if (targetAddress) {
      await searchByAddress(targetAddress);
    }
  }, [searchParcel, searchByAddress, targetAddress]);

  useEffect(() => {
    if (!user || !pendingLookupRef.current) return;
    const pending = pendingLookupRef.current;
    pendingLookupRef.current = null;
    // The auth transition is the event that unlocks the queued lookup.
    setAuthRequired(false);
    setParcelError(null);
    if (pending.kind === "coords") {
      void searchParcel(pending.lat, pending.lng, pending.address);
    } else {
      void searchByAddress(pending.query);
    }
  }, [user, searchParcel, searchByAddress]);

  const clearAuthRequired = useCallback(() => {
    pendingLookupRef.current = null;
    setAuthRequired(false);
  }, []);

  const restoreLiveParcel = useCallback((nextParcel: LiveParcelData, expectedSelectionVersion?: number) => {
    if (expectedSelectionVersion !== undefined && expectedSelectionVersion !== selectionRef.current) return;
    if (expectedSelectionVersion === undefined) markSelection();
    lookupGeneration.current += 1;
    activeLookupRef.current = null;
    setParcelLoading(false);
    setParcel(nextParcel);
    setParcelMode("live");
    setTargetAddress(`${nextParcel.address}, ${nextParcel.city}`);
    setIsRealAddressFlow(true);
    setParcelError(null);
    setAuthRequired(false);
    pendingLookupRef.current = null;
  }, [markSelection]);

  const setEstimatedParcel = useCallback((estimated: EstimatedParcel) => {
    markSelection();
    lookupGeneration.current += 1;
    activeLookupRef.current = null;
    setParcelLoading(false);
    setParcel(estimated);
    setParcelMode("estimated");
    setTargetAddress(`${estimated.address}, ${estimated.city}`);
    setIsRealAddressFlow(true);
    setParcelError(null);
    setAuthRequired(false);
    pendingLookupRef.current = null;
  }, [markSelection]);

  const resetToPreset = useCallback((preset: ParcelPreset) => {
    markSelection();
    lookupGeneration.current += 1;
    activeLookupRef.current = null;
    lastLookupRef.current = null;
    clearInitialParcel();
    setTargetAddress(null);
    setIsRealAddressFlow(false);
    setParcelLoading(false);
    setParcel(preset);
    setParcelMode("preset");
    setParcelError(null);
    setAuthRequired(false);
    pendingLookupRef.current = null;
  }, [markSelection]);

  return (
    <ParcelContext.Provider
      value={{
        parcel,
        parcelMode,
        parcelLoading,
        parcelError,
        targetAddress,
        isRealAddressFlow,
        selectionVersion,
        authRequired,
        clearAuthRequired,
        searchParcel,
        searchByAddress,
        retryLookup,
        restoreLiveParcel,
        setEstimatedParcel,
        resetToPreset,
      }}
    >
      {children}
    </ParcelContext.Provider>
  );
}
