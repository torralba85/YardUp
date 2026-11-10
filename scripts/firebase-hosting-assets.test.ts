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

  it("includes avif, mp4, and ico in the 24-hour static asset cache rule", () => {
    const { headers } = firebaseConfig.hosting;
    const generalAssetRule = headers.find((rule) =>
      rule.source.includes("@(js|css"),
    );

    expect(generalAssetRule).toBeDefined();
    for (const ext of ["avif", "mp4", "ico"]) {
      expect(generalAssetRule!.source).toContain(ext);
    }
    const cacheControl = generalAssetRule!.headers.find(
      (header) => header.key === "Cache-Control",
    );
    expect(cacheControl?.value).toBe("public, max-age=86400");
  });

  it("excludes Remotion-only kickstarter assets and public/README.md from Hosting", () => {
    const { ignore } = firebaseConfig.hosting;

    expect(ignore).toContain("README.md");
    expect(ignore).toContain("kickstarter/**");
    expect(ignore).toContain("kickstarter-assets/**");

    for (const entry of ["README.md", "kickstarter", "kickstarter-assets"]) {
      expect(prepareScript).toContain(`"${entry}"`);
    }
  });

  it("sets baseline security headers on static Hosting responses while preserving sample-certificate framing", () => {
    const { headers } = firebaseConfig.hosting;
    const rootIndex = headers.findIndex((rule) => rule.source === "**");
    const sampleIndex = headers.findIndex(
      (rule) => rule.source === "/sample-certificate/**",
    );

    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(sampleIndex).toBeGreaterThan(rootIndex);

    const rootMap = Object.fromEntries(
      headers[rootIndex].headers.map((h) => [h.key, h.value]),
    );
    expect(rootMap["X-Content-Type-Options"]).toBe("nosniff");
    expect(rootMap["X-Frame-Options"]).toBe("DENY");
    expect(rootMap["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");

    const sampleMap = Object.fromEntries(
      headers[sampleIndex].headers.map((h) => [h.key, h.value]),
    );
    expect(sampleMap["X-Frame-Options"]).toBe("SAMEORIGIN");
  });
});
