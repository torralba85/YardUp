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

  it("deploys the store target and backward-compatible rules before publishing Hosting", () => {
    const storeDeployIndex = ciWorkflow.indexOf(
      "deploy_target functions:apiStore",
    );
    const rulesDeployIndex = ciWorkflow.indexOf(
      "firebase deploy --only firestore:rules --project yardup-2026",
    );
    const hostingDeployIndex = ciWorkflow.indexOf(
      "firebase deploy --only hosting --project yardup-2026",
    );
    const appDeployIndex = ciWorkflow.indexOf(
      'deploy_target "functions:app,functions:api,functions:apiAi,functions:apiStripe"',
    );

    expect(storeDeployIndex).toBeGreaterThanOrEqual(0);
    expect(rulesDeployIndex).toBeGreaterThanOrEqual(0);
    expect(hostingDeployIndex).toBeGreaterThanOrEqual(0);
    expect(appDeployIndex).toBeGreaterThanOrEqual(0);
    expect(storeDeployIndex).toBeLessThan(rulesDeployIndex);
    expect(rulesDeployIndex).toBeLessThan(hostingDeployIndex);
    expect(hostingDeployIndex).toBeLessThan(appDeployIndex);
  });

  it("stops the release when any Firebase function target fails", () => {
    expect(ciWorkflow).toContain(
      "deploy_target functions:apiStore || exit $?",
    );
    expect(ciWorkflow).toContain(
      'deploy_target "functions:app,functions:api,functions:apiAi,functions:apiStripe" || exit $?',
    );
  });

  it("pins the Firebase CLI used for production deploys", () => {
    // The verify job has always pinned it. An unpinned global install in the
    // deploy job let a new firebase-tools major reach production with no
    // change to this repository.
    expect(ciWorkflow.match(/npm install -g firebase-tools@15\.29\.0/g)).toHaveLength(2);
    expect(ciWorkflow).not.toMatch(/npm install -g firebase-tools\s*$/m);
  });

  it("serializes production Firebase deploys so hosting rewrites cannot race", () => {
    expect(ciWorkflow).toContain("group: firebase-production-${{ github.ref }}");
    expect(ciWorkflow).toContain("cancel-in-progress: false");
  });

  it("checks live store bindings before publishing hosting", () => {
    const checkIndex = ciWorkflow.indexOf("node scripts/verify-store-bindings.cjs");
    expect(checkIndex).toBeGreaterThan(ciWorkflow.indexOf("deploy_target functions:apiStore || exit $?"));
    expect(checkIndex).toBeLessThan(ciWorkflow.indexOf("firebase deploy --only hosting --project yardup-2026"));
  });

  it("replays Firebase raw request bodies before handing API POSTs to Next", () => {
    expect(functionsSource).toContain("requestForNext(req)");
    expect(requestReplaySource).toContain("Buffer.isBuffer(req.rawBody)");
    expect(requestReplaySource).toContain("Readable.from([body]");
    expect(requestReplaySource).toContain("JSON.stringify(req.body)");
    expect(requestReplaySource).not.toContain("getOwnPropertySymbols(req)");
  });
});
