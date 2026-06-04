# Remotion Full-Bleed Hero Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's 3D scrollytelling hero with a full-bleed, one-shot ~6s video authored in Remotion (rendered to static files at build time) and played by a native `<video>` element with a left editorial scrim.

**Architecture:** Remotion lives in an in-repo `remotion/` folder as a **devDependency** and renders three committed assets (`hero.mp4`, `hero.webm`, `hero-poster.jpg`) into `public/hero/`. The page ships a plain native `<video>`; no Remotion code reaches the client. The video plays once and holds its final frame, which is also the poster (the reduced-motion fallback and LCP image).

**Tech Stack:** Next.js 16, React 19, TypeScript, Remotion 4 (`remotion`, `@remotion/cli`, `@remotion/google-fonts`), Vitest + Testing Library (jsdom), Playwright, Tailwind v4 brand tokens (`lf-*`), Git LFS.

**Spec:** `docs/superpowers/specs/2026-06-03-remotion-hero-video-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | + Remotion devDeps and `hero:*` render scripts |
| `.gitattributes` | Track committed `public/hero/*.mp4` / `*.webm` via Git LFS |
| `remotion.config.ts` | Render defaults (overwrite, jpeg stills) |
| `remotion/index.ts` | `registerRoot` entry point for the CLI |
| `remotion/Root.tsx` | Declares the `HeroLot` composition (180f, 30fps, 1920×1080) |
| `remotion/theme.ts` | Brand palette constants shared by scene parts |
| `remotion/geometry.ts` | Shared parcel/envelope/ADU/pin/rent coordinates |
| `remotion/HeroLot.tsx` | Top-level composition; stacks the scene layers |
| `remotion/scene/AerialBase.tsx` | Painterly aerial base + slow parallax |
| `remotion/scene/CadastralBoundary.tsx` | Parcel boundary draw-on |
| `remotion/scene/BuildableEnvelope.tsx` | Dashed forest buildable envelope reveal |
| `remotion/scene/AduCast.tsx` | ADU footprint rising/casting |
| `remotion/scene/Pin.tsx` | Location pin drop + ground glow |
| `remotion/scene/RentChip.tsx` | Rent chip enter + figure count-up |
| `public/hero/hero.{mp4,webm}`, `hero-poster.jpg` | Committed rendered output |
| `components/landing/LandingHero.tsx` | **Rewritten** to the native video hero |
| `components/landing/LandingHero.test.tsx` | Unit tests for the video hero |
| `e2e/hero.spec.ts` | Playwright coverage (visible, CTA, reduced-motion, poster 200) |
| _deleted_ | `HeroScrolly.tsx`, `HeroSceneContent.tsx`, `LotAduScene.tsx`, `HeroStory2D.tsx`, `lib/use-hero-capability.ts`, `lib/use-hero-capability.test.ts` |

All commands run from `urbanlens-landing/`.

---

## Task 1: Remotion tooling, scripts, LFS, config

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `.gitattributes`
- Create: `remotion.config.ts`

- [ ] **Step 1: Install Remotion as devDependencies**

Run:
```bash
npm install --save-dev remotion@^4.0.0 @remotion/cli@^4.0.0 @remotion/google-fonts@^4.0.0
```
Expected: installs without peer-dep errors (Remotion 4 supports React 19).

- [ ] **Step 2: Add render scripts to `package.json`**

Add these entries to the `"scripts"` object:
```json
"hero:mp4": "remotion render remotion/index.ts HeroLot public/hero/hero.mp4",
"hero:webm": "remotion render remotion/index.ts HeroLot public/hero/hero.webm --codec=vp9",
"hero:still": "remotion still remotion/index.ts HeroLot public/hero/hero-poster.jpg --frame=179",
"hero:render": "npm run hero:mp4 && npm run hero:webm && npm run hero:still"
```

- [ ] **Step 3: Create `.gitattributes` for LFS on the committed binaries**

Create `.gitattributes`:
```gitattributes
public/hero/*.mp4 filter=lfs diff=lfs merge=lfs -text
public/hero/*.webm filter=lfs diff=lfs merge=lfs -text
```
(The poster `.jpg` is small — left as a normal Git blob.)

- [ ] **Step 4: Create `remotion.config.ts` (render defaults)**

Create `remotion.config.ts`:
```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 5: Create the output dir placeholder**

Run:
```bash
mkdir -p public/hero
```
Expected: directory exists (assets land here in Task 3).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitattributes remotion.config.ts
git commit -m "build: add Remotion authoring toolchain and hero render scripts"
```

---

## Task 2: Build the Remotion composition

No unit tests here — a 6s vector animation is verified visually by rendering still frames at each beat and eyeballing them. Each step ends by rendering a still and confirming it is not blank/errored.

**Files:**
- Create: `remotion/index.ts`, `remotion/Root.tsx`, `remotion/theme.ts`, `remotion/geometry.ts`, `remotion/HeroLot.tsx`
- Create: `remotion/scene/AerialBase.tsx`, `CadastralBoundary.tsx`, `BuildableEnvelope.tsx`, `AduCast.tsx`, `Pin.tsx`, `RentChip.tsx`

- [ ] **Step 1: Entry point + theme + geometry**

Create `remotion/index.ts`:
```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

Create `remotion/theme.ts`:
```ts
export const LF = {
  sand: "#F2E5D5",
  sand2: "#F8F0E4",
  card: "#FBF6EE",
  taupe: "#BFA58E",
  clay: "#8C5B3F",
  mahogany: "#592A0F",
  espresso: "#261307",
  hairline: "#E0CDB4",
  forest: "#2F4A38",
} as const;
```

Create `remotion/geometry.ts`:
```ts
// Shared coordinates in the 1920×1080 composition space.
// The lot sits center-right so the left editorial scrim never covers it.
export const PARCEL_D = "M760 560 L1340 600 L1300 880 L720 840 Z";
export const ENVELOPE_D = "M884 650 L1244 680 L1212 844 L904 818 Z";
export const ADU = { x: 1012, y: 702, w: 156, h: 112 };
export const ADU2 = { x: 1196, y: 720, w: 96, h: 150 };
export const PIN = { x: 1044, y: 690 };
export const RENT = { value: 2350, x: 1296, y: 452, w: 360, h: 132 };
```

- [ ] **Step 2: Composition declaration**

Create `remotion/Root.tsx`:
```tsx
import React from "react";
import { Composition } from "remotion";
import { HeroLot } from "./HeroLot";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroLot"
      component={HeroLot}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

- [ ] **Step 3: Aerial base layer**

Create `remotion/scene/AerialBase.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const AerialBase: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = interpolate(frame, [0, 24], [1.08, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -26]);
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `scale(${intro}) translateX(${drift}px)`, transformOrigin: "center" }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9c3a8" />
            <stop offset="0.42" stopColor="#9fae9b" />
            <stop offset="1" stopColor="#4f6b4f" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#sky)" />
        <path d="M0 470 Q480 410 980 460 T1920 440 V1080 H0 Z" fill="#6f8c5f" />
        <path d="M0 600 Q620 540 1100 600 T1920 575 V1080 H0 Z" fill="#c9b27e" opacity="0.85" />
        <path d="M-40 760 Q560 690 1040 770 T1960 720 V1120 H-40 Z" fill="#3f5a3c" />
        <path d="M-40 930 Q700 870 1160 940 T1980 900 V1140 H-40 Z" fill="#2f4632" opacity="0.9" />
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Cadastral boundary (draw-on)**

Create `remotion/scene/CadastralBoundary.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { PARCEL_D } from "../geometry";
import { LF } from "../theme";

export const CadastralBoundary: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [54, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <path
          d={PARCEL_D}
          fill="none"
          stroke={LF.sand}
          strokeWidth={5}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Buildable envelope (dashed forest reveal)**

Create `remotion/scene/BuildableEnvelope.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ENVELOPE_D } from "../geometry";
import { LF } from "../theme";

export const BuildableEnvelope: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [90, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <path
          d={ENVELOPE_D}
          fill="rgba(47,74,56,0.12)"
          stroke={LF.forest}
          strokeWidth={4}
          strokeDasharray="14 12"
          strokeLinejoin="round"
        />
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 6: ADU cast (rise)**

Create `remotion/scene/AduCast.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ADU, ADU2 } from "../geometry";
import { LF } from "../theme";

export const AduCast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 100, fps, config: { damping: 14, stiffness: 110 } });
  const ty = interpolate(rise, [0, 1], [44, 0]);
  const opacity = interpolate(frame, [100, 114], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <g transform={`translate(0 ${ty})`}>
          <rect
            x={ADU.x}
            y={ADU.y}
            width={ADU.w}
            height={ADU.h}
            rx={8}
            fill={LF.forest}
            style={{ filter: "drop-shadow(0 14px 18px rgba(38,19,7,0.35))" }}
          />
          <rect x={ADU2.x} y={ADU2.y} width={ADU2.w} height={ADU2.h} rx={8} fill={LF.forest} opacity={0.92} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 7: Pin drop + ground glow**

Create `remotion/scene/Pin.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PIN } from "../geometry";
import { LF } from "../theme";

export const Pin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 24, fps, config: { damping: 12, stiffness: 130 } });
  const ty = interpolate(drop, [0, 1], [-260, 0]);
  const opacity = interpolate(frame, [24, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(frame, [50, 62], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <ellipse cx={PIN.x} cy={PIN.y + 6} rx={58} ry={16} fill={LF.sand} opacity={glow} />
        <g transform={`translate(${PIN.x} ${PIN.y}) translate(0 ${ty})`}>
          <path
            d="M0 0 C-26 0 -44 -20 -44 -44 C-44 -74 0 -104 0 -104 C0 -104 44 -74 44 -44 C44 -20 26 0 0 0 Z"
            fill="#ffffff"
            style={{ filter: "drop-shadow(0 8px 12px rgba(38,19,7,0.4))" }}
          />
          <circle cx={0} cy={-52} r={18} fill="none" stroke={LF.forest} strokeWidth={8} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 8: Rent chip + count-up**

Create `remotion/scene/RentChip.tsx`:
```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { RENT } from "../geometry";
import { LF } from "../theme";

const { fontFamily } = loadFont();

export const RentChip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 126, fps, config: { damping: 16, stiffness: 120 } });
  const ty = interpolate(enter, [0, 1], [24, 0]);
  const opacity = interpolate(frame, [126, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const count = Math.round(
    interpolate(frame, [126, 162], [0, RENT.value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );
  const label = `$${count.toLocaleString("en-US")}/mo`;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <g transform={`translate(0 ${ty})`}>
          <rect x={RENT.x} y={RENT.y} width={RENT.w} height={RENT.h} rx={26} fill={LF.espresso} opacity={0.94} />
          <text
            x={RENT.x + 30}
            y={RENT.y + 46}
            fill={LF.sand}
            fontFamily="monospace"
            fontSize={22}
            fontWeight={700}
            letterSpacing={3}
          >
            EST. RENT
          </text>
          <text
            x={RENT.x + 30}
            y={RENT.y + 104}
            fill={LF.sand}
            fontFamily={fontFamily}
            fontSize={64}
            fontWeight={900}
          >
            {label}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 9: Compose all layers**

Create `remotion/HeroLot.tsx`:
```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { LF } from "./theme";
import { AerialBase } from "./scene/AerialBase";
import { CadastralBoundary } from "./scene/CadastralBoundary";
import { BuildableEnvelope } from "./scene/BuildableEnvelope";
import { AduCast } from "./scene/AduCast";
import { Pin } from "./scene/Pin";
import { RentChip } from "./scene/RentChip";

export const HeroLot: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: LF.espresso }}>
      <AerialBase />
      <CadastralBoundary />
      <BuildableEnvelope />
      <AduCast />
      <Pin />
      <RentChip />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 10: Verify the composition registers and type-checks**

Run:
```bash
npx remotion compositions remotion/index.ts
```
Expected: lists a composition with id `HeroLot` (180 frames, 1920×1080, 30fps).

- [ ] **Step 11: Render still frames at each beat and eyeball them**

Run:
```bash
npx remotion still remotion/index.ts HeroLot /tmp/f60.png --frame=60
npx remotion still remotion/index.ts HeroLot /tmp/f120.png --frame=120
npx remotion still remotion/index.ts HeroLot /tmp/f179.png --frame=179
```
Expected: three PNGs render without error. Open them and confirm: f60 shows the aerial + pin + partial boundary; f120 shows envelope + ADU rising; f179 shows the settled scene with the `$2,350/mo` chip. If a layer is missing or mispositioned, adjust `remotion/geometry.ts` (coordinates only) and re-render — no logic changes needed.

- [ ] **Step 12: Commit**

```bash
git add remotion/
git commit -m "feat: add Remotion HeroLot composition (aerial + cadastral + ADU + rent)"
```

---

## Task 3: Render and commit the hero assets

**Files:**
- Create (rendered): `public/hero/hero.mp4`, `public/hero/hero.webm`, `public/hero/hero-poster.jpg`

- [ ] **Step 1: Confirm Git LFS is initialized in this repo**

Run:
```bash
git lfs install --local
```
Expected: "Git LFS initialized." (CLAUDE.md notes LFS is enabled globally; this makes the repo hooks explicit.)

- [ ] **Step 2: Render all three assets**

Run:
```bash
npm run hero:render
```
Expected: `public/hero/hero.mp4`, `public/hero/hero.webm`, and `public/hero/hero-poster.jpg` are created. Note the mp4 size.

- [ ] **Step 3: Check the size budget**

Run:
```bash
ls -lh public/hero/
```
Expected: `hero.mp4` is under ~3MB. If larger, lower bitrate by re-rendering mp4 with `--crf=28` (`npx remotion render remotion/index.ts HeroLot public/hero/hero.mp4 --crf=28`) and re-check.

- [ ] **Step 4: Verify LFS is tracking the binaries**

Run:
```bash
git add public/hero/ && git status
```
Expected: `git status` shows the new files staged; `git lfs status` lists `hero.mp4` and `hero.webm` as LFS objects (the `.jpg` is a normal blob).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: render and commit hero video assets (mp4/webm/poster via LFS)"
```

---

## Task 4: Rewrite LandingHero as the native video hero (TDD)

**Files:**
- Modify (full rewrite): `components/landing/LandingHero.tsx`
- Create: `components/landing/LandingHero.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/landing/LandingHero.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";

function setMatchMedia(reduce: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }) as unknown as MediaQueryList;
}

describe("LandingHero video hero", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    setMatchMedia(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the approved R1 copy and CTA to /signup", () => {
    render(<LandingHero />);
    expect(screen.getByText(/from lot to income/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /see the rent your backyard is hiding/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estimate my lot/i })).toHaveAttribute("href", "/signup");
  });

  it("renders a stable, legible full-bleed video element", () => {
    const { container } = render(<LandingHero />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    expect(video).not.toHaveAttribute("loop");
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    const sources = container.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("src", "/hero/hero.webm");
    expect(sources[1]).toHaveAttribute("src", "/hero/hero.mp4");
  });

  it("autoplays once when motion is allowed", () => {
    render(<LandingHero />);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("does not autoplay under prefers-reduced-motion (poster remains)", () => {
    setMatchMedia(true);
    render(<LandingHero />);
    expect(playSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx vitest run components/landing/LandingHero.test.tsx
```
Expected: FAIL — the current `LandingHero` renders no `<video>` and uses the old copy.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `components/landing/LandingHero.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Full-bleed hero. Plays a Remotion-rendered ~6s clip once and holds the final
 * frame (which is also the poster, so the static/reduced-motion view still shows
 * the rent answer). A fixed left editorial scrim guarantees headline/CTA contrast
 * regardless of the playing frame.
 */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const saveData = connection?.saveData === true;
    if (reduce || saveData) return; // poster stays; do not autoplay
    void video.play().catch(() => {
      /* autoplay blocked (e.g. low-power mode) — poster remains, no error surfaced */
    });
  }, []);

  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{ minHeight: "clamp(560px, 80vh, 760px)" }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster="/hero/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/hero/hero.webm" type="video/webm" />
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(38,19,7,0.92) 0%, rgba(38,19,7,0.55) 38%, rgba(38,19,7,0.12) 64%, rgba(38,19,7,0) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-sand/85">
            From lot to income
          </p>
          <h1
            className="mt-3 font-display text-5xl font-black leading-[0.98] tracking-[-0.03em] text-lf-sand md:text-7xl"
            style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
          >
            See the rent your backyard is hiding.
          </h1>
          <Link
            href="/signup"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
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

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
npx vitest run components/landing/LandingHero.test.tsx
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/landing/LandingHero.tsx components/landing/LandingHero.test.tsx
git commit -m "feat: replace 3D hero with full-bleed Remotion video hero"
```

---

## Task 5: Remove the dead 3D scrollytelling hero

After Task 4, `LandingHero` no longer imports the old hero chain. `app/page.tsx` (the only external consumer) still imports `LandingHero`, so nothing else should reference the old files.

**Files:**
- Delete: `components/landing/HeroScrolly.tsx`, `HeroSceneContent.tsx`, `LotAduScene.tsx`, `HeroStory2D.tsx`
- Delete: `lib/use-hero-capability.ts`, `lib/use-hero-capability.test.ts`

- [ ] **Step 1: Confirm nothing else imports the doomed files**

Run:
```bash
grep -rn "HeroScrolly\|HeroSceneContent\|LotAduScene\|HeroStory2D\|HeroStaticFrame\|use-hero-capability\|useHeroCapability" app components lib --include="*.ts" --include="*.tsx"
```
Expected: matches ONLY inside the six files slated for deletion (and the test). If any other file references them, stop and reassess — do not delete.

- [ ] **Step 2: Delete the files**

Run:
```bash
git rm components/landing/HeroScrolly.tsx components/landing/HeroSceneContent.tsx components/landing/LotAduScene.tsx components/landing/HeroStory2D.tsx lib/use-hero-capability.ts lib/use-hero-capability.test.ts
```

- [ ] **Step 3: Verify the unit suite and lint are green**

Run:
```bash
npm run test && npm run lint
```
Expected: all tests pass; ESLint reports 0 warnings/errors (no unused imports, no dangling references).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused 3D scrollytelling hero and capability hook"
```

---

## Task 6: E2E coverage + full verification

**Files:**
- Create: `e2e/hero.spec.ts`

- [ ] **Step 1: Write the E2E spec**

Create `e2e/hero.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test.describe("Landing hero video", () => {
  test("shows the headline, CTA, and a stable full-bleed video", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /see the rent your backyard is hiding/i }),
    ).toBeVisible();

    const cta = page.getByRole("link", { name: /estimate my lot/i });
    await expect(cta).toHaveAttribute("href", "/signup");

    const video = page.locator("video").first();
    await expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    const box = await video.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(540); // explicit min-height → no collapse
  });

  test("poster asset is served", async ({ page }) => {
    const resp = await page.request.get("/hero/hero-poster.jpg");
    expect(resp.status()).toBe(200);
  });

  test("does not autoplay under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const paused = await page.locator("video").first().evaluate((v: HTMLVideoElement) => v.paused);
    expect(paused).toBe(true);
    await context.close();
  });
});
```

- [ ] **Step 2: Run the E2E spec**

Run:
```bash
npx playwright test e2e/hero.spec.ts
```
Expected: PASS on both `desktop-chromium` and `mobile-chromium`. (Playwright auto-starts the dev server per `playwright.config.ts`.)

- [ ] **Step 3: Full verification gate**

Run:
```bash
npm run lint && npm run test && npm run build
```
Expected: ESLint clean (0 warnings), all unit tests pass, `next build` succeeds (confirms the removed components left no broken imports and the new hero compiles).

- [ ] **Step 4: Manual visual smoke (dev server)**

Run `npm run dev`, open `http://localhost:3000`, and confirm at 1440px and 390px: the video fills the hero, the left scrim keeps the headline/CTA legible, the clip plays once and holds on the rent figure, and there is no layout shift on load.

- [ ] **Step 5: Commit**

```bash
git add e2e/hero.spec.ts
git commit -m "test: add E2E coverage for the video hero"
```

---

## Self-Review

**Spec coverage:**
- Hybrid visual → Task 2 (AerialBase + cadastral/envelope/ADU overlay). ✓
- Left editorial scrim → Task 4 component (gradient overlay). ✓
- One-shot ~6s, holds final frame → Task 2 (180f, no loop) + Task 4 (`<video>` without `loop`). ✓
- Poster = final frame = LCP + reduced-motion fallback → Task 2 Step 11 / Task 3 (`--frame=179`) + Task 4 effect. ✓
- R1 copy → Task 4 + tests. ✓
- In-repo Remotion, build-time only, commit assets, LFS → Tasks 1 & 3. ✓
- Deploys never touch Chromium → assets committed (Task 3); build verified (Task 6 Step 3). ✓
- Replace 3D hero; Three.js stays for studio → Task 5 (deletes hero chain only; `ParcelScene` untouched). ✓
- Testing (unit/reduced-motion/E2E/poster 200/CLS) → Tasks 4 & 6. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command lists expected output. ✓

**Type/name consistency:** `HeroLot` composition id used consistently in Root.tsx and all `hero:*` scripts; geometry exports (`PARCEL_D`, `ENVELOPE_D`, `ADU`, `ADU2`, `PIN`, `RENT`) defined in Task 2 Step 1 and consumed by the matching scene parts; `LandingHero` named export matches its existing import in `app/page.tsx`. ✓
