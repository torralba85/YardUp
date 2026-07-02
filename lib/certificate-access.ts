"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { purchaseId } from "./certificate-purchases-id";

/** The result of {@link useCertificateAccess}. */
export interface CertificateAccess {
  /** Whether the signed-in user has purchased the certificate for this lot. */
  purchased: boolean;
  /** True while the purchase status read is in flight. */
  loading: boolean;
  /** Re-read the purchase status (e.g. after returning from Stripe). */
  refresh: () => void;
}

/**
 * Track whether the signed-in user has purchased the certificate for a lot.
 *
 * Reads `certificatePurchases/{uid}_{certKey}` with the client SDK. The security
 * rules deny reading a grant that does not exist, so a denied/missing read is
 * treated as "not purchased". Call {@link CertificateAccess.refresh} after a
 * checkout return to pick up a grant the webhook has since written.
 *
 * @param uid - The signed-in user's id, or `null`/`undefined` for a guest.
 * @param certKey - The stable per-lot certificate key.
 */
export function useCertificateAccess(
  uid: string | null | undefined,
  certKey: string,
): CertificateAccess {
  const [access, setAccess] = useState({ requestKey: "", purchased: false });
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const docId = uid ? purchaseId(uid, certKey) : "";
  const requestKey = uid ? `${docId}:${nonce}` : "";

  useEffect(() => {
    let cancelled = false;
    if (!uid) return;

    getDoc(doc(db, "certificatePurchases", docId))
      .then((snap) => {
        if (!cancelled) setAccess({ requestKey, purchased: snap.exists() });
      })
      .catch(() => {
        if (!cancelled) setAccess({ requestKey, purchased: false });
      });

    return () => {
      cancelled = true;
    };
  }, [uid, docId, requestKey]);

  return {
    purchased: Boolean(uid) && access.requestKey === requestKey && access.purchased,
    loading: Boolean(uid) && access.requestKey !== requestKey,
    refresh,
  };
}
