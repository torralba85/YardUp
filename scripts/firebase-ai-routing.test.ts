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

  it("routes AI API traffic to the long-timeout AI function and deploys the OpenAI env var", () => {
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
    expect(ciWorkflow).toContain('OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}"');
  });

  it("serializes production Firebase deploys so hosting rewrites cannot race", () => {
    expect(ciWorkflow).toContain("group: firebase-production-${{ github.ref }}");
    expect(ciWorkflow).toContain("cancel-in-progress: false");
  });

  it("replays Firebase raw request bodies before handing API POSTs to Next", () => {
    expect(functionsSource).toContain("requestForNext(req)");
    expect(requestReplaySource).toContain("Buffer.isBuffer(req.rawBody)");
    expect(requestReplaySource).toContain("replay.end(body)");
    expect(requestReplaySource).toContain("JSON.stringify(req.body)");
    expect(requestReplaySource).not.toContain("getOwnPropertySymbols(req)");
  });
});
