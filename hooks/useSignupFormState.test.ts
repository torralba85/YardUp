import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { rememberCapturedEmail } from "@/lib/certificate-purchase-intent";
import {
  clearPersistedSignupFormState,
  parseStoredSignupFormState,
  SIGNUP_FORM_STORAGE_KEY,
  useSignupFormState,
} from "./useSignupFormState";

describe("useSignupFormState", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearPersistedSignupFormState();
  });

  it("initializes with defaults and falls back to captured email when unedited", () => {
    rememberCapturedEmail("Alma@Example.com");
    const { result } = renderHook(() =>
      useSignupFormState({ defaultRole: "builder" }),
    );

    expect(result.current.displayName).toBe("");
    expect(result.current.email).toBe("alma@example.com");
    expect(result.current.role).toBe("builder");
    expect(result.current.legalAccepted).toBe(false);
  });

  it("persists displayName, email, role, and legalAccepted across remounts", () => {
    const first = renderHook(() => useSignupFormState({ defaultRole: "user" }));

    act(() => {
      first.result.current.setDisplayName("Alma Reyes");
      first.result.current.setEmail("alma@lotfoundry.net");
      first.result.current.setRole("builder");
      first.result.current.setLegalAccepted(true);
    });

    first.unmount();

    const remounted = renderHook(() =>
      useSignupFormState({ defaultRole: "user" }),
    );
    expect(remounted.result.current.displayName).toBe("Alma Reyes");
    expect(remounted.result.current.email).toBe("alma@lotfoundry.net");
    expect(remounted.result.current.role).toBe("builder");
    expect(remounted.result.current.legalAccepted).toBe(true);

    const raw = window.sessionStorage.getItem(SIGNUP_FORM_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({
      displayName: "Alma Reyes",
      email: "alma@lotfoundry.net",
      role: "builder",
      legalAccepted: true,
    });
  });

  it("clears persisted state on clearSignupFormState", () => {
    const { result } = renderHook(() => useSignupFormState());

    act(() => {
      result.current.setDisplayName("Alma Reyes");
      result.current.setEmail("alma@lotfoundry.net");
      result.current.setRole("builder");
      result.current.setLegalAccepted(true);
    });

    expect(window.sessionStorage.getItem(SIGNUP_FORM_STORAGE_KEY)).not.toBeNull();

    act(() => {
      result.current.clearSignupFormState();
    });

    expect(window.sessionStorage.getItem(SIGNUP_FORM_STORAGE_KEY)).toBeNull();
    expect(result.current.displayName).toBe("");
    expect(result.current.email).toBe("");
    expect(result.current.role).toBe("user");
    expect(result.current.legalAccepted).toBe(false);
  });

  it("gracefully recovers from malformed or unexpected sessionStorage payloads", () => {
    expect(parseStoredSignupFormState("{invalid-json")).toEqual({
      displayName: "",
      email: null,
      role: null,
      legalAccepted: false,
    });

    expect(
      parseStoredSignupFormState(
        JSON.stringify({
          displayName: 123,
          email: false,
          role: "admin",
          legalAccepted: "yes",
        }),
      ),
    ).toEqual({
      displayName: "",
      email: null,
      role: null,
      legalAccepted: false,
    });
  });
});
