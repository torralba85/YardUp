import { describe, expect, it } from "vitest";
import { createStripeIdempotencyKey } from "./stripe-idempotency";

describe("createStripeIdempotencyKey", () => {
  it("is deterministic and stays within Stripe's length limit", () => {
    const first = createStripeIdempotencyKey(
      "certificate",
      "user-1",
      "parcel-1",
    );
    const second = createStripeIdempotencyKey(
      "certificate",
      "user-1",
      "parcel-1",
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^lotfoundry:certificate:[a-f0-9]{64}$/);
    expect(first.length).toBeLessThanOrEqual(255);
  });

  it("separates purchase types and identifier boundaries", () => {
    expect(createStripeIdempotencyKey("certificate", "ab", "c")).not.toBe(
      createStripeIdempotencyKey("certificate", "a", "bc"),
    );
    expect(
      createStripeIdempotencyKey("certificate", "user", "parcel"),
    ).not.toBe(createStripeIdempotencyKey("lead_unlock", "user", "parcel"));
  });
});
