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

const NOCTURNE_DIR = __dirname;

function readSource(file: string): string {
  return readFileSync(path.join(NOCTURNE_DIR, file), "utf8");
}

/** Modules that transitively load the Firebase client SDK at import time. */
const FIREBASE_BOUND_IMPORTS = [
  "@/lib/auth-context",
  "@/components/auth/AuthModal",
];

describe("landing hero stays outside the Firebase route group", () => {
  it("does not statically import any Firebase-bound module", () => {
    const source = readSource("BlueHourHero.tsx");

    for (const specifier of FIREBASE_BOUND_IMPORTS) {
      expect(
        source,
        `BlueHourHero must not statically import ${specifier}: it renders from app/page.tsx, which has no AuthProvider above it. Load it through next/dynamic with ssr:false instead.`,
      ).not.toMatch(new RegExp(`^import[^;]*from\\s+["']${specifier}["']`, "m"));
    }
  });

  it("reaches the sign-in gate through a dynamic, non-SSR boundary", () => {
    const source = readSource("BlueHourHero.tsx");

    expect(source).toMatch(/dynamic\(\(\) => import\("\.\/LandingAuthGate"\)/);
    expect(source).toMatch(/ssr:\s*false/);
  });

  it("keeps the provider inside the gate, not the hero", () => {
    const gate = readSource("LandingAuthGate.tsx");

    // The gate is the only landing-side module allowed to mount AuthProvider,
    // because it is never part of the prerendered tree. Match the JSX element
    // rather than the bare word, so prose mentioning it stays allowed.
    expect(gate).toMatch(/<AuthProvider>/);
    expect(readSource("BlueHourHero.tsx")).not.toMatch(/<AuthProvider[\s>]/);
  });
});
