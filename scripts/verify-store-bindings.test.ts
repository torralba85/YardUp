import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const google = ["GOOGLE_PLAY_PACKAGE_NAME", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
const apple = ["APPLE_BUNDLE_ID", "APPLE_ROOT_CA_FINGERPRINT256"];
function verify(flags: Record<string, string>, keys: string[], state = "ACTIVE") {
  return spawnSync(process.execPath, [resolve("scripts/verify-store-bindings.cjs")], {
    input: JSON.stringify({ state, serviceConfig: {
      environmentVariables: { ...flags, PRIVATE_SENTINEL: "do-not-print-this" },
      secretEnvironmentVariables: keys.map(key => ({ key, secret: key, version: "1" })),
    } }), encoding: "utf8",
  });
}

describe("deployed native store secret bindings", () => {
  it("rejects the live mismatch of enabled verification and absent bindings", () => {
    const result = verify({ ENABLE_NATIVE_STORE_VERIFICATION: "true" }, []);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    expect(result.stderr + result.stdout).not.toContain("do-not-print-this");
  });
  it("accepts Android-only verification without requiring Apple credentials", () => {
    expect(verify({ ENABLE_GOOGLE_PLAY_VERIFICATION: "true" }, google).status).toBe(0);
  });
  it("requires both platforms when the legacy umbrella flag is enabled", () => {
    expect(verify({ ENABLE_NATIVE_STORE_VERIFICATION: "true" }, google).status).toBe(1);
    expect(verify({ ENABLE_NATIVE_STORE_VERIFICATION: "true" }, [...google, ...apple]).status).toBe(0);
  });
  it("rejects an unfinished deployment even with the expected bindings", () => {
    expect(verify({ ENABLE_GOOGLE_PLAY_VERIFICATION: "true" }, google, "DEPLOYING").status).toBe(1);
  });
  it("rejects an accidentally disabled production Google verifier", () => {
    const result = verify({}, google);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Google Play verification is disabled");
  });
});
