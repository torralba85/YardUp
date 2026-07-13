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
      'defineSecret("REGRID_API_KEY_SECRET")',
    );
    expect(functionsEntry).toContain(
      'defineSecret("OPENAI_API_KEY_SECRET")',
    );
    expect(functionsEntry).toContain(
      "{ ...aiFnOpts, secrets: [openAiApiKey] }",
    );
    expect(functionsEntry).toContain(
      "{ ...fnOpts, secrets: [googleMapsApiKey, regridApiKey] }",
    );
    expect(functionsEntry).toContain(
      "{ ...fnOpts, secrets: [stripeSecretKey, stripeWebhookSecret] }",
    );
  });

  it("does not serialize server credentials into the CI environment file", () => {
    const envWrite = deployWorkflow.match(
      /cat > functions\/.env <<EOF([\s\S]*?)\n\s*EOF/,
    )?.[1];

    expect(envWrite).toBeDefined();
    expect(envWrite).not.toMatch(
      /GOOGLE_MAPS_API_KEY|REGRID_API_KEY|OPENAI_API_KEY|STRIPE_SECRET_KEY/,
    );
  });
});
