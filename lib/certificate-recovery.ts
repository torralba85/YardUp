"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { purchaseId } from "./certificate-purchases-id";
import { normalizeLiveParcel } from "./saved-scenarios";
import type { LiveParcelData } from "./parcel-types";
import { CHECKOUT_CANCELLED, CHECKOUT_RETURNED, CHECKOUT_RETURN_PARAM, CERTIFICATE_OPEN } from "./checkout-return";

export interface CertificateGrant {
  parcelData?: LiveParcelData;
  address?: string;
  analyticsOrderId?: string;
  amount?: number;
}

export interface CertificateAccess {
  purchased: boolean;
  loading: boolean;
  refresh: () => void;
  analyticsOrderId?: string;
  amount?: number;
}

export interface CertificateReturnIntent {
  kind: "checkout" | "open" | "cancel";
  certKey: string | null;
}

export interface CertificateRecovery {
  access: CertificateAccess;
  intent: CertificateReturnIntent | null;
  status: "idle" | "checking" | "unverified" | "granted";
  retry: () => void;
  consumeOpen: () => boolean;
  consumePurchase: () => boolean;
  consumeCancellation: () => boolean;
  /** Retire a cancelled return once the Homeowner starts Checkout again. */
  acknowledgeCancellation: () => void;
}

function captureIntent(): CertificateReturnIntent | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const marker = params.get(CHECKOUT_RETURN_PARAM);
  if (marker === CHECKOUT_CANCELLED) return { kind: "cancel", certKey: null };
  const key = params.get("cert")?.trim();
  if (!key || key.length > 200) return null;
  // Bare keys also come from old My Certificates links. They prove no new Purchase.
  const kind = marker === CHECKOUT_RETURNED || key === "1" ? "checkout" : "open";
  return { kind, certKey: key };
}

/** Own the return intent, bounded Grant observation, and Parcel restoration together. */
export function useCertificateRecovery({
  uid, certKey, ready, hydrated = true, onRestore, selectionVersion = 0,
}: {
  uid: string | null | undefined;
  certKey: string;
  /** Auth and profile have resolved; Grant reads wait for it. */
  ready: boolean;
  /** The active Parcel reflects URL hydration; the return binds to this selection. */
  hydrated?: boolean;
  selectionVersion?: number;
  onRestore?: (grant: CertificateGrant, selectionVersion: number) => void | Promise<void>;
}): CertificateRecovery {
  const [captured] = useState(captureIntent);
  const [abandoned, setAbandoned] = useState(false);
  const [legacyKey, setLegacyKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string; status: CertificateRecovery["status"]; grant: CertificateGrant | null;
  }>({ key: "", status: "idle", grant: null });
  const anchorKey = useRef<string | null>(null);
  const anchorSelection = useRef<number | null>(null);
  const restore = useRef(onRestore);
  const consumed = useRef(new Set<string>());
  useEffect(() => { restore.current = onRestore; }, [onRestore]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const cancelReturn = captured?.kind === "cancel";
  const acknowledgeCancellation = useCallback(() => {
    if (cancelReturn) setAbandoned(true);
  }, [cancelReturn]);
  const intent = abandoned ? null : captured;
  const returning = intent?.kind === "checkout" || intent?.kind === "open";
  let target = certKey;
  if (returning) target = intent.certKey === "1" ? legacyKey ?? certKey : intent.certKey ?? certKey;
  const requestKey = uid ? `${purchaseId(uid, target)}:${nonce}` : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("cert");
    if ([CHECKOUT_CANCELLED, CHECKOUT_RETURNED, CERTIFICATE_OPEN].includes(params.get(CHECKOUT_RETURN_PARAM) ?? "")) {
      params.delete(CHECKOUT_RETURN_PARAM);
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Bind the return to the hydrated selection without waiting for auth, so a
    // lookup accepted while auth is pending abandons it instead of becoming its baseline.
    anchorKey.current ??= certKey;
    anchorSelection.current ??= selectionVersion;
    if (returning && intent?.certKey === "1" && legacyKey === null) {
      // Bind the legacy return to the hydrated Parcel.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLegacyKey(certKey);
      return;
    }
    if (returning && certKey === target) anchorKey.current = target;
    if (intent && (selectionVersion !== anchorSelection.current || certKey !== anchorKey.current)) {
      // A new Address chosen by the Homeowner abandons the prior return or cancellation.
      setAbandoned(true);
      return;
    }
    if (!uid || !ready) return;
    let cancelled = false;
    let settled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (status: CertificateRecovery["status"], grant: CertificateGrant | null) => {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(pollTimer);
      clearTimeout(deadlineTimer);
      setSnapshot({ key: requestKey, status, grant });
    };
    if (returning) deadlineTimer = setTimeout(() => finish("unverified", null), 30000);

    const read = async () => {
      try {
        const result = await getDoc(doc(db, "certificatePurchases", purchaseId(uid, target)));
        if (cancelled || settled) return;
        const data = result.exists() ? result.data() : null;
        if (data && data.uid === uid) {
          const parcelData = normalizeLiveParcel(data.parcelData);
          const grant: CertificateGrant = {
            ...(parcelData ? { parcelData } : {}),
            ...(typeof data.address === "string" ? { address: data.address } : {}),
            ...(typeof data.analyticsOrderId === "string" ? { analyticsOrderId: data.analyticsOrderId } : {}),
            ...(typeof data.amount === "number" && Number.isFinite(data.amount) && data.amount >= 0 ? { amount: data.amount } : {}),
          };
          if (returning && certKey !== target && restore.current) await restore.current(grant, selectionVersion);
          finish("granted", grant);
          return;
        }
      } catch {
        // Firestore denies a missing Grant. Neither denial nor a network error proves no Purchase.
      }
      if (cancelled || settled) return;
      if (returning) pollTimer = setTimeout(() => { void read(); }, 1500);
      else finish("idle", null);
    };
    void read();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(deadlineTimer);
    };
  }, [uid, ready, hydrated, certKey, requestKey, returning, target, intent, legacyKey, selectionVersion]);

  const current = Boolean(uid) && snapshot.key === requestKey;
  const purchased = current && Boolean(snapshot.grant) && certKey === target;
  const status = returning
    ? purchased ? "granted" : !ready || !uid || !current ? "checking" : snapshot.status === "granted" ? "unverified" : snapshot.status
    : purchased ? "granted" : "idle";
  const consume = (key: string, allowed: boolean) => {
    if (!allowed || consumed.current.has(key)) return false;
    consumed.current.add(key);
    return true;
  };
  const grantKey = `${uid ?? "guest"}:${target}`;
  return {
    access: {
      purchased,
      loading: Boolean(uid) && (!ready || !current || status === "checking"),
      refresh: retry,
      analyticsOrderId: purchased ? snapshot.grant?.analyticsOrderId : undefined,
      amount: purchased ? snapshot.grant?.amount : undefined,
    },
    intent, status, retry, acknowledgeCancellation,
    consumeOpen: () => consume(`${grantKey}:open`, purchased && Boolean(returning)),
    consumePurchase: () => consume(`${grantKey}:purchase`, purchased && intent?.kind === "checkout" && Boolean(snapshot.grant?.analyticsOrderId)),
    // The captured cancellation is one event, whichever account or Parcel is active later.
    consumeCancellation: () => consume("cancel", intent?.kind === "cancel"),
  };
}
