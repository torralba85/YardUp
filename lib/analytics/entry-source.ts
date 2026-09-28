/**
 * Bounded entry source attribution for Studio navigation.
 *
 * Implements the contract in `docs/analytics-measurement-spec.md` Section: Common event parameters.
 * - Stores a bounded marker in sessionStorage.
 * - Consumed once at the Studio route boundary.
 * - Expires after 5 minutes.
 * - Defaults to "unknown".
 */

import type { EntrySource } from "./events";

const ENTRY_SOURCE_KEY = "lf:analytics-entry-source";
const ENTRY_SOURCE_TTL_MS = 5 * 60 * 1000;

interface StoredEntrySource {
  source: "landing_cta" | "shared_link";
  timestamp: number;
}

/**
 * Stash the entry source before navigating to the Studio.
 */
export function stashEntrySource(source: "landing_cta" | "shared_link"): void {
  if (typeof window === "undefined") return;
  try {
    const record: StoredEntrySource = {
      source,
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(ENTRY_SOURCE_KEY, JSON.stringify(record));
  } catch {
    // sessionStorage unavailable or quota exceeded
  }
}

/**
 * Consume the entry source once upon Studio route entry.
 */
export function consumeEntrySource(): EntrySource {
  if (typeof window === "undefined") return "unknown";
  try {
    const raw = window.sessionStorage.getItem(ENTRY_SOURCE_KEY);
    if (!raw) return "unknown";
    window.sessionStorage.removeItem(ENTRY_SOURCE_KEY);

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "unknown";
    const { source, timestamp } = parsed as Partial<StoredEntrySource>;

    if (typeof timestamp !== "number" || Date.now() - timestamp > ENTRY_SOURCE_TTL_MS) {
      return "unknown";
    }
    if (source === "landing_cta" || source === "shared_link") {
      return source;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Clear any pending entry source from session storage (e.g. on consent withdrawal).
 */
export function clearEntrySource(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ENTRY_SOURCE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}
