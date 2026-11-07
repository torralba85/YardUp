/**
 * Cookie-consent state for Google Analytics.
 *
 * Analytics is opt-in: nothing is loaded and no cookie is written until the
 * visitor explicitly accepts. The decision lives in `localStorage` (not a
 * cookie) so that declining leaves no browser storage attributable to
 * analytics at all.
 *
 * Every accessor is SSR-safe and swallows storage failures: Safari private
 * mode, embedded webviews, and "block all cookies" settings all throw on
 * `localStorage` access rather than returning null.
 */

/** `localStorage` key holding the visitor's decision. */
export const CONSENT_STORAGE_KEY = "lf-analytics-consent";

/**
 * Bump when the disclosure materially changes (a new processor, a new data
 * category). A stored decision from an older version is treated as `unset`, so
 * the banner re-asks instead of silently inheriting stale consent.
 */
export const CONSENT_VERSION = 2;

/** Fired on `window` when the decision changes in this tab. */
export const CONSENT_CHANGE_EVENT = "lf:analytics-consent-change";

/** Session-only opt-out used by internal QA; carries no identity or free text. */
export const INTERNAL_ANALYTICS_MARKER = "lf:analytics-internal";

/**
 * Keep automated checks and explicitly marked QA sessions out of production
 * measurement. The marker is bounded and session-scoped; no account, address,
 * device, or network identifier is collected to make this decision.
 */
export function isAnalyticsSuppressed(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.webdriver === true) return true;
  try {
    return window.sessionStorage.getItem(INTERNAL_ANALYTICS_MARKER) === "1";
  } catch {
    return false;
  }
}

/** What the visitor chose. */
export type ConsentDecision = "granted" | "denied";

/** Decision state, including "has not chosen yet". */
export type ConsentState = ConsentDecision | "unset";

interface StoredConsent {
  decision: ConsentDecision;
  version: number;
  /** ISO timestamp of the decision, retained as an audit trail. */
  decidedAt: string;
}

function isDecision(value: unknown): value is ConsentDecision {
  return value === "granted" || value === "denied";
}

function pushConsentUpdate(decision: ConsentDecision): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: "denied",
    analytics_storage: decision,
  });
}

/**
 * Read the stored decision.
 *
 * @returns `"granted"`, `"denied"`, or `"unset"` when there is no usable
 * decision — no value, unparseable JSON, an older {@link CONSENT_VERSION}, or
 * storage that threw.
 */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    // Storage blocked entirely; treat as undecided but never crash render.
    return "unset";
  }
  if (!raw) return "unset";

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "unset";
    const { decision, version } = parsed as Partial<StoredConsent>;
    if (!isDecision(decision)) return "unset";
    if (version !== CONSENT_VERSION) return "unset";
    return decision;
  } catch {
    return "unset";
  }
}

/**
 * Persist a decision and notify listeners in this tab.
 *
 * The event fires even when the write throws, so the UI still reacts to the
 * click in environments where storage is unavailable. The decision simply does
 * not survive a reload there, and the banner asks again.
 *
 * @param decision - `"granted"` to enable analytics, `"denied"` to refuse it.
 */
export function writeConsent(decision: ConsentDecision): void {
  if (typeof window === "undefined") return;

  const record: StoredConsent = {
    decision,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Non-fatal: fall through and still emit, so the banner dismisses.
  }

  try {
    document.documentElement.removeAttribute("data-lf-consent");
  } catch {
    // Non-browser or sandbox.
  }

  pushConsentUpdate(decision);
  window.dispatchEvent(
    new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: decision }),
  );
}

/**
 * Forget the stored decision so the banner asks again.
 *
 * Withdrawing consent must be as easy as granting it, so this backs the
 * "Cookie preferences" control on the privacy page.
 */
export function clearConsent(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Non-fatal; the emit below still resets in-memory state.
  }

  try {
    document.documentElement.setAttribute("data-lf-consent", "unset");
  } catch {
    // Non-browser or sandbox.
  }

  pushConsentUpdate("denied");
  window.dispatchEvent(
    new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: "unset" }),
  );
}

/**
 * Subscribe to consent changes from this tab and from other tabs.
 *
 * `storage` covers the cross-tab case: accepting in one tab must not leave a
 * second tab still showing the banner (or, worse, still untracked).
 *
 * @param listener - Called with the new state on every change.
 * @returns An unsubscribe function.
 */
export function subscribeToConsent(
  listener: (state: ConsentState) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onLocalChange = (event: Event) => {
    const detail = (event as CustomEvent<ConsentState>).detail;
    listener(detail ?? readConsent());
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CONSENT_STORAGE_KEY) return;
    listener(readConsent());
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, onLocalChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onLocalChange);
    window.removeEventListener("storage", onStorage);
  };
}
