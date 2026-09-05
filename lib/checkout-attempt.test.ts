import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_ATTEMPT_TTL_MS,
  clearCheckoutAttemptId,
  getCheckoutAttemptId,
} from "./checkout-attempt";

afterEach(() => {
  clearCheckoutAttemptId("certificate", "lot-1");
  vi.useRealTimers();
});

describe("getCheckoutAttemptId", () => {
  it("reuses one token across retries and tabs", () => {
    const first = getCheckoutAttemptId("certificate", "lot-1");
    const second = getCheckoutAttemptId("certificate", "lot-1");

    expect(second).toBe(first);
    expect(window.localStorage.getItem("lf:checkout-attempt:certificate:lot-1")).toContain(
      first,
    );
  });

  it("rotates the token after the Checkout Session lifetime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T00:00:00Z"));
    const first = getCheckoutAttemptId("certificate", "lot-1");

    vi.advanceTimersByTime(CHECKOUT_ATTEMPT_TTL_MS);

    expect(getCheckoutAttemptId("certificate", "lot-1")).not.toBe(first);
  });
});
