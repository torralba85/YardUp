import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCheckoutOrigin } from "./checkout-origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveCheckoutOrigin", () => {
  it("prefers the configured app URL and strips trailing slashes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lotfoundry.example///");

    expect(resolveCheckoutOrigin(new Headers({ origin: "https://evil.example" }))).toBe(
      "https://lotfoundry.example",
    );
  });

  it("falls back to the TWA's canonical web origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(resolveCheckoutOrigin(new Headers({ origin: "https://evil.example" }))).toBe(
      "https://yardup-2026.web.app",
    );
  });

  it("uses the request origin outside production for local dev", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(resolveCheckoutOrigin(new Headers({ origin: "http://localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });
});
