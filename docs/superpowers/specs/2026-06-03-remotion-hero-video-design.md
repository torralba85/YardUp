# Remotion-Authored Full-Bleed Hero Video — Design

**Date:** 2026-06-03
**Status:** Approved (design); pending implementation plan
**Owner:** Andrew Torralba

## Summary

Replace the landing page's 3D scrollytelling hero (`LandingHero` → `HeroScrolly` /
`HeroStory2D` capability tiering) with a **full-bleed hero video**. The video is a
~6-second, one-shot animation authored in **Remotion** and rendered to a static file
at build time. The page itself ships a plain native `<video>` element — Remotion never
runs on the client.

The animation tells the brand's core narrative in motion: **a lot is found → its
cadastral boundary draws in → an ADU casts onto the buildable envelope → the rent
figure counts up.** It then settles and holds on the final frame.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Visual direction | **Hybrid** — painterly aerial base + crisp cadastral overlay | Reference-clip warmth + brand precision |
| Legibility treatment | **Left editorial scrim** (espresso gradient left→right) | Matches current left-text/right-visual layout |
| Playback | **One-shot, ~6s, holds final frame** (no loop) | "Story" feel; final frame doubles as poster |
| Copy | **Full rewrite — R1** (see below) | Lead with money + credible next step (brand voice) |
| Relationship to existing hero | **Replaces** the 3D scrollytelling hero | Single immersive hero; retires unused R3F hero path |
| Render pipeline | **In-repo `remotion/` dir, build-time only** | No client-side Remotion; editable source, static runtime cost |

### Why Remotion (and what it is NOT used for)

Remotion renders React → video files. It is **not** a playback library and is **not**
used to embed/play video in the page. It is the *authoring* tool: it runs once at build
time to produce `hero.mp4` / `hero.webm` / `hero-poster.jpg`. The runtime cost is
identical to any static video, but the source stays editable React — changing the rent
figure, palette, or motion is a code edit + re-render, not a re-shoot.

Rejected alternatives:
- **Separate Remotion repo** — asset drift, worse DX for a single hero.
- **Live `@remotion/player`** — ships Remotion to the client, hurts layout stability;
  wrong for a passive background.

## Architecture

```
urbanlens-landing/
  remotion/
    index.ts                 # registerRoot
    Root.tsx                 # <Composition id="HeroLot" durationInFrames=180 fps=30 width=1920 height=1080 />
    HeroLot.tsx              # top-level composition; orchestrates beats via useCurrentFrame
    scene/
      AerialBase.tsx         # painterly aerial (vector SVG/CSS, brand palette, slow parallax)
      Pin.tsx                # location pin drop (spring) + ground glow
      CadastralBoundary.tsx  # dashed parcel boundary draw-on (stroke-dashoffset)
      BuildableEnvelope.tsx  # forest dashed envelope reveal
      AduCast.tsx            # ADU footprint rising/casting (spring + shadow)
      RentChip.tsx           # rent chip enter + count-up to figure
  public/hero/
    hero.mp4                 # H.264 (committed)
    hero.webm                # VP9/AV1 (committed)
    hero-poster.jpg          # FINAL frame — LCP image + reduced-motion fallback
  components/landing/
    LandingHero.tsx          # rewritten: native <video> hero, no R3F
  package.json               # + remotion devDeps; script "hero:render"
```

Remotion (`remotion`, `@remotion/cli`, `@remotion/google-fonts`) added as
**devDependencies**. An npm script `hero:render` runs `remotion render HeroLot
public/hero/hero.mp4` plus the webm and a still for the poster (final frame).

**Render workflow (decided): commit the rendered assets.** `hero:render` is run
manually/locally when the design changes; the resulting `hero.mp4`, `hero.webm`, and
`hero-poster.jpg` are committed to `public/hero/`. **Normal `npm run build` and deploys
do NOT run Remotion and do NOT require headless Chromium** — they consume the committed
static files. This keeps the deploy pipeline unchanged and stable; Remotion's Chromium
is only needed on the machine that re-renders.

## Composition Detail (180 frames @ 30fps, 1920×1080)

Built as vector SVG/CSS inside Remotion for crispness at 1080p and exact palette
fidelity (`--lf-*` tokens from DESIGN.md). Beats:

| Frames (s) | Beat | Remotion primitive |
|---|---|---|
| 0–24 (0–0.8s) | Aerial eases in; slow continuous parallax drift throughout | `interpolate` + `Easing.inOut(cubic)` |
| 24–54 (0.8–1.8s) | Pin drops onto the lot + soft ground glow | `spring()` |
| 54–90 (1.8–3.0s) | Cadastral boundary draws around the parcel | `stroke-dashoffset` animation |
| 90–126 (3.0–4.2s) | Buildable envelope reveals → ADU casts/rises (foundry metaphor) | `spring()` + drop shadow |
| 126–162 (4.2–5.4s) | Rent chip enters; figure counts up to target | `interpolate` count |
| 162–180 (5.4–6.0s) | Settle to rest → **this frame is exported as the poster** | hold |

Fonts inside the video (rent chip): Outfit Black (figure) + Geist Mono (label) via
`@remotion/google-fonts`. Palette: warm-foundry tokens; forest green reserved for the
ADU/value elements only (brand rule).

## Page Integration

`LandingHero.tsx` becomes a `<section>` containing:

- Explicit `min-height: clamp(560px, 80vh, 760px)` → **zero CLS**.
- `<video autoPlay muted playsInline preload="auto" poster="/hero/hero-poster.jpg">`
  with `<source>` order webm → mp4, positioned `absolute inset-0 object-cover`. No
  `loop` (one-shot holds last frame natively).
- **Left editorial scrim**: a fixed espresso gradient overlay (left→right) so contrast
  never depends on the live frame.
- Foreground copy in a `relative z-10` container with a faint headline text-shadow.

### Legibility & performance guarantees

- **Poster = LCP element**, paints instantly; video loads after.
- **Fixed scrim** guarantees headline/CTA contrast independent of the playing frame.
- **`prefers-reduced-motion` and Save-Data**: do not autoplay — show the poster (the
  *final* frame, so the static view still communicates the rent answer).
- `muted playsInline` for iOS/mobile autoplay; `object-cover` + fixed min-height for
  stability.

## Copy (R1, approved)

| Field | Value |
|---|---|
| Eyebrow (Geist Mono, uppercase) | `FROM LOT TO INCOME` |
| Headline (Outfit Black) | **See the rent your backyard is hiding.** |
| CTA (mahogany button → `/signup`) | `Estimate my lot →` |

Alternates retained for future swap:
- R2 — `ADU FEASIBILITY IN MINUTES` / "Your lot. Mapped, costed, ready to build." / `Run my free estimate →`
- R3 — `BACKYARD INCOME, MAPPED` / "Turn your backyard into monthly rent." / `Map my backyard →`

Estimate-honest rule still applies: figures are labeled as estimates; no guaranteed-income language.

## Removals

- `LandingHero` swaps to the video hero.
- The 3D scrollytelling chain — `HeroScrolly`, `HeroSceneContent`, `LotAduScene`, and
  `useHeroCapability` — becomes unused. Delete whatever is **not imported elsewhere**
  (verify during implementation). `components/ParcelScene.tsx` (studio) is independent
  and stays.
- `three` / `@react-three/*` remain installed (used by the studio), unless the
  implementation step confirms the hero was their only consumer.

## Testing

- **Unit (Vitest):** `LandingHero` renders the `<video>` with correct `poster`,
  `<source>` order, `muted`/`playsInline`/no-`loop` attributes, and the R1 copy.
- **Reduced-motion:** with `prefers-reduced-motion: reduce`, the component does not
  autoplay (poster shown).
- **E2E (Playwright):** hero section present above the fold, no CLS, CTA links to
  `/signup`; poster image returns 200.
- **Visual check:** dev server + screenshot at 390px and 1440px to confirm scrim
  legibility and full-bleed crop.
- **Remotion:** `npm run hero:render` succeeds locally; committed output files exist in
  `public/hero/` and are within a size budget (target mp4 < ~3MB). Builds/deploys do not
  invoke Remotion.

## Open Risks

- **720p reference** is placeholder-only; shipped asset renders at 1920×1080.
- **Asset size** must stay small for a hero — keep duration at 6s, tune bitrate, prefer
  webm/VP9 (or AV1) as the first source.
- **Re-render dependency**: regenerating the asset requires Remotion's headless Chromium
  on the machine running `hero:render` (not on build/deploy machines). Document the step
  so any contributor can regenerate. Committed binaries add repo weight (Git LFS is
  already enabled globally — track `public/hero/*.mp4` / `*.webm` via LFS).
