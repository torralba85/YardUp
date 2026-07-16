import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface FirebaseRewrite {
  source: string;
  function?: string;
}

interface FirebaseConfig {
  hosting: {
    rewrites: FirebaseRewrite[];
  };
}

describe("Firebase AI API routing", () => {
  const firebaseConfig = JSON.parse(
    readFileSync(resolve(process.cwd(), "firebase.json"), "utf8"),
  ) as FirebaseConfig;
  const functionsSource = readFileSync(
    resolve(process.cwd(), "functions/index.js"),
    "utf8",
  );
  const requestReplaySource = readFileSync(
    resolve(process.cwd(), "functions/request-replay.js"),
    "utf8",
  );
  const ciWorkflow = readFileSync(
    resolve(process.cwd(), ".github/workflows/ci.yml"),
    "utf8",
  );

  it("routes AI API traffic to the long-timeout AI function with an OpenAI secret", () => {
    const rewrites = firebaseConfig.hosting.rewrites;
    const aiRewriteIndex = rewrites.findIndex(
      (rewrite) => rewrite.source === "/api/ai/**",
    );
    const genericApiRewriteIndex = rewrites.findIndex(
      (rewrite) => rewrite.source === "/api/**",
    );

    expect(aiRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(genericApiRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(aiRewriteIndex).toBeLessThan(genericApiRewriteIndex);
    expect(rewrites[aiRewriteIndex].function).toBe("apiAi");
    expect(functionsSource).toContain("exports.apiAi = onRequest");
    expect(functionsSource).toContain("timeoutSeconds: 120");
    expect(functionsSource).toContain('invoker: "public"');
    expect(functionsSource).toContain(
      'defineSecret("OPENAI_API_KEY_SECRET")',
    );
    expect(functionsSource).toContain("secrets: [openAiApiKey]");
    expect(ciWorkflow).not.toContain(
      'OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}"',
    );
  });

  it("routes native store verification to its isolated optional-secret function", () => {
    const rewrites = firebaseConfig.hosting.rewrites;
    const storeRewriteIndex = rewrites.findIndex(
      (rewrite) => rewrite.source === "/api/store/**",
    );
    const genericApiRewriteIndex = rewrites.findIndex(
      (rewrite) => rewrite.source === "/api/**",
    );

    expect(storeRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(genericApiRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(storeRewriteIndex).toBeLessThan(genericApiRewriteIndex);
    expect(rewrites[storeRewriteIndex].function).toBe("apiStore");
    expect(functionsSource).toContain("exports.apiStore = onRequest");
    expect(functionsSource).toContain("secrets: nativeStoreSecrets");
    expect(ciWorkflow).toContain("deploy_target functions:apiStore");
  });

  it("creates the store target before its rewrite without exposing new asset URLs early", () => {
    const storeDeployIndex = ciWorkflow.indexOf(
      "deploy_target functions:apiStore",
    );
    const hostingDeployIndex = ciWorkflow.indexOf(
      "firebase deploy --only hosting,firestore:rules",
    );
    const appDeployIndex = ciWorkflow.indexOf(
      "for target in functions:app functions:api functions:apiAi functions:apiStripe",
    );

    expect(storeDeployIndex).toBeGreaterThanOrEqual(0);
    expect(hostingDeployIndex).toBeGreaterThanOrEqual(0);
    expect(appDeployIndex).toBeGreaterThanOrEqual(0);
    expect(storeDeployIndex).toBeLessThan(hostingDeployIndex);
    expect(hostingDeployIndex).toBeLessThan(appDeployIndex);
  });

  it("stops the release when any Firebase function target fails", () => {
    expect(ciWorkflow).toContain(
      "deploy_target functions:apiStore || exit $?",
    );
    expect(ciWorkflow).toContain(
      'deploy_target "$target" || exit $?',
    );
  });

  it("serializes production Firebase deploys so hosting rewrites cannot race", () => {
    expect(ciWorkflow).toContain("group: firebase-production-${{ github.ref }}");
    expect(ciWorkflow).toContain("cancel-in-progress: false");
  });

  it("replays Firebase raw request bodies before handing API POSTs to Next", () => {
    expect(functionsSource).toContain("requestForNext(req)");
    expect(requestReplaySource).toContain("Buffer.isBuffer(req.rawBody)");
    expect(requestReplaySource).toContain("Readable.from([body]");
    expect(requestReplaySource).toContain("JSON.stringify(req.body)");
    expect(requestReplaySource).not.toContain("getOwnPropertySymbols(req)");
  });
});
