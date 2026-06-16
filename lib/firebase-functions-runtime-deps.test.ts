import { describe, expect, it } from "vitest";
import functionsPackage from "@/functions/package.json";
import rootPackage from "@/package.json";

describe("Firebase Functions runtime dependencies", () => {
  it("declares Stripe for deployed API routes", () => {
    expect(functionsPackage.dependencies.stripe).toBe(
      rootPackage.dependencies.stripe,
    );
  });
});
