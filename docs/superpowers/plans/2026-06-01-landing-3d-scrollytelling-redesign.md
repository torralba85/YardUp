> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Landing 3D Scrollytelling Reinvention — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat LotFoundry landing page with a pinned 3D scrollytelling hero (bare lot → ADU rises → numbers → report) that degrades to a 2D animated story on mobile and a static frame for reduced-motion.

**Architecture:** A single `scrollProgress` value (0→1, from motion's `useScroll`) is the one source of truth — it drives both the r3f scene state and the synced text reveals. The 3D hero is a client-only component dynamically imported with `ssr: false`. A capability hook picks 3D vs 2D vs static. The 3D scene reuses the proven patterns already in `components/ParcelScene.tsx` (WebGL probe, error boundary, gable-roof geometry, brand-matched scene palette).

**Tech Stack:** Next 16 (App Router, Turbopack), React 19, `motion` 12 (`useScroll`/`useTransform`), `@react-three/fiber` 9.6.1, `@react-three/drei` 10.7.7, `three` 0.164.1, Tailwind v4 (`--color-lf-*` tokens in `app/globals.css`), Vitest + jsdom, Playwright (visual snapshots).

**Spec:** `docs/superpowers/specs/2026-06-01-landing-3d-scrollytelling-redesign-design.md`

**Verification note:** The preview MCP is flaky on this Windows/Next 16 box. A Next dev server is already running on `http://localhost:3000`; verify visuals with the connected **chrome-devtools** MCP (`navigate_page` → `take_screenshot`) against that URL. Pixel/3D work is verified by screenshot; pure logic (stage math, capability decision, number formatting) gets real Vitest unit tests.

---

## File Structure

**Create:**
- `lib/landing-stages.ts` — pure stage math: thresholds, `stageFromProgress`, `localStageProgress`, `lerp`, `clamp01`, `formatHeroNumber`. (Unit-tested.)
- `lib/landing-stages.test.ts`
- `lib/webgl.ts` — `isWebGLAvailable()` probe extracted as a reusable util. (Unit-tested for the no-DOM/no-WebGL branch.)
- `lib/webgl.test.ts`
- `lib/use-hero-capability.ts` — `decideHeroMode(env)` pure fn + `useHeroCapability()` hook → `"3d" | "2d" | "static"`. (Pure fn unit-tested.)
- `lib/use-hero-capability.test.ts`
- `components/landing/HeroSceneContent.tsx` — r3f scene graph; pure function of `progress`.
- `components/landing/LotAduScene.tsx` — `<Canvas>` wrapper + error boundary + clamped drag-orbit; renders `HeroSceneContent`.
- `components/landing/StageCaptions.tsx` — the 4 synced caption blocks + floating snapshot numbers, opacity driven by `progress`.
- `components/landing/HeroScrolly.tsx` — sticky/pinned section; owns `scrollProgress`; composes `LotAduScene` + `StageCaptions`.
- `components/landing/HeroStory2D.tsx` — mobile / reduced-motion fallback (2D animated, not pinned).
- `components/landing/AmbientBackdrop.tsx` — warm radial gradient + subtle grain.
- `components/landing/FeatureBand.tsx` — redesigned feature band + closing CTA.
- `components/landing/LandingHero.tsx` — capability switch; dynamic `ssr:false` import of `HeroScrolly`.
- `app/hero-preview/page.tsx` — **temporary** scratch route for the Task 3 sign-off screenshot; deleted in Task 8.

**Modify:**
- `app/globals.css` — add hero keyframes/utilities (grain, draw, count-up safe fallbacks).
- `app/page.tsx` — compose `AmbientBackdrop` + header + `LandingHero` + `FeatureBand` + footer.

**Leave untouched:** `components/ParcelScene.tsx` and everything under `/studio`, `/builder`, auth, and data layers. We model on ParcelScene's patterns but do not refactor it.

---

## Task 1: Pure stage math

**Files:**
- Create: `lib/landing-stages.ts`
- Test: `lib/landing-stages.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/landing-stages.test.ts
import { describe, expect, it } from "vitest";
import {
  clamp01,
  lerp,
  stageFromProgress,
  localStageProgress,
  formatHeroNumber,
  HERO_STAGES,
} from "./landing-stages";

describe("clamp01", () => {
  it("clamps below 0 and above 1", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});

describe("lerp", () => {
  it("interpolates endpoints and midpoint", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("stageFromProgress", () => {
  it("maps progress to the four stages", () => {
    expect(stageFromProgress(0)).toBe("lot");
    expect(stageFromProgress(0.1)).toBe("lot");
    expect(stageFromProgress(0.3)).toBe("rise");
    expect(stageFromProgress(0.6)).toBe("numbers");
    expect(stageFromProgress(0.9)).toBe("report");
    expect(stageFromProgress(1)).toBe("report");
  });
});

describe("localStageProgress", () => {
  it("returns 0..1 within a stage's own band", () => {
    // 'rise' spans [0.25, 0.5); halfway through global => local 0.5
    expect(localStageProgress(0.375, "rise")).toBeCloseTo(0.5, 5);
    expect(localStageProgress(0.25, "rise")).toBeCloseTo(0, 5);
    expect(localStageProgress(0.5, "rise")).toBeCloseTo(1, 5);
  });
  it("clamps outside the band", () => {
    expect(localStageProgress(0.1, "rise")).toBe(0);
    expect(localStageProgress(0.9, "rise")).toBe(1);
  });
});

describe("formatHeroNumber", () => {
  it("counts a currency value up by ratio with tabular formatting", () => {
    expect(formatHeroNumber(2350, 0, "currency")).toBe("$0");
    expect(formatHeroNumber(2350, 1, "currency")).toBe("$2,350");
    expect(formatHeroNumber(2350, 0.5, "currency")).toBe("$1,175");
  });
  it("formats plain numbers and suffixes", () => {
    expect(formatHeroNumber(9.8, 1, "years")).toBe("9.8 yrs");
    expect(formatHeroNumber(31, 1, "percent")).toBe("31%");
  });
});

describe("HERO_STAGES", () => {
  it("is contiguous and covers [0,1]", () => {
    expect(HERO_STAGES[0].start).toBe(0);
    expect(HERO_STAGES[HERO_STAGES.length - 1].end).toBe(1);
    for (let i = 1; i < HERO_STAGES.length; i++) {
      expect(HERO_STAGES[i].start).toBeCloseTo(HERO_STAGES[i - 1].end, 5);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/landing-stages.test.ts`
Expected: FAIL — `Cannot find module './landing-stages'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/landing-stages.ts
export type HeroStageId = "lot" | "rise" | "numbers" | "report";

export interface HeroStage {
  id: HeroStageId;
  start: number;
  end: number;
}

/** Contiguous stage bands across the 0..1 scroll progress. */
export const HERO_STAGES: readonly HeroStage[] = [
  { id: "lot", start: 0, end: 0.25 },
  { id: "rise", start: 0.25, end: 0.5 },
  { id: "numbers", start: 0.5, end: 0.75 },
  { id: "report", start: 0.75, end: 1 },
];

export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function stageFromProgress(progress: number): HeroStageId {
  const p = clamp01(progress);
  for (const stage of HERO_STAGES) {
    if (p < stage.end) return stage.id;
  }
  return HERO_STAGES[HERO_STAGES.length - 1].id;
}

/** Progress (0..1) within a single stage's own band, clamped outside it. */
export function localStageProgress(progress: number, id: HeroStageId): number {
  const stage = HERO_STAGES.find((s) => s.id === id);
  if (!stage) return 0;
  const span = stage.end - stage.start;
  if (span <= 0) return 0;
  return clamp01((clamp01(progress) - stage.start) / span);
}

export type HeroNumberKind = "currency" | "years" | "percent" | "plain";

/** Count `target` up by `ratio` (0..1) and format for the snapshot. */
export function formatHeroNumber(
  target: number,
  ratio: number,
  kind: HeroNumberKind,
): string {
  const value = target * clamp01(ratio);
  switch (kind) {
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "years":
      return `${value.toFixed(1)} yrs`;
    case "percent":
      return `${Math.round(value)}%`;
    default:
      return `${Math.round(value).toLocaleString("en-US")}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/landing-stages.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/landing-stages.ts lib/landing-stages.test.ts
git commit -m "feat(landing): pure scroll-stage math for 3D hero"
```

---

## Task 2: WebGL probe util + capability decision

Models on the WebGL probe already in `components/ParcelScene.tsx:614-634`. We extract a standalone util (new file, no risk to the studio) and a pure decision function.

**Files:**
- Create: `lib/webgl.ts`, `lib/use-hero-capability.ts`
- Test: `lib/webgl.test.ts`, `lib/use-hero-capability.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/webgl.test.ts
import { describe, expect, it, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

describe("isWebGLAvailable", () => {
  it("returns false when canvas has no webgl context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
    vi.restoreAllMocks();
  });
});
```

```ts
// lib/use-hero-capability.test.ts
import { describe, expect, it } from "vitest";
import { decideHeroMode } from "./use-hero-capability";

describe("decideHeroMode", () => {
  it("returns static when reduced motion is preferred", () => {
    expect(
      decideHeroMode({ reducedMotion: true, webgl: true, finePointer: true, wide: true }),
    ).toBe("static");
  });
  it("returns 2d on coarse pointer / narrow viewport even with webgl", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: false, wide: true }),
    ).toBe("2d");
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: true, wide: false }),
    ).toBe("2d");
  });
  it("returns 2d when webgl is unavailable", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: false, finePointer: true, wide: true }),
    ).toBe("2d");
  });
  it("returns 3d only when everything passes", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: true, wide: true }),
    ).toBe("3d");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/webgl.test.ts lib/use-hero-capability.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementations**

```ts
// lib/webgl.ts
/**
 * Probe for a usable WebGL context, releasing it immediately. Browsers cap
 * concurrent WebGL contexts (~16); leaking a probe can evict a live scene's
 * context. Mirrors the inline probe in components/ParcelScene.tsx.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const ctx = (probe.getContext("webgl") ||
      probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    const ok = !!(window.WebGLRenderingContext && ctx);
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
```

```ts
// lib/use-hero-capability.ts
"use client";

import { useEffect, useState } from "react";
import { isWebGLAvailable } from "./webgl";

export type HeroMode = "3d" | "2d" | "static";

export interface HeroEnv {
  reducedMotion: boolean;
  webgl: boolean;
  finePointer: boolean;
  wide: boolean;
}

/** Pure decision: which hero variant to render for a given environment. */
export function decideHeroMode(env: HeroEnv): HeroMode {
  if (env.reducedMotion) return "static";
  if (!env.webgl || !env.finePointer || !env.wide) return "2d";
  return "3d";
}

const MIN_3D_WIDTH = 1024;

/**
 * Resolves the hero mode on the client. Returns "static" during SSR/first
 * paint so the server markup is the safe, fully-legible frame; upgrades after
 * mount once capabilities are known.
 */
export function useHeroCapability(): HeroMode {
  const [mode, setMode] = useState<HeroMode>("static");

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const wide = window.innerWidth >= MIN_3D_WIDTH;
    setMode(
      decideHeroMode({
        reducedMotion,
        webgl: isWebGLAvailable(),
        finePointer,
        wide,
      }),
    );
  }, []);

  return mode;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/webgl.test.ts lib/use-hero-capability.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/webgl.ts lib/webgl.test.ts lib/use-hero-capability.ts lib/use-hero-capability.test.ts
git commit -m "feat(landing): webgl probe util and hero capability decision"
```

---

## Task 3: 3D scene (standalone) — **USER SIGN-OFF CHECKPOINT**

Build the procedural lot→ADU scene as a pure function of `progress`, plus a `<Canvas>` wrapper modeled on `components/ParcelScene.tsx` (error boundary at `:11-29`, gable roof at `:157-230`, lighting at `:705-716`). Render it on a temporary `/hero-preview` route at a fixed progress so we can screenshot and get sign-off **before** building scroll logic on top.

**Files:**
- Create: `components/landing/HeroSceneContent.tsx`, `components/landing/LotAduScene.tsx`, `app/hero-preview/page.tsx`

- [ ] **Step 1: Write the scene content (pure function of `progress`)**

```tsx
// components/landing/HeroSceneContent.tsx
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { localStageProgress, clamp01 } from "@/lib/landing-stages";

// Warm, brand-aligned scene palette (subset of ParcelScene's SCENE).
const C = {
  ground: "#cdb89a",
  groundRim: "#bda584",
  outline: "#8C5B3F", // clay parcel outline
  setback: "#a98a63",
  wall: "#e7dccb",
  roof: "#592A0F", // mahogany
  window: "#2F4A38", // forest, soft-emissive
  pad: "#c9bca6",
};

/** Simple gable roof sized to the ADU body. Adapted from ParcelScene GableRoof. */
function GableRoof({ w, d, wallH, ridge }: { w: number; d: number; wallH: number; ridge: number }) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: C.roof, roughness: 0.7, side: THREE.DoubleSide }),
    [],
  );
  const overhang = 0.3;
  const ew = w / 2 + overhang;
  const ez = d / 2 + overhang;
  const ry = wallH + ridge;
  const front = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([-ew, wallH, ez, ew, wallH, ez, ew, ry, 0, -ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  const rear = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([ew, wallH, -ez, -ew, wallH, -ez, -ew, ry, 0, ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  const gable = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([ew, wallH, -ez, ew, wallH, ez, ew, ry, 0, -ew, wallH, ez, -ew, wallH, -ez, -ew, ry, 0]), 3));
    g.setIndex([0, 1, 2, 3, 4, 5]); g.computeVertexNormals(); return g;
  }, [ew, ez, wallH, ry]);
  return (
    <group>
      <mesh geometry={front} material={mat} castShadow />
      <mesh geometry={rear} material={mat} castShadow />
      <mesh geometry={gable} material={mat} castShadow />
    </group>
  );
}

/**
 * The lot + ADU. Everything animates from `progress` (0..1):
 *  - 'rise' stage scales the ADU up out of the ground and drops the roof in.
 *  - 'numbers'/'report' stages light the windows.
 */
export function HeroSceneContent({ progress }: { progress: number }) {
  const rise = localStageProgress(progress, "rise");
  const lit = clamp01((progress - 0.5) / 0.15); // windows glow as numbers appear

  const bodyW = 18;
  const bodyD = 12;
  const bodyH = 8;
  const built = Math.max(rise, 0.001);

  const winMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: C.window, roughness: 0.25, metalness: 0.2,
      emissive: new THREE.Color(C.window),
    }),
    [],
  );
  winMat.emissiveIntensity = lit * 0.9;

  return (
    <group>
      {/* Lot plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 64]} />
        <meshStandardMaterial color={C.ground} roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[120, 100]} />
        <meshStandardMaterial color={C.groundRim} roughness={0.98} />
      </mesh>

      {/* Parcel outline */}
      <lineSegments position={[0, 0.05, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(80, 64)]} />
        <lineBasicMaterial color={C.outline} />
      </lineSegments>
      {/* Setback envelope */}
      <lineSegments position={[0, 0.06, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(64, 48)]} />
        <lineBasicMaterial color={C.setback} transparent opacity={0.7} />
      </lineSegments>

      {/* Concrete pad (appears with the build) */}
      <mesh position={[6, 0.1 * built, -4]} scale={[1, built, 1]} receiveShadow>
        <boxGeometry args={[bodyW + 3, 0.4, bodyD + 3]} />
        <meshStandardMaterial color={C.pad} roughness={0.92} />
      </mesh>

      {/* ADU — scales up out of the ground during 'rise' */}
      <group position={[6, 0, -4]} scale={[1, built, 1]}>
        <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW, bodyH, bodyD]} />
          <meshStandardMaterial color={C.wall} roughness={0.82} />
        </mesh>
        <GableRoof w={bodyW} d={bodyD} wallH={bodyH} ridge={4} />
        {/* Front windows */}
        <mesh position={[-4, bodyH * 0.45, bodyD / 2 + 0.05]} material={winMat}>
          <boxGeometry args={[4, 3.4, 0.3]} />
        </mesh>
        <mesh position={[4, bodyH * 0.4, bodyD / 2 + 0.05]} material={winMat}>
          <boxGeometry args={[3, 4.4, 0.3]} />
        </mesh>
      </group>

      {/* Lighting — warm key + hemisphere fill + soft contact shadow */}
      <hemisphereLight args={[0xffffff, 0x46351f, 1.1]} />
      <directionalLight
        castShadow
        position={[30, 48, 24]}
        intensity={2.6}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
    </group>
  );
}
```

- [ ] **Step 2: Write the Canvas wrapper (error boundary + clamped orbit, demand frameloop)**

```tsx
// components/landing/LotAduScene.tsx
"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { lerp } from "@/lib/landing-stages";
import { HeroSceneContent } from "./HeroSceneContent";

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function LotAduScene({
  progress,
  fallback = null,
}: {
  progress: number;
  fallback?: ReactNode;
}) {
  // Slow cinematic orbit derived from progress: ~38°→~18° azimuth as it builds.
  const azimuth = lerp(0.66, 0.32, progress);
  const camX = Math.sin(azimuth) * 70;
  const camZ = Math.cos(azimuth) * 70;

  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [camX, 44, camZ], fov: 38, near: 1, far: 400 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        key={Math.round(progress * 240)} /* re-render on progress change under demand loop */
      >
        <HeroSceneContent progress={progress} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </SceneBoundary>
  );
}
```

> Note on `frameloop="demand"`: changing the `key` forces a fresh render each time `progress` moves meaningfully (≈1/240 granularity). In Task 4 the scrolly host passes a continuously-updating `progress`, so this keeps the scene in sync without a free-running loop. Drag-orbit damping still animates because OrbitControls calls `invalidate` on interaction.

- [ ] **Step 3: Add the temporary preview route**

```tsx
// app/hero-preview/page.tsx
"use client";

import { useState } from "react";
import { LotAduScene } from "@/components/landing/LotAduScene";

export default function HeroPreview() {
  const [p, setP] = useState(0.6);
  return (
    <div className="min-h-screen bg-lf-sand p-6">
      <div className="mx-auto h-[70vh] max-w-5xl overflow-hidden rounded-2xl border border-lf-hairline">
        <LotAduScene progress={p} />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={p}
        onChange={(e) => setP(Number(e.target.value))}
        className="mx-auto mt-6 block w-full max-w-5xl"
        aria-label="Hero progress"
      />
      <p className="mt-2 text-center font-mono text-xs text-lf-muted">progress {p.toFixed(2)}</p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + lint the new files**

Run: `npx tsc --noEmit && npx eslint components/landing app/hero-preview --max-warnings=0`
Expected: no errors.

- [ ] **Step 5: Screenshot the scene at three progress values for sign-off**

The dev server is already running on `http://localhost:3000`. Using the chrome-devtools MCP:
1. `navigate_page` → `http://localhost:3000/hero-preview`
2. `take_screenshot` (full page) — note the default `progress 0.60` (ADU built, windows lit).
3. Drag the range to ~0.10 (bare lot) and ~0.40 (mid-build); screenshot each (use `fill`/`evaluate_script` to set the slider, then screenshot).

Expected: a warm, brand-matched lot; ADU absent at low progress, fully built with glowing windows at high progress; no console errors.

- [ ] **Step 6: Commit, then STOP for user sign-off**

```bash
git add components/landing/HeroSceneContent.tsx components/landing/LotAduScene.tsx app/hero-preview/page.tsx
git commit -m "feat(landing): procedural lot->ADU 3D scene + preview route"
```

**HALT.** Present the three screenshots to the user. Do not proceed to Task 4 until they approve the scene's look (silhouette, palette, lighting). Iterate on `HeroSceneContent.tsx` if requested, re-screenshot, re-commit.

---

## Task 4: Scroll pinning + synced captions

Pin the scene over a tall section; map scroll to `progress`; drive both scene and captions from it.

**Files:**
- Create: `components/landing/StageCaptions.tsx`, `components/landing/HeroScrolly.tsx`

- [ ] **Step 1: Write the caption overlay**

```tsx
// components/landing/StageCaptions.tsx
"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatHeroNumber } from "@/lib/landing-stages";

function bandOpacity(progress: MotionValue<number>, start: number, end: number) {
  const f = 0.06; // fade width
  return useTransform(
    progress,
    [start - f, start, end - f, end],
    [0, 1, 1, 0],
  );
}

export function StageCaptions({ progress }: { progress: MotionValue<number> }) {
  const lotO = bandOpacity(progress, 0.0, 0.25);
  const riseO = bandOpacity(progress, 0.25, 0.5);
  const numbersO = bandOpacity(progress, 0.5, 0.78);
  const reportO = bandOpacity(progress, 0.75, 1.0);

  const rentRatio = useTransform(progress, [0.5, 0.62], [0, 1]);
  const [rent, setRent] = useStateFromMotion(rentRatio, (r) => formatHeroNumber(2350, r, "currency"));

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-xl flex-col justify-center px-6">
      <motion.div style={{ opacity: lotO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Start with a lot</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Every lot holds an answer.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">Begin with the land you already own.</p>
      </motion.div>

      <motion.div style={{ opacity: riseO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Cast an ADU</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Watch the concept rise.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">A site-fit ADU, placed inside your setbacks.</p>
      </motion.div>

      <motion.div style={{ opacity: numbersO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-6xl font-black tabular-nums text-lf-espresso md:text-7xl">
          {rent}
        </div>
        <p className="mt-2 text-lg text-lf-muted">estimated monthly rent — NOI $20.6k · payback 9.8 yrs</p>
      </motion.div>

      <motion.div style={{ opacity: reportO }} className="pointer-events-auto absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Owner report ready</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          See what your lot could earn.
        </h2>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </motion.div>
    </div>
  );
}

// Subscribes to a MotionValue and maps it to derived display state.
import { useEffect, useState } from "react";
function useStateFromMotion<T>(mv: MotionValue<number>, map: (n: number) => T) {
  const [val, setVal] = useState<T>(() => map(mv.get()));
  useEffect(() => mv.on("change", (n) => setVal(map(n))), [mv, map]);
  return [val, setVal] as const;
}
```

- [ ] **Step 2: Write the pinned scrolly host**

```tsx
// components/landing/HeroScrolly.tsx
"use client";

import { useRef } from "react";
import { useScroll, useTransform } from "motion/react";
import { LotAduScene } from "./LotAduScene";
import { StageCaptions } from "./StageCaptions";
import { HeroStaticFrame } from "./HeroStory2D";
import { useStateFromMotionNumber } from "./use-motion-number";

export default function HeroScrolly() {
  const ref = useRef<HTMLDivElement>(null);
  // 0 when the section top hits the viewport top, 1 when its bottom does.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Ease the raw scroll a touch for a calmer build.
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const sceneProgress = useStateFromMotionNumber(progress);

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 grid h-screen grid-cols-1 lg:grid-cols-2">
        <StageCaptions progress={progress} />
        <div className="relative h-full">
          <LotAduScene
            progress={sceneProgress}
            fallback={<HeroStaticFrame />}
          />
        </div>
      </div>
    </section>
  );
}
```

```tsx
// components/landing/use-motion-number.ts
"use client";

import { useEffect, useState } from "react";
import type { MotionValue } from "motion/react";

/** Mirror a numeric MotionValue into React state (for non-motion consumers like r3f). */
export function useStateFromMotionNumber(mv: MotionValue<number>): number {
  const [n, setN] = useState(() => mv.get());
  useEffect(() => mv.on("change", setN), [mv]);
  return n;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/landing --max-warnings=0`
Expected: no errors. (If `HeroStory2D`/`HeroStaticFrame` don't exist yet, temporarily stub `fallback={null}` and remove the import; Task 6 supplies them. Prefer doing Task 6 before this step if running strictly in order — see ordering note below.)

> **Ordering note:** `HeroScrolly` imports `HeroStaticFrame` from Task 6. If executing strictly top-to-bottom, either (a) do Task 6 first, or (b) stub `fallback={null}` here and wire the real fallback in Task 6 Step 4. The plan keeps Task 6 separate for review clarity; (a) is recommended.

- [ ] **Step 4: Wire the preview route to the scrolly host and screenshot the scroll**

Temporarily change `app/hero-preview/page.tsx` to render `<HeroScrolly />` instead of the slider. Then via chrome-devtools: navigate to `/hero-preview`, and at several `window.scrollTo(0, y)` positions (`evaluate_script`) take screenshots to confirm the scene advances and captions cross-fade in sync.

Expected: bare lot at top → ADU rising mid-scroll → numbers counting → report + CTA near the end, scene pinned throughout. Revert the preview route after.

- [ ] **Step 5: Commit**

```bash
git add components/landing/StageCaptions.tsx components/landing/HeroScrolly.tsx components/landing/use-motion-number.ts
git commit -m "feat(landing): scroll-pinned hero with synced stage captions"
```

---

## Task 5: Ambient backdrop, feature band, closing CTA

**Files:**
- Create: `components/landing/AmbientBackdrop.tsx`, `components/landing/FeatureBand.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add the grain/utility CSS**

Append to `app/globals.css`:

```css
/* Hero ambient backdrop — warm radial wash + faint grain. */
.lf-backdrop {
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(140, 91, 63, 0.10), transparent 60%),
    radial-gradient(90% 60% at 85% 10%, rgba(47, 74, 56, 0.06), transparent 55%),
    var(--color-lf-sand);
}
.lf-grain::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@media (prefers-reduced-motion: no-preference) {
  @keyframes lf-reveal-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lf-reveal {
    animation: lf-reveal-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}
```

- [ ] **Step 2: Write the backdrop wrapper**

```tsx
// components/landing/AmbientBackdrop.tsx
export function AmbientBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="lf-backdrop lf-grain relative min-h-screen text-lf-espresso">
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write the feature band + closing CTA**

```tsx
// components/landing/FeatureBand.tsx
import { Box, FileText, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const ITEMS = [
  { icon: Box, title: "Saved concepts", body: "Save ADU sizes, finishes, and rent assumptions without losing your scenario." },
  { icon: FileText, title: "Shareable owner report", body: "Export a concept summary with costs, coverage, and estimate disclaimers." },
  { icon: Users, title: "Builder-ready next step", body: "Keep the concept organized so a builder can review the same assumptions." },
];

export function FeatureBand() {
  return (
    <section className="border-t border-lf-hairline/50">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          From snapshot to shareable concept
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-lf-hairline bg-lf-card/70 p-6 backdrop-blur transition-colors hover:border-lf-clay/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lf-sand text-lf-clay">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-lf-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-lf-hairline bg-lf-card/70 p-10 text-center backdrop-blur md:p-16">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Find the ADU income potential in your lot.
          </h2>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-8 py-4 text-lg font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/landing --max-warnings=0`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/landing/AmbientBackdrop.tsx components/landing/FeatureBand.tsx app/globals.css
git commit -m "feat(landing): ambient backdrop, feature band, closing CTA"
```

---

## Task 6: Mobile / reduced-motion fallback

**Files:**
- Create: `components/landing/HeroStory2D.tsx`

- [ ] **Step 1: Write the 2D story + static frame**

Exports two components: `HeroStaticFrame` (the reduced-motion / Canvas-fallback still) and `HeroStory2D` (the mobile scroll-reveal sequence). Both are pure 2D (SVG + CSS), no r3f, no pinning.

```tsx
// components/landing/HeroStory2D.tsx
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Static, fully-legible final frame: SSR-safe and the reduced-motion default. */
export function HeroStaticFrame() {
  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center p-6">
      <svg viewBox="0 0 200 150" className="h-full w-full max-w-md" role="img" aria-label="Lot with proposed ADU and income snapshot">
        <rect x="20" y="20" width="160" height="110" fill="rgba(205,184,154,0.5)" stroke="#8C5B3F" strokeWidth="1.2" rx="2" />
        <rect x="36" y="36" width="128" height="78" fill="none" stroke="#a98a63" strokeWidth="0.8" strokeDasharray="3 2" />
        <rect x="104" y="74" width="52" height="36" fill="#e7dccb" stroke="#592A0F" strokeWidth="1" rx="1" />
        <rect x="112" y="84" width="14" height="12" fill="#2F4A38" />
        <rect x="134" y="84" width="10" height="16" fill="#2F4A38" />
        <text x="130" y="68" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#261307" className="font-sans">ADU</text>
      </svg>
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-md border border-lf-hairline bg-lf-card/90 px-4 py-3 backdrop-blur">
        <div className="font-display text-3xl font-black tabular-nums text-lf-espresso">$2,350</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">estimated monthly rent</div>
      </div>
    </div>
  );
}

const BEATS = [
  { kicker: "Start with a lot", title: "Every lot holds an answer.", body: "Begin with the land you already own." },
  { kicker: "Cast an ADU", title: "A site-fit ADU, in your setbacks.", body: "Placed and sized to the rules that apply." },
  { kicker: "See the numbers", title: "$2,350 / mo estimated rent.", body: "NOI $20.6k · payback 9.8 yrs · 31% coverage." },
];

/** Mobile sequence: a static hero frame followed by scroll-revealed beats. Not pinned. */
export function HeroStory2D() {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-lf-hairline bg-lf-card/70 backdrop-blur">
          <HeroStaticFrame />
        </div>
        <h1 className="lf-reveal mt-8 font-display text-4xl font-black leading-[1.05] tracking-tight text-lf-espresso">
          See what your lot <span className="text-lf-clay">could earn.</span>
        </h1>
        <div className="mt-8 space-y-8">
          {BEATS.map((b) => (
            <div key={b.title} className="lf-reveal border-l-2 border-lf-clay/40 pl-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">{b.kicker}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-lf-espresso">{b.title}</h2>
              <p className="mt-1 text-lf-muted">{b.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/landing --max-warnings=0`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/HeroStory2D.tsx
git commit -m "feat(landing): 2D mobile story and reduced-motion static frame"
```

---

## Task 7: Capability switch + page integration

**Files:**
- Create: `components/landing/LandingHero.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the capability switch (dynamic ssr:false for the 3D host)**

```tsx
// components/landing/LandingHero.tsx
"use client";

import dynamic from "next/dynamic";
import { useHeroCapability } from "@/lib/use-hero-capability";
import { HeroStory2D, HeroStaticFrame } from "./HeroStory2D";

const HeroScrolly = dynamic(() => import("./HeroScrolly"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center" role="status" aria-label="Loading hero">
      <HeroStaticFrame />
    </div>
  ),
});

export function LandingHero() {
  const mode = useHeroCapability();
  if (mode === "3d") return <HeroScrolly />;
  if (mode === "2d") return <HeroStory2D />;
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-lf-hairline bg-lf-card/70">
        <HeroStaticFrame />
      </div>
    </section>
  );
}
```

> `HeroScrolly` is the **default export** of its module (Task 4) — required for `next/dynamic`. The `loading` frame and the reduced-motion branch both reuse `HeroStaticFrame`, so the page never shows a blank canvas during hydration.

- [ ] **Step 2: Rewrite `app/page.tsx` to compose the new sections**

Replace the file body. Keep the existing `<header>` and `<footer>` markup (copy from the current `app/page.tsx:15-41` and `:158-180`), wrap everything in `AmbientBackdrop`, and swap the hero + features:

```tsx
// app/page.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AmbientBackdrop } from "@/components/landing/AmbientBackdrop";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureBand } from "@/components/landing/FeatureBand";

export default function LandingPage() {
  return (
    <AmbientBackdrop>
      <header className="relative z-20 border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="LotFoundry home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-taupe/10">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-lf-mahogany px-4 py-2 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-clay">
              Estimate my lot
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <LandingHero />
        <FeatureBand />
      </main>

      <footer className="relative z-20 border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto" />
            <p className="text-sm text-lf-muted">A foundry for lots. Estimates, not guarantees.</p>
            <div className="flex items-center gap-4 text-sm text-lf-muted">
              <Link href="/terms" className="transition-colors hover:text-lf-espresso">Terms</Link>
              <Link href="/privacy" className="transition-colors hover:text-lf-espresso">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </AmbientBackdrop>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app components/landing --max-warnings=0`
Expected: no errors.

- [ ] **Step 4: Verify all three modes via chrome-devtools at `localhost:3000`**

1. Desktop 3D: `navigate_page` → `http://localhost:3000/`, `resize_page` to 1440×900, scroll through and screenshot stages.
2. Mobile 2D: `resize_page` to 390×844, reload, screenshot — should show `HeroStory2D`, no pinned canvas.
3. Reduced-motion: `new_page` with `initScript` emulating reduced motion (or chrome-devtools `emulate`), reload, confirm the static frame renders.

Check `list_console_messages` for errors at each. Expected: no errors; correct variant per environment.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/landing/LandingHero.tsx
git commit -m "feat(landing): capability-switched hero wired into landing page"
```

---

## Task 8: Remove scratch route, update snapshots, final verification

**Files:**
- Delete: `app/hero-preview/page.tsx`
- Modify: Playwright snapshots under `e2e/*-snapshots/` (regenerated, not hand-edited)

- [ ] **Step 1: Delete the temporary preview route**

```bash
git rm app/hero-preview/page.tsx
```

- [ ] **Step 2: Run the unit suite**

Run: `npm test`
Expected: PASS, including the new `landing-stages`, `webgl`, and `use-hero-capability` tests.

- [ ] **Step 3: Lint the whole project**

Run: `npm run lint`
Expected: zero warnings/errors (`--max-warnings=0`).

- [ ] **Step 4: Regenerate Playwright visual baselines for the landing**

The landing snapshot (`e2e/feasibility-studio.spec.ts-snapshots/landing-page-*.png`) and the responsive breakpoints (`e2e/visual-breakpoints.spec.ts-snapshots/*`) now intentionally differ. Because the 3D hero is non-deterministic, confirm the landing visual spec either asserts the static/2D frame or is updated to mask the canvas region; then regenerate:

Run: `npx playwright test --update-snapshots e2e/feasibility-studio.spec.ts e2e/visual-breakpoints.spec.ts`
Expected: snapshots rewritten; suite passes on re-run `npx playwright test e2e/feasibility-studio.spec.ts e2e/visual-breakpoints.spec.ts`.

> If a landing visual test waits on the 3D canvas it may flake. Prefer forcing reduced-motion in that spec (Playwright `use: { reducedMotion: 'reduce' }`) so it snapshots the deterministic static frame. Adjust the spec if needed and note it in the commit.

- [ ] **Step 5: Final full-page screenshot for the user**

Via chrome-devtools at `http://localhost:3000/`: full desktop scroll-through (3–4 stage screenshots) + one mobile (390px). Share with the user.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(landing): remove preview route, refresh visual snapshots"
```

---

## Self-Review

**Spec coverage:**
- §2 four-stage narrative → Tasks 3 (scene states) + 4 (captions). ✓
- §3 architecture / one source of truth / `ssr:false` → Task 4 (`progress` MotionValue) + Task 7 (`dynamic ssr:false`). ✓
- §4 procedural brand-lit 3D → Task 3. ✓
- §5 desktop-3D / mobile-2D / reduced-motion / SSR-safe → Tasks 2 (decision), 6 (fallbacks), 7 (switch + loading frame). ✓
- §6 below-hero feature band + CTA → Task 5. ✓
- §7 build order highest-risk-first + sign-off checkpoint → Task 3 HALT. ✓
- §7 verification via chrome-devtools + Playwright → Tasks 3/4/7/8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. Number/format logic is concrete and unit-tested.

**Type consistency:** `progress: number` (r3f scene, `LotAduScene`) vs `progress: MotionValue<number>` (captions, scrolly host) — intentional and bridged by `useStateFromMotionNumber`. `HeroStage`/`HeroStageId`, `HeroMode`, `decideHeroMode`, `isWebGLAvailable`, `formatHeroNumber`, `localStageProgress` names are used identically across tasks. `HeroScrolly` is a default export (consumed by `next/dynamic`); `HeroStaticFrame`/`HeroStory2D` are named exports (consumed by `LandingHero`).

**Known ordering dependency:** Task 4's `HeroScrolly` imports `HeroStaticFrame` from Task 6 — flagged in Task 4 Step 3 with two resolutions (do Task 6 first, recommended).
