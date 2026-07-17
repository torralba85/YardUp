# Daylight ADU Deconstruction Hero

> Historical concept specification. The production landing is the Blue Hour
> experience in `components/landing/nocturne/`; `DESIGN.md` is the current visual
> source of truth. Keep this document for the daylight deconstruction rationale,
> not as implementation guidance.

## Source of truth

The production implementation lives in:

- `components/landing/LandingHero.tsx` for the sticky scroll sequence, copy,
  address CTA, and feasibility rail.
- `components/landing/BlueprintScene.tsx` for the Three.js ADU model and its
  assembled-to-exploded animation.

This document records the visual invariant that must survive future changes:
the scene is a warm daylight scene. Do not replace it with a dark void, night
lighting, or neon effects. `HERO_SCENE_PALETTE.mode` and its unit test make
that constraint executable.

## Interaction

The hero remains pinned while page scroll separates the ADU into five layers:

1. Zoning envelope
2. Foundation
3. Structure
4. Shell and glazing
5. Finished value

The feasibility rail reflects scroll progress and lets keyboard, pointer, and
touch users jump directly to a layer. Reduced-motion users keep the same
content and controls without forced smooth scrolling.

## Visual direction

- Warm sand background with a daylight sky and landscape ground plane.
- Natural clay, timber, forest, glass, and roof materials from the LotFoundry
  palette.
- Soft ambient shadows and restrained bloom; no nighttime glow treatment.
- The model stays legible in both its assembled and exploded states.

## Responsive and fallback behavior

- Desktop keeps the copy on the left and the feasibility rail on the right.
- Mobile moves the rail to a compact five-step control at the bottom.
- Browsers without WebGL receive an accessible daylight SVG illustration.
- The address form always routes into the existing studio flow.

## Acceptance criteria

- The initial viewport clearly reads as daylight.
- Scrolling reveals all five layers and reaches the finished-value state.
- No hero video or night-scene asset is rendered.
- Address submission and layer controls remain keyboard accessible.
- Desktop and mobile layouts do not obscure the headline, CTA, or controls.
