# HyperFrames Demo Concept: Design Studio Planner

Updated: 2026-05-19

Purpose: create a short product demo video for the ADU Advisor Design Studio after the NotebookLM design upgrade. This is a HyperFrames-ready creative brief, not executable composition HTML. Composition HTML should be written after a project `DESIGN.md` is approved, per the HyperFrames visual identity gate.

## Visual Identity Source

Use the app's current design system as the first draft identity:

- Canvas: `#FFFFFF`
- Surface: `#F6F4EF`
- Text: `#171714`
- Muted text: `#6F716A`
- Accent green: `#2F5D50`
- Parcel blue: `#2F5F80`
- Permit amber: `#A76418`
- Fonts: system sans for UI labels, Georgia-style serif only for editorial title moments
- Radius: 4-8px for UI cards and controls

Do not use generic blue/purple gradients, floating orb backgrounds, or oversized marketing cards. The demo should feel like an operational product workflow: crisp, warm, practical, and credible.

## Composition

- Format: 1920x1080 landscape
- Duration: 42 seconds
- FPS: 30
- Track plan:
  - Track 0: app screenshot/screen-recording plates
  - Track 1: UI callouts and highlight overlays
  - Track 2: captions and short voiceover text
  - Track 3: optional low-volume music bed

## Narrative Arc

1. Problem: homeowners need to know what fits before calling contractors.
2. Planner: selected model appears inside the buildable zone.
3. Fit: app explains setbacks, lot coverage, access, and utility review.
4. Style: one tap changes the architectural direction.
5. Photo: backyard photo context makes the concept specific.
6. Output: generated concept becomes a quote-ready planning artifact.

## Scene Plan

| Time | Scene | Visual | Motion |
| --- | --- | --- | --- |
| 0-4s | Title | App palette, headline: "Know what fits before the first contractor call" | Text rises in; small parcel grid draws in behind it |
| 4-10s | Active lot | Browser capture of `http://localhost:3015/ideas` at top of Design Studio | Soft push-in to Active lot and Backyard planner |
| 10-17s | Model fit | Highlight Garden Studio inside buildable zone; show 340/860 sqft and 34% coverage | Green outline traces buildable zone; model block nudges into place |
| 17-23s | Style switch | Cycle Warm Modern to Industrial or Coastal Minimal | Style chips slide horizontally; selected chip pulses once |
| 23-30s | Site photo | Highlight Camera and Library buttons with "photo context" note | Two callout lines sweep in; no fake photo upload shown unless captured asset exists |
| 30-37s | Generate concept | Click Generate concept, show Garden Studio in selected style and first constraints | Button glow, concept title reveals, two next-step lines stagger in |
| 37-42s | Close | Quote-ready packet: model, lot summary, design concept, permit notes | Four packet items check on; final logo/title holds |

## Voiceover Draft

> ADU Advisor turns a backyard into a planning surface. Pick a real ADU model, move it inside the buildable zone, and see the fit signals that matter before design work starts. Add a style direction, attach site-photo context, then generate a concept builders can price from the same assumptions.

## Required Source Captures

- `http://localhost:3015/ideas` initial Design Studio viewport
- Planner section after moving or rotating the Garden Studio block
- Style rail with one non-default style selected
- Site photo section with Camera and Library visible
- AI concept section after Generate concept has produced a result

## HyperFrames Implementation Notes

- Create a project with `npx hyperframes init adu-design-studio-demo --example product-promo --non-interactive`.
- Add a `DESIGN.md` before authoring `index.html`; base it on the visual identity above.
- Build end-state layouts first, then add `gsap.from()` entrances.
- Use transitions between every scene; avoid exit animations until the final scene.
- Keep app captures as plates and animate callout overlays instead of animating the screenshot itself.
- Use finite ambient repeats only; no `repeat: -1`.
- Validate with:
  - `npx hyperframes lint`
  - `npx hyperframes validate`
  - `npx hyperframes inspect --samples 15`

## Acceptance Criteria

- Viewer understands the planner in under 10 seconds.
- All visible text is readable on 1920x1080.
- Fit signals and model/style choices are shown as product features, not decorative slides.
- No private address details are emphasized beyond what is already visible in the local demo capture.
- Demo ends on the quote-packet value proposition.
