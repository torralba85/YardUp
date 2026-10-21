"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readCapturedEmail } from "@/lib/certificate-purchase-intent";

export const SIGNUP_FORM_STORAGE_KEY = "lotfoundry:signup-form-state";
const CHANGE_EVENT = "lotfoundry:signup-form-state-change";

export type SignupRole = "user" | "builder";

interface StoredSignupFormState {
  displayName: string;
  email: string | null;
  role: SignupRole | null;
  legalAccepted: boolean;
}

export interface UseSignupFormStateOptions {
  defaultRole?: SignupRole;
}

export interface SignupFormState {
  displayName: string;
  email: string;
  role: SignupRole;
  legalAccepted: boolean;
  setDisplayName: (displayName: string) => void;
  setEmail: (email: string) => void;
  setRole: (role: SignupRole) => void;
  setLegalAccepted: (legalAccepted: boolean) => void;
  clearSignupFormState: () => void;
}

const DEFAULT_STORED_STATE: StoredSignupFormState = {
  displayName: "",
  email: null,
  role: null,
  legalAccepted: false,
};

// Same-tab fallback when sessionStorage throws (private/restricted modes).
let inMemoryRawState: string | null = null;

const subscribeToNothing = () => () => {};

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SIGNUP_FORM_STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function readRawState(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SIGNUP_FORM_STORAGE_KEY);
  } catch {
    return inMemoryRawState;
  }
}

export function parseStoredSignupFormState(raw: string | null): StoredSignupFormState {
  if (!raw) return DEFAULT_STORED_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_STORED_STATE;
    const candidate = parsed as Record<string, unknown>;
    return {
      displayName: typeof candidate.displayName === "string" ? candidate.displayName : "",
      email: typeof candidate.email === "string" ? candidate.email : null,
      role:
        candidate.role === "user" || candidate.role === "builder"
          ? candidate.role
          : null,
      legalAccepted:
        typeof candidate.legalAccepted === "boolean" ? candidate.legalAccepted : false,
    };
  } catch {
    return DEFAULT_STORED_STATE;
  }
}

function writeStoredState(patch: Partial<StoredSignupFormState>): void {
  if (typeof window === "undefined") return;
  const current = parseStoredSignupFormState(readRawState());
  const next: StoredSignupFormState = {
    ...current,
    ...patch,
  };
  const serialized = JSON.stringify(next);
  inMemoryRawState = serialized;
  try {
    window.sessionStorage.setItem(SIGNUP_FORM_STORAGE_KEY, serialized);
  } catch {
    // In-memory fallback still preserves state across in-app route transitions.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Remove any persisted sign-up draft from sessionStorage. */
export function clearPersistedSignupFormState(): void {
  inMemoryRawState = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SIGNUP_FORM_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Persists non-sensitive sign-up form state (`displayName`, `email`, `role`,
 * and `legalAccepted`) to `sessionStorage` so accidental refreshes or visits to
 * `/terms` and `/privacy` do not lose the user's progress. Passwords are never
 * written to web storage.
 */
export function useSignupFormState(
  options: UseSignupFormStateOptions = {},
): SignupFormState {
  const { defaultRole = "user" } = options;
  const raw = useSyncExternalStore(subscribe, readRawState, () => null);
  const capturedEmail = useSyncExternalStore(
    subscribeToNothing,
    readCapturedEmail,
    () => "",
  );
  const stored = parseStoredSignupFormState(raw);

  const setDisplayName = useCallback((displayName: string) => {
    writeStoredState({ displayName });
  }, []);

  const setEmail = useCallback((email: string) => {
    writeStoredState({ email });
  }, []);

  const setRole = useCallback((role: SignupRole) => {
    writeStoredState({ role });
  }, []);

  const setLegalAccepted = useCallback((legalAccepted: boolean) => {
    writeStoredState({ legalAccepted });
  }, []);

  return {
    displayName: stored.displayName,
    email: stored.email ?? capturedEmail,
    role: stored.role ?? defaultRole,
    legalAccepted: stored.legalAccepted,
    setDisplayName,
    setEmail,
    setRole,
    setLegalAccepted,
    clearSignupFormState: clearPersistedSignupFormState,
  };
}
