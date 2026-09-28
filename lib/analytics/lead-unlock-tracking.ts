/**
 * Lead unlock analytics reconciliation and deduplication.
 *
 * Implements the contract in `docs/analytics-measurement-spec.md` Section 16 (`builder_lead_unlocked`):
 * - Reconciles in-place unlocks and post-Stripe return unlocks.
 * - Enforces current consent: clears pending state on withdrawal.
 * - Deduplicates in-place and return paths so each unlock is emitted at most once.
 * - Never emits raw lead IDs or account IDs to GA4.
 */

import { readConsent } from "./consent";
import { trackBuilderLeadUnlocked, type TriageStatus, type UnlockMode } from "./events";
import type { BuilderInboxItem } from "@/lib/marketplace-types";

const PENDING_UNLOCK_KEY = "lf:analytics-pending-lead-unlock";
const UNLOCKED_DEDUPE_KEY_PREFIX = "lf:analytics-unlocked-lead:";
const PENDING_UNLOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface PendingUnlockAttempt {
  requestId: string;
  triageStatus: TriageStatus;
  timestamp: number;
}

// In-memory set for deduplication within the same session
const unlockedRecorded = new Set<string>();

/**
 * Reset deduplication cache for unit testing.
 * @internal
 */
export function _resetLeadUnlockDedupeForTesting(): void {
  unlockedRecorded.clear();
}

/**
 * Record a pending paid unlock attempt before redirecting to Stripe.
 * Only retained while consent is granted.
 */
export function recordPendingLeadUnlockAttempt(params: {
  requestId: string;
  triageStatus: TriageStatus;
}): void {
  if (typeof window === "undefined") return;
  if (readConsent() !== "granted") return;

  try {
    const record: PendingUnlockAttempt = {
      requestId: params.requestId,
      triageStatus: params.triageStatus,
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(PENDING_UNLOCK_KEY, JSON.stringify(record));
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Clear any pending lead unlock state from session storage.
 */
export function clearPendingLeadUnlock(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_UNLOCK_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Check if an unlock for this lead was already tracked.
 */
function isLeadUnlockRecorded(requestId: string): boolean {
  if (unlockedRecorded.has(requestId)) return true;
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(`${UNLOCKED_DEDUPE_KEY_PREFIX}${requestId}`) === "1") {
        unlockedRecorded.add(requestId);
        return true;
      }
    } catch {
      // sessionStorage unavailable
    }
  }
  return false;
}

/**
 * Mark this lead unlock as recorded.
 */
function markLeadUnlockRecorded(requestId: string): void {
  unlockedRecorded.add(requestId);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(`${UNLOCKED_DEDUPE_KEY_PREFIX}${requestId}`, "1");
    } catch {
      // sessionStorage unavailable
    }
  }
}

/**
 * Reconcile authenticated dashboard items with any pending unlock attempt.
 * Called when builder dashboard items load/hydrate.
 */
export function reconcilePendingLeadUnlock(items: BuilderInboxItem[]): void {
  if (typeof window === "undefined") return;
  if (readConsent() !== "granted") {
    clearPendingLeadUnlock();
    return;
  }

  try {
    const raw = window.sessionStorage.getItem(PENDING_UNLOCK_KEY);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      clearPendingLeadUnlock();
      return;
    }
    const { requestId, triageStatus, timestamp } = parsed as Partial<PendingUnlockAttempt>;

    if (
      !requestId ||
      typeof timestamp !== "number" ||
      Date.now() - timestamp > PENDING_UNLOCK_TTL_MS
    ) {
      clearPendingLeadUnlock();
      return;
    }

    const matchedItem = items.find((item) => item.request.id === requestId);
    if (matchedItem?.unlocked) {
      clearPendingLeadUnlock();
      if (!isLeadUnlockRecorded(requestId)) {
        markLeadUnlockRecorded(requestId);
        trackBuilderLeadUnlocked({
          unlock_mode: "paid",
          triage_status: triageStatus ?? matchedItem.response.status,
        });
      }
    }
  } catch {
    clearPendingLeadUnlock();
  }
}

/**
 * Record an in-place lead unlock (e.g. credit spend or demo unlock).
 */
export function recordInPlaceLeadUnlock(params: {
  requestId: string;
  unlockMode: UnlockMode;
  triageStatus: TriageStatus;
}): void {
  if (readConsent() !== "granted") return;
  if (isLeadUnlockRecorded(params.requestId)) return;

  markLeadUnlockRecorded(params.requestId);
  trackBuilderLeadUnlocked({
    unlock_mode: params.unlockMode,
    triage_status: params.triageStatus,
  });
}
