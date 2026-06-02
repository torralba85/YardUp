# Landing Page Reinvention — 3D Scrollytelling Hero

**Date:** 2026-06-01
**Status:** Approved design, pending implementation plan
**Topic:** Replace the flat LotFoundry landing page with a pinned 3D scrollytelling experience that visualizes "cast value from a lot."

---

## 1. Goal & Context

The current landing (`app/page.tsx`) is clean and credibly "financial-serious" but reads as a flat SaaS template: uniform cream background, a static product-snapshot card, and a standard 6-card feature grid. Nothing creates depth, atmosphere, or a "wow" moment on scroll.

The user chose a **full reinvention** anchored on an **interactive 3D lot → ADU build**, told through **scrollytelling**, with **procedurally-built** geometry and a **desktop-3D / mobile-2D** fallback split.

**Aesthetic guardrail (non-negotiable):** the brand is warm and *financial-serious*. The 3D is a restrained, slow, premium architectural model — NOT a flashy WebGL demo reel. The moment it reads as a tech demo it undercuts the "credible income estimate" trust the product sells on. Use only the existing warm palette (`--lf-*` tokens in `app/globals.css`). No neon, no dark glassmorphism.

## 2. The Narrative (4 stages)

One continuous scene advances as the visitor scrolls:

1. **Bare lot** — empty warm-lit parcel plane; address label; clay-colored parcel outline + setback lines.
2. **ADU rises** — a stylized ADU extrudes up out of the lot and assembles (walls → roof drop → windows light up).
3. **The numbers** — income snapshot figures float in beside the scene and count up: `$2,350/mo`, Annual NOI `$20.6k`, Payback `9.8 yrs`, Coverage `31% of 40%`.
4. **Report ready** — "owner report ready," CTA resolves.

## 3. Architecture

- `app/page.tsx` becomes a thin composition of client sections (mostly server-rendered shell with islands).
- The 3D hero is a **client-only component, dynamically imported with `ssr: false`**. Rationale: Next 16 + r3f will attempt WebGL on the server and crash hydration otherwise.
- **Single source of truth for motion:** motion's `useScroll` produces one `scrollProgress` value (0→1) over a tall sticky section. `useTransform` derives EVERYTHING from it — camera angle, ADU build progress, and each text block's opacity. No second clock. This makes every stage deterministic and testable by feeding a fixed progress value.
- **Documented interface between scroll and scene:** `scrollProgress: number` in `[0, 1]`. The scene component is a pure function of this value (plus optional drag-orbit offset). Stage thresholds: `[0, 0.25)` lot, `[0.25, 0.5)` ADU rises, `[0.5, 0.75)` numbers, `[0.75, 1]` report.

### New files (`components/landing/`)

| File | Responsibility |
|---|---|
| `LotAduScene.tsx` | r3f `Canvas` + procedural geometry (lot plane, ADU, lighting, contact shadow). Pure function of `scrollProgress` + drag offset. |
| `HeroScrolly.tsx` | Sticky/pinned wrapper. Owns `scrollProgress` via `useScroll`. Drives scene + synced text reveals. Desktop only. |
| `HeroStory2D.tsx` | Mobile / reduced-motion fallback. Polished 2D animated sequence, NOT pinned. |
| `AmbientBackdrop.tsx` | Warm radial gradient + subtle grain to replace the flat cream. |
| `FeatureBand.tsx` | Tighter modern feature band for the remaining points (saved concepts, shareable report, builder-ready). |
| `LandingHero.tsx` | Capability-detecting switch: renders `HeroScrolly` (dynamic, `ssr:false`) or `HeroStory2D`. |

`app/globals.css` gains new keyframes/utilities as needed; existing `--lf-*` tokens and reduced-motion block are reused.

## 4. The 3D Content (procedural, brand-lit)

Built from code primitives — no external asset — but structured so a real GLTF model can drop in later without reworking scroll logic (geometry isolated behind a `<AduModel progress={...} />` component boundary).

- **Lot:** sand-colored ground plane; clay parcel outline + setback lines (drawn as line segments or thin extrusions).
- **ADU:** box body + simple gabled roof; clay / mahogany materials; windows as soft-emissive panels. "Build" animates scale-Y from 0 with a small staggered assembly and roof drop, driven by stage-2 progress.
- **Lighting:** warm key light + hemisphere fill + soft contact shadow (drei `ContactShadows`). Slow camera orbit derived from `scrollProgress`; limited drag-to-orbit on desktop (clamped polar/azimuth).
- **Performance:** `frameloop="demand"` (render on scroll/drag change only), `dpr={[1, 1.5]}`, Suspense fallback = a static final-frame placeholder sized to match the canvas (no layout shift).

## 5. Fallbacks & Accessibility (desktop 3D, mobile 2D)

Capability gate (all must be true for 3D): desktop viewport, WebGL available, fine pointer (`pointer: fine`), and NOT `prefers-reduced-motion`.

- **Passes gate** → full pinned 3D scrollytelling (`HeroScrolly`).
- **Mobile / coarse pointer** → `HeroStory2D`: SVG parcel draws, ADU illustration rises, numbers count up, on normal scroll-reveal. NOT pinned (avoids mobile scroll-jank).
- **`prefers-reduced-motion`** → static composed final frame, fully legible, zero autoplay, no pinning.
- **SSR / no-JS** → static placeholder matching the final frame; never a blank canvas.

## 6. Below the Hero

The scrollytelling covers the 4 core beats, so the old 6-card grid shrinks to a tighter modern **feature band** covering the remaining points (saved concepts, shareable owner report, builder-ready next step), followed by a redesigned closing CTA sitting on the ambient backdrop. Header and footer are preserved.

## 7. Build Order (highest-risk-first) & Verification

1. **3D scene standalone** — `LotAduScene` rendered static + draggable on a scratch route or in isolation. Screenshot via chrome-devtools at `localhost:3000`. **User sign-off checkpoint before proceeding.**
2. Wire `scrollProgress` pinning (`HeroScrolly`) + 4 stages + synced text reveals.
3. `AmbientBackdrop` + redesigned `FeatureBand` + closing CTA.
4. `HeroStory2D` mobile fallback + reduced-motion static path.
5. Capability detection + `ssr:false` dynamic import in `LandingHero`; swap into `app/page.tsx`.
6. Update Playwright visual snapshots (desktop + mobile + reduced-motion variants); verify via chrome-devtools; `npm run lint` + typecheck.

**Verification loop:** chrome-devtools against the already-running `localhost:3000` is the proven screenshot path on this machine (the preview MCP is flaky on this Windows/Next 16 setup). Use it after each milestone.

## 8. Non-Goals (YAGNI)

- No real GLTF/photoreal model in v1 (procedural only; model-swap left as a clean seam).
- No real address geocoding / map integration in the hero (the address is illustrative copy).
- No CMS / content-driven sections.
- No changes to `/studio`, `/builder`, auth, or data layers.

## 9. Risks

- **Scroll-pin + r3f + SSR tangled together** → mitigated by building the scene standalone first (step 1) and the `ssr:false` boundary.
- **Motion reading as a "demo reel"** → mitigated by restrained, slow, warm motion and the financial-serious guardrail.
- **Mobile performance** → mitigated by the 2D fallback (no 3D, no pinning on touch).
- **Dependency compat** → confirmed good: r3f 9.6.1 / drei 10.7.7 / three 0.164.1 / React 19.2.6 / Next 16.2.6 / motion 12.
