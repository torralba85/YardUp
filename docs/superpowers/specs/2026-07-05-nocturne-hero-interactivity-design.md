# Nocturne Hero Interactivity: Six-Channel Enhancement

**Date:** 2026-07-05
**Status:** Approved scope ("all six"), implementation on `feat/nocturne-hero-interactivity`
**Predecessor:** The Three.js hero wow pass (spec 2026-07-04) is superseded by the Blue Hour Remotion hero (#93); its branch `claude/eager-kowalevski-9b6e4b` is parked as reference. This spec translates the approved wow goals onto the Remotion architecture and extends them.

## Context

The landing hero (`components/landing/nocturne/BlueHourHero.tsx`) pins for 320svh and scrubs a Remotion composition (`remotion/nocturne/BlueHourLot.tsx`) via `PlayerRef.seekTo`. The composition draws parcel boundary → setback envelope → ADU cast over a dusk aerial photo, with `PHASES` frame ranges and `GEOMETRY` normalized polygons in `remotion/nocturne/constants.ts`. An HTML verdict plate counts to $2,340. Today the pointer does nothing and the phase readout is passive `aria-hidden` text.

Goal (carried over from the approved brainstorm): wow/craft factor. All six enhancements below are in scope.

## Enhancements

### 1. Pointer parallax
Wrap the poster `<img>` and the `Player` container in a single parallax wrapper. Cursor position (normalized −1..1) drives a rAF-lerped `translate3d` (±14px x, ±10px y) plus a constant 1.03 scale overscan so edges never expose. Refs only — no React state per mousemove, no Remotion re-render. The HTML copy/plate/readout do NOT move (depth separation). Gates: `(pointer: fine)` matches AND reduced motion off; decays to center on pointer leave.

### 2. Hover/focus-highlight of survey geometry
An HTML `<svg>` overlay inside the parallax wrapper renders invisible polygons from `GEOMETRY` (parcel, envelope, adu) as focusable hotspots (`role="button"`-free — real `<button>` is invalid inside svg; use `<polygon tabIndex={0}>` with `aria-label`, or an HTML button-positioned approach if focus styling demands). Hover or keyboard focus sets `highlight: "parcel" | "envelope" | "adu" | null`, passed to the Player as `inputProps` (low-frequency updates only). `BlueHourLot` accepts the prop: the highlighted layer lifts to full opacity/heavier stroke, the other two dim to ~0.55 of their scrubbed opacity. Highlight has no effect on layers not yet drawn (multiplies with phase opacity).

### 3. Window-glow finale
Inside `BlueHourLot`, 2–3 radial-gradient glow spots positioned over the ADU footprint (`GEOMETRY.adu`) swell during the `verdict` phase (frames 192–240) — amber blooms riding `phase(frame, 192, 232)`, plus a subtle flicker term. Sells "the lights come on when the number lands." Lives in the composition so exports/renders keep it.

### 4. Clickable phase rail (replaces passive readout)
Derive the readout entries from `PHASES` + `BLUE_HOUR_DURATION_IN_FRAMES` in a new pure module `components/landing/nocturne/hero-phases.ts` (single source of truth — the hand-coded `READOUT` fractions in `BlueHourHero.tsx` are deleted). Each entry: `{ id, label, until, target }` where `until = end/duration` (display switching) and `target = (end − 8)/duration` (scroll destination, lands just before the phase completes). The readout becomes a real `<nav>` of buttons: click/Enter scrolls the track to `target` (smooth unless reduced motion), `aria-current="step"` on the active phase. Desktop `motion-safe` only, as today, but no longer `aria-hidden`.

### 5. Survey scan sweep
In `BlueHourLot`, during the boundary phase a thin amber scan line (vertical, with a soft gradient trail) sweeps across the parcel's bounding box once, opacity windowed to the middle of the phase. LIDAR-pass texture; SVG `<line>` + `<linearGradient>`, no filters beyond existing drop-shadow budget.

### 6. Verdict → CTA handoff
New pure threshold `VERDICT_LANDED_AT = 0.94` in `hero-phases.ts`. When progress crosses it (and motion allowed), the address form gains a class that runs a twice-only amber ring pulse (`@keyframes ln-cta-pulse` in `app/globals.css`, `ln-*` scoped, `motion-safe` applied). Converts the payoff into the action without stealing focus.

## Constraints

- `inputProps` carries only low-frequency state (highlight); per-frame values stay out of React.
- Reduced motion: no parallax, no pulse, no player (existing behavior) — hotspots and rail render only with the player.
- Mobile/coarse pointer: no parallax, no hotspots; the rail stays desktop `motion-safe sm:` as the readout is today.
- `ln-*` scoping: all new tokens/keyframes stay landing-only per DESIGN.md 2026-07-05 entry.
- Single source of truth: phase fractions derive from `PHASES`; no duplicated scroll constants.
- Verification: unit tests for `hero-phases.ts` and hero DOM contracts (rail, hotspots, pulse class, highlight inputProps pass-through via mocked Player); visual pass via gstack browse on the dev server; release gate before merge.

## Out of scope

- Audio, mobile tap-to-advance, exit-section morphing, Remotion render pipeline changes (`npm run hero:render` untouched).
