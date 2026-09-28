import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const functionsEntry = readFileSync("functions/index.js", "utf8");
const deployWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("Firebase Functions provider secret bindings", () => {
  it("binds each server credential only to the function that needs it", () => {
    expect(functionsEntry).toContain(
      'defineSecret("GOOGLE_MAPS_API_KEY_SECRET")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("GOOGLE_PLACES_SERVER_KEY_SECRET")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("REGRID_API_KEY_SECRET")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("OPENAI_API_KEY_SECRET")',
    );
    expect(functionsEntry).toContain('defineSecret("APPLE_BUNDLE_ID")');
    expect(functionsEntry).toContain(
      'defineSecret("APPLE_ROOT_CA_FINGERPRINT256")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("GOOGLE_PLAY_PACKAGE_NAME")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")',
    );
    expect(functionsEntry).toContain(
      "process.env.ENABLE_NATIVE_STORE_VERIFICATION === \"true\"",
    );
    expect(functionsEntry).toMatch(
      /const appleStoreVerificationEnabled =\s*nativeStoreVerificationEnabled \|\|\s*process\.env\.ENABLE_APPLE_STORE_VERIFICATION === "true"/,
    );
    expect(functionsEntry).toMatch(
      /const googlePlayVerificationEnabled =\s*nativeStoreVerificationEnabled \|\|\s*process\.env\.ENABLE_GOOGLE_PLAY_VERIFICATION === "true"/,
    );
    expect(functionsEntry).toContain("const appleStoreSecretParams");
    expect(functionsEntry).toContain("const googlePlaySecretParams");
    expect(functionsEntry).toContain(
      "...(appleStoreSecretParams ? Object.values(appleStoreSecretParams) : [])",
    );
    expect(functionsEntry).toContain(
      "...(googlePlaySecretParams ? Object.values(googlePlaySecretParams) : [])",
    );
    expect(functionsEntry).toContain(
      "{ ...aiFnOpts, secrets: aiSecrets }",
    );
    expect(functionsEntry).toContain("{ ...fnOpts, secrets: apiSecrets }");
    expect(functionsEntry).toContain(
      "{ ...fnOpts, secrets: [stripeSecretKey, stripeWebhookSecret] }",
    );
    expect(functionsEntry).toContain(
      "{ ...fnOpts, secrets: nativeStoreSecrets }",
    );
  });

  it("does not serialize server credentials into the CI environment file", () => {
    const envWrite = deployWorkflow.match(
      /cat > functions\/.env <<EOF([\s\S]*?)\n\s*EOF/,
    )?.[1];

    expect(envWrite).toBeDefined();
    expect(envWrite).toContain(
      'ENABLE_NATIVE_STORE_VERIFICATION="${{ secrets.ENABLE_NATIVE_STORE_VERIFICATION }}"',
    );
    expect(envWrite).toContain(
      'ENABLE_APPLE_STORE_VERIFICATION="${{ secrets.ENABLE_APPLE_STORE_VERIFICATION }}"',
    );
    expect(envWrite).toContain(
      'ENABLE_GOOGLE_PLAY_VERIFICATION="${{ secrets.ENABLE_GOOGLE_PLAY_VERIFICATION }}"',
    );
    expect(envWrite).toContain(
      'TYPESAFE_GEOCODE_PICKER="${{ secrets.TYPESAFE_GEOCODE_PICKER }}"',
    );
    expect(envWrite).toContain(
      'TYPESAFE_BRIEF_REVIEW="${{ vars.TYPESAFE_BRIEF_REVIEW }}"',
    );
    expect(envWrite).not.toMatch(
      /GOOGLE_MAPS_API_KEY|GOOGLE_PLACES_SERVER_KEY|REGRID_API_KEY|OPENAI_API_KEY|STRIPE_SECRET_KEY|APPLE_BUNDLE_ID|APPLE_ROOT_CA_FINGERPRINT256|GOOGLE_PLAY_PACKAGE_NAME|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|TYPESAFE_API_KEY/,
    );
  });

  it.each([
    ["", "", false, false],
    ["true", "", true, false],
    ["", "shadow", false, true],
    ["true", "shadow", true, true],
    ["false", "true", false, false],
  ])("isolates Jev bindings for geocode=%s and brief=%s", (geocode, brief, apiBound, aiBound) => {
    const registered: Record<string, { secrets?: string[] }> = {};
    const defined: string[] = [];
    runInNewContext(functionsEntry, {
      exports: registered,
      __dirname: "/functions",
      process: { env: { TYPESAFE_GEOCODE_PICKER: geocode, TYPESAFE_BRIEF_REVIEW: brief } },
      require: (name: string) => {
        if (name === "path") return path;
        if (name === "./request-replay") return { requestForNext: (req: unknown) => req };
        if (name === "firebase-functions/core") return { onInit: () => {} };
        if (name === "firebase-functions/v2/https") return { onRequest: (options: unknown) => options };
        if (name === "firebase-functions/params") return {
          defineSecret: (key: string) => { defined.push(key); return key; },
        };
        throw new Error(`Unexpected module: ${name}`);
      },
    });
    const secret = "TYPESAFE_API_KEY_SECRET";
    expect(registered.api.secrets?.includes(secret)).toBe(apiBound);
    expect(registered.apiAi.secrets?.includes(secret)).toBe(aiBound);
    expect(registered.apiAi.secrets).toContain("OPENAI_API_KEY_SECRET");
    expect(registered.api.secrets).not.toContain("OPENAI_API_KEY_SECRET");
    for (const fn of ["app", "apiStore", "apiStripe"]) {
      expect(registered[fn].secrets ?? []).not.toContain(secret);
    }
    expect(defined.filter((name) => name === secret)).toHaveLength(apiBound || aiBound ? 1 : 0);
  });
});
