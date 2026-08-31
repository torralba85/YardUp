"use client";

import { useSyncExternalStore } from "react";
import {
  type ConsentState,
  readConsent,
  subscribeToConsent,
} from "@/lib/analytics/consent";

/**
 * Consent state as seen by a component, plus `"pending"` — the server render
 * and the hydration pass, before `localStorage` has been read.
 */
export type ConsentSnapshot = ConsentState | "pending";

/**
 * Subscribe to the visitor's analytics consent decision.
 *
 * The server snapshot is `"pending"` rather than `"unset"` on purpose. Consent
 * lives in `localStorage`, which SSR cannot see, so rendering the banner
 * server-side would flash it at every returning visitor who already accepted —
 * and would mismatch on hydration. `"pending"` renders nothing on the server
 * and through hydration; React then re-reads on the client and settles to the
 * real value. Using `useSyncExternalStore` for this (rather than a
 * `setState`-in-effect mount flag) also keeps it clear of the
 * `react-hooks/set-state-in-effect` rule noted in CLAUDE.md.
 *
 * @returns `"pending"`, `"unset"`, `"granted"`, or `"denied"`.
 */
export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore<ConsentSnapshot>(
    subscribeToConsent,
    readConsent,
    () => "pending",
  );
}
