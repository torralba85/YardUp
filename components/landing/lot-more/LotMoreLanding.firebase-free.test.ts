import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/` renders outside the `(firebase)` route group, so nothing it pulls in may
 * reach `useAuth` during render or prerender. `app/(firebase)/layout.tsx` states
 * the rule: anything calling `useAuth`, or rendering a component that does,
 * belongs inside that group.
 *
 * A component test cannot catch a violation, because it mocks
 * `@/lib/auth-context` wholesale and so never exercises the provider lookup.
 * The breakage surfaces only when Next prerenders `/`:
 *
 *     Error occurred prerendering page "/"
 *     Error: useAuth must be used within an AuthProvider
 *
 * These are static-import assertions, which keeps the invariant cheap enough to
 * live in the unit suite instead of waiting for a full production build.
 */

const LANDING_DIR = __dirname;
const GATE_PATH = path.join(LANDING_DIR, "..", "LandingAuthGate.tsx");
const MEMBER_NAV_PATH = path.join(LANDING_DIR, "..", "LandingMemberNav.tsx");

function readLanding(): string {
  return readFileSync(path.join(LANDING_DIR, "LotMoreLanding.tsx"), "utf8");
}

/** Modules that transitively load the Firebase client SDK at import time. */
const FIREBASE_BOUND_IMPORTS = [
  "@/lib/auth-context",
  "@/components/auth/AuthModal",
];

describe("landing stays outside the Firebase route group", () => {
  it("does not statically import any Firebase-bound module", () => {
    const source = readLanding();

    for (const specifier of FIREBASE_BOUND_IMPORTS) {
      expect(
        source,
        `LotMoreLanding must not statically import ${specifier}: it renders from app/page.tsx, which has no AuthProvider above it. Load it through next/dynamic with ssr:false instead.`,
      ).not.toMatch(new RegExp(`^import[^;]*from\s+["']${specifier}["']`, "m"));
    }
  });

  it("reaches the sign-in gate through a dynamic, non-SSR boundary", () => {
    const source = readLanding();

    expect(source).toMatch(/dynamic\(\(\) => import\("\.\.\/LandingAuthGate"\)/);
    expect(source).toMatch(/ssr:\s*false/);
  });

  it("keeps the provider inside the islands, not the landing", () => {
    // The two islands are the only landing-side modules allowed to mount
    // AuthProvider, because neither is part of the prerendered tree. Match the
    // JSX element rather than the bare word, so prose mentioning it stays
    // allowed.
    expect(readFileSync(GATE_PATH, "utf8")).toMatch(/<AuthProvider>/);
    expect(readFileSync(MEMBER_NAV_PATH, "utf8")).toMatch(/<AuthProvider>/);
    expect(readLanding()).not.toMatch(/<AuthProvider[\s>]/);
  });

  /**
   * Prerender safety is not the whole boundary. An island that renders on every
   * visit costs the same Firebase download the route group split avoids, just
   * one tick later. The member navigation therefore has to stay behind the
   * Firebase-free session hint, which resolves without loading any SDK.
   */
  it("mounts the member navigation only behind the session hint", () => {
    const source = readLanding();

    expect(source).toMatch(/dynamic\(\(\) => import\("\.\.\/LandingMemberNav"\)/);
    expect(
      source,
      "LandingMemberNav must render behind hasMemberSessionHint, or every signed-out landing visit downloads the Firebase SDK.",
    ).toMatch(/hasMemberSession\s*\?\s*\(?\s*<LandingMemberNav \/>/);
    expect(source).toMatch(/hasMemberSessionHint/);
  });
});
