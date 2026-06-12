"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import type { LiveParcelData } from "./parcel-types";
import type { ParcelPreset } from "./feasibility";
import type { EstimatedParcel } from "./estimated-parcel";
import { fetchParcel, ParcelFetchError } from "./parcel-api";
import { geocodeAddress, GeocodeError } from "./geocode-api";

export type ParcelMode = "preset" | "estimated" | "live";
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

export function ParcelProvider({ initialPreset, children }: ParcelProviderProps) {
  const { user } = useAuth();
  const [parcel, setParcel] = useState<AnyParcel>(initialPreset);
  const [parcelMode, setParcelMode] = useState<ParcelMode>("preset");
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelError, setParcelError] = useState<string | null>(null);

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
      setParcelLoading(true);
      setParcelError(null);
      try {
        const idToken = await user?.getIdToken();
        const { lat, lng } = await geocodeAddress(q, idToken);
        const data = await fetchParcel(lat, lng, idToken, q);
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
