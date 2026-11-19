"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { parcelPresets } from "./feasibility";
import { certificateKey } from "./certificate-key";
import type { LiveParcelData } from "./parcel-types";
import { stashInitialParcel } from "./parcel-handoff";
import { stashAddressQuery } from "./address-handoff";
import { CERTIFICATE_OPEN, CHECKOUT_RETURN_PARAM } from "./checkout-return";

/**
 * A purchased feasibility certificate recorded in `certificatePurchases`.
 */
export interface PurchasedCertificate {
  id: string;
  certKey: string;
  uid: string;
  stripeSessionId: string;
  amount: number;
  status: string;
  demo: boolean;
  createdAt: Date | null;
  parcelName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  parcelData?: LiveParcelData;
}

/**
 * Parse an untyped Firestore timestamp, date, or date string into a native Date.
 */
function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof (raw as Timestamp).toDate === "function") {
    return (raw as Timestamp).toDate();
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Match a slug needle only on hyphen boundaries so a preset id can never
 * match as a bare substring of an unrelated key (e.g. "oak" inside
 * "oakland-ave", or "oak-street" inside "oak-streetview-lot").
 */
function matchesSlugSegment(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return (
    haystack === needle ||
    haystack.startsWith(`${needle}-`) ||
    haystack.endsWith(`-${needle}`) ||
    haystack.includes(`-${needle}-`)
  );
}

/**
 * Humanize a certificate key slug if no explicit address was saved on the grant.
 */
export function formatCertKeyFallback(certKey: string): { title: string; subtitle?: string } {
  // Check preset lots first
  const preset = parcelPresets.find(
    (p) =>
      certificateKey(p) === certKey ||
      p.id === certKey ||
      matchesSlugSegment(certKey, p.id) ||
      matchesSlugSegment(
        certKey,
        p.address.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ),
  );
  if (preset) {
    return {
      title: preset.address,
      subtitle: preset.city,
    };
  }

  // Fallback: capitalize words in kebab-case key
  const cleaned = certKey
    .replace(/^ca-|^wa-|^tx-|^or-|^ny-|^fl-/i, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: cleaned || "Feasibility Certificate",
    subtitle: certKey,
  };
}

/**
 * "City, ST ZIP" for a grant. Live lookups store `city` as "San Diego, CA 92101"
 * beside separate `state` and `zip`, so each is appended only when missing.
 */
export function formatCertificateLocality(
  city?: string,
  state?: string,
  zip?: string,
): string | undefined {
  let locality = city?.trim();
  if (!locality) return undefined;
  const stateCode = state?.trim();
  if (stateCode && !new RegExp(`(^|[\\s,])${stateCode.replace(/[^A-Za-z]/g, "")}(?=$|[\\s,])`, "i").test(locality)) {
    locality = `${locality}, ${stateCode}`;
  }
  const postal = zip?.trim();
  if (postal && !locality.includes(postal)) locality = `${locality} ${postal}`;
  return locality;
}

/**
 * One-line address that re-finds a grant's lot when it has no stored parcel
 * data. The street line alone is ambiguous ("202 C St" geocoded to Chula
 * Vista, not San Diego), so the saved parcel name or the full locality is used.
 */
export function certificateSearchAddress(grant: {
  parcelName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string | undefined {
  const parcelName = grant.parcelName?.trim();
  if (parcelName) return parcelName;
  const street = grant.address?.trim();
  if (!street) return undefined;
  const locality =
    formatCertificateLocality(grant.city, grant.state, grant.zip) ||
    [grant.state?.trim(), grant.zip?.trim()].filter(Boolean).join(" ");
  return locality ? `${street}, ${locality}` : street;
}

/**
 * Fetch all certificate purchase grants held by an authenticated user.
 * Sorted client-side by purchase date descending (no composite index required).
 */
export async function fetchUserPurchasedCertificates(
  uid: string,
): Promise<PurchasedCertificate[]> {
  if (!uid) return [];

  const col = collection(db, "certificatePurchases");
  const q = query(col, where("uid", "==", uid));
  const snap = await getDocs(q);

  const certificates: PurchasedCertificate[] = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    const certKey = String(data.certKey || docSnap.id.replace(`${uid}_`, ""));
    const createdAt = parseDate(data.createdAt);

    return {
      id: docSnap.id,
      certKey,
      uid,
      stripeSessionId: String(data.stripeSessionId || ""),
      amount: typeof data.amount === "number" ? data.amount : 2900,
      status: String(data.status || "granted"),
      demo: Boolean(data.demo),
      createdAt,
      parcelName: typeof data.parcelName === "string" ? data.parcelName : undefined,
      address: typeof data.address === "string" ? data.address : undefined,
      city: typeof data.city === "string" ? data.city : undefined,
      state: typeof data.state === "string" ? data.state : undefined,
      zip: typeof data.zip === "string" ? data.zip : undefined,
      lat: typeof data.lat === "number" ? data.lat : undefined,
      lng: typeof data.lng === "number" ? data.lng : undefined,
      parcelData: (data.parcelData as LiveParcelData) || undefined,
    };
  });

  // Client-side sort descending by date
  certificates.sort((a, b) => {
    const timeA = a.createdAt?.getTime() ?? 0;
    const timeB = b.createdAt?.getTime() ?? 0;
    return timeB - timeA;
  });

  return certificates;
}

/**
 * Prepare handoff and return the destination studio URL for opening a certificate.
 */
export function buildStudioUrlForCertificate(cert: PurchasedCertificate): string {
  if (cert.parcelData) {
    stashInitialParcel(cert.parcelData);
  } else {
    const query = certificateSearchAddress(cert);
    if (query) stashAddressQuery(query);
  }
  return `/studio?cert=${encodeURIComponent(cert.certKey)}&${CHECKOUT_RETURN_PARAM}=${CERTIFICATE_OPEN}`;
}

/**
 * React hook to retrieve and subscribe to the user's purchased certificates.
 */
export function useUserPurchasedCertificates(uid: string | null | undefined) {
  const [certificates, setCertificates] = useState<PurchasedCertificate[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchUserPurchasedCertificates(uid)
      .then((items) => {
        if (!cancelled) {
          setCertificates(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch certificates:", err);
          setError("Could not load your certificates. Please try again.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [uid, nonce]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { certificates, loading, error, refresh };
}
