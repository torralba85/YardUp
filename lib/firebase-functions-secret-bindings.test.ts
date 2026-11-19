import { readFileSync } from "node:fs";
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
    expect(functionsEntry).toContain('defineSecret("ATTOM_API_KEY")');
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
      "{ ...aiFnOpts, secrets: [openAiApiKey] }",
    );
    expect(functionsEntry).toContain("{ ...fnOpts, secrets: apiSecrets }");
    expect(functionsEntry).toContain(
      'const resendApiKey = defineSecret("RESEND_API_KEY");',
    );
    expect(functionsEntry).toMatch(
      /const apiSecrets = \[\s*googleMapsApiKey,\s*googlePlacesServerKey,\s*regridApiKey,\s*attomApiKey,\s*realieApiKey,\s*resendApiKey,\s*\.\.\.\(typeSafeApiKey \? \[typeSafeApiKey\] : \[\]\),\s*\]/,
    );
    // Opt-in, like native store: never bound unless a TypeSafe flag is on.
    expect(functionsEntry).toMatch(
      /const typeSafeApiKey =\s*process\.env\.TYPESAFE_GEOCODE_PICKER === "true" \|\|\s*process\.env\.TYPESAFE_ZONING_SHADOW === "true"\s*\? defineSecret\("TYPESAFE_API_KEY_SECRET"\)\s*: null;/,
    );
    expect(functionsEntry).toContain(
      "{ ...fnOpts, minInstances: 1, secrets: [stripeSecretKey, stripeWebhookSecret] }",
    );
    expect(functionsEntry).toContain(
      "{ ...fnOpts, secrets: nativeStoreSecrets }",
    );
  });

  it("keeps one Stripe instance warm, and only that one", () => {
    // `apiStripe` scales to zero otherwise and the first request after idle
    // waits 5-8 s on a cold start, which is the wait behind the $29 buy click
    // and a slow first webhook. Firebase deploys write the scaling settings
    // from this file, so a `gcloud run services update` alone would be undone
    // by the next deploy.
    expect(functionsEntry).toMatch(
      /exports\.apiStripe = onRequest\(\s*\{ \.\.\.fnOpts, minInstances: 1, secrets:/,
    );
    // Every other function stays on scale-to-zero: each warm instance bills
    // around $13 a month whether or not it serves a request.
    expect(functionsEntry.match(/minInstances:/g)).toHaveLength(1);
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
    // A flag, not a credential: a repository variable, like the key it gates.
    expect(envWrite).toContain(
      'TYPESAFE_ZONING_SHADOW="${{ vars.TYPESAFE_ZONING_SHADOW }}"',
    );
    expect(envWrite).not.toMatch(
      /GOOGLE_MAPS_API_KEY|GOOGLE_PLACES_SERVER_KEY|REGRID_API_KEY|ATTOM_API_KEY|REALIE_API_KEY|OPENAI_API_KEY|STRIPE_SECRET_KEY|APPLE_BUNDLE_ID|APPLE_ROOT_CA_FINGERPRINT256|GOOGLE_PLAY_PACKAGE_NAME|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|TYPESAFE_API_KEY/,
    );
  });
});
