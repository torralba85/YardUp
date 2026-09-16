import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_LOOKUP_LIMIT,
  canGuestLookup,
  consumeGuestLookup,
  guestLookupsRemaining,
  resetGuestLookups,
} from "./guest-lookup";

const KEY = "lf:guest-lookups";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("guest lookup allowance", () => {
  it("starts with the full allowance", () => {
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
    expect(canGuestLookup()).toBe(true);
  });

  it("spends the allowance down to zero and no further", () => {
    for (let i = 0; i < GUEST_LOOKUP_LIMIT; i += 1) consumeGuestLookup();

    expect(guestLookupsRemaining()).toBe(0);
    expect(canGuestLookup()).toBe(false);

    consumeGuestLookup();
    expect(guestLookupsRemaining()).toBe(0);
  });

  it("restores the allowance on reset", () => {
    consumeGuestLookup();
    resetGuestLookups();

    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores a corrupted stored value rather than locking the visitor out", () => {
    window.localStorage.setItem(KEY, "not-a-number");

    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
    expect(canGuestLookup()).toBe(true);
  });

  it("treats a negative stored value as unused", () => {
    window.localStorage.setItem(KEY, "-5");

    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
  });

  it("allows the lookup when storage throws", () => {
    // Private mode and blocked site data both surface as a throwing accessor.
    // The server-side guest limits still hold, so the visitor gets the lookup
    // rather than a wall they cannot clear.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    expect(canGuestLookup()).toBe(true);
    expect(() => consumeGuestLookup()).not.toThrow();
    expect(canGuestLookup()).toBe(true);
  });
});
