import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface FirebaseHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

interface FirebaseConfig {
  hosting: {
    public: string;
    ignore: string[];
    headers: FirebaseHeaderRule[];
  };
}

const firebaseConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "firebase.json"), "utf8"),
) as FirebaseConfig;

const prepareScript = readFileSync(
  resolve(process.cwd(), "scripts/prepare-firebase.js"),
  "utf8",
);

// Regression cover for a defect that was silent in production: hashed chunks
// were written only to dist/.next/static, which firebase.json excludes from the
// Hosting upload, so every /_next/static/* request fell through the ** rewrite
// to the app Cloud Function. That cost brotli compression, produced a
// Vary: cookie that fragmented the CDN cache per signed-in user, and billed a
// function invocation per asset miss.
describe("Firebase Hosting static asset delivery", () => {
  it("copies hashed chunks to the URL path browsers actually request", () => {
    // Hosting serves a matching static file before it applies a rewrite, so
    // this copy is what keeps /_next/static/* on the CDN.
    expect(prepareScript).toContain('path.resolve(DIST, "_next")');
    expect(prepareScript).toContain(
      'copyDir(STATIC, path.resolve(distUnderscoreNext, "static"))',
    );
  });

  it("keeps the standalone server copy too", () => {
    // dist/server.js resolves its own assets from dist/.next/static, so the
    // second copy is not interchangeable with the first.
    expect(prepareScript).toContain('path.resolve(DIST, ".next")');
    expect(prepareScript).toContain(
      'copyDir(STATIC, path.resolve(distNext, "static"))',
    );
  });

  it("excludes the standalone copy from Hosting but not the browser path", () => {
    const { ignore } = firebaseConfig.hosting;

    // Intentional: dist/.next is the standalone server's private copy.
    expect(ignore).toContain(".next/**");

    // Excluding _next would put every chunk back on the Cloud Function.
    expect(ignore.some((pattern) => pattern.includes("_next"))).toBe(false);
  });

  it("gives hashed chunks the immutable cache header", () => {
    const { headers } = firebaseConfig.hosting;
    const generalAssetIndex = headers.findIndex((rule) =>
      rule.source.includes("@(js|css"),
    );
    const hashedChunkIndex = headers.findIndex(
      (rule) => rule.source === "/_next/static/**",
    );

    expect(generalAssetIndex).toBeGreaterThanOrEqual(0);
    expect(hashedChunkIndex).toBeGreaterThanOrEqual(0);

    // Hosting lets a later matching entry override an earlier one for the same
    // header key. /sw.js already depends on that, and it is verifiable in
    // production: /sw.js matches the general js rule yet serves no-cache. The
    // immutable rule must therefore stay after the general js/css rule, or
    // hashed chunks silently drop to the general max-age of one day.
    expect(hashedChunkIndex).toBeGreaterThan(generalAssetIndex);

    const cacheControl = headers[hashedChunkIndex].headers.find(
      (header) => header.key === "Cache-Control",
    );
    expect(cacheControl?.value).toBe("public, max-age=31536000, immutable");
  });
});
