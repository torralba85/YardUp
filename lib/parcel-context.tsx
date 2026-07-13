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
import { clearInitialParcel, peekInitialParcel } from "./parcel-handoff";

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
 * to search by coordinates or address (which fetch live data and require an
 * auth token when available), restore a saved live parcel, apply an estimated
 * parcel, or reset to a demo preset. A one-shot live parcel handoff can replace
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

  const searchParcel = useCallback(
    async (lat: number, lng: number, address?: string) => {
      setParcelLoading(true);
      setParcelError(null);
      try {
        const idToken = await user?.getIdToken();
        const data = await fetchParcel(lat, lng, idToken, address);
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
      if (!user) {
        setParcelError("Sign in to search a real address.");
        return;
      }
      setParcelLoading(true);
      setParcelError(null);
      try {
        const idToken = await user.getIdToken();
        const { lat, lng, formattedAddress } = await geocodeAddress(q, idToken);
        const data = await fetchParcel(lat, lng, idToken, formattedAddress.trim() || q);
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
