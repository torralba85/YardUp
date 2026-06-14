# Mobile-First Studio — Design Spec

**Date:** 2026-06-09
**Status:** Approved for planning
**Parent objective:** Transform the Feasibility Studio into a mobile-first, AI-driven architectural design tool. This spec covers sub-project 1 of 4: the mobile-first UI. (Sub-projects 2–4 — hyper-local zoning engine, generative AI photo overlay, high-fidelity 3D upgrade — get their own specs.)

## Goal

Give iOS/Android users (via the PWA) a touch-first studio experience: a guided first-run wizard that answers "is my lot feasible and what would it cost?" in under a minute, landing in a full-screen-scene studio with a draggable bottom sheet. Desktop browser users keep the existing full dashboard unchanged.

**Primary persona:** first-visit homeowner on a phone, curious about ADU feasibility.

## Decisions Made

| Decision | Choice |
|---|---|
| Mobile layout pattern | Full-screen 3D scene + draggable bottom sheet (Vaul) |
| First-run experience | 3-step wizard: address → ADU size → results teaser |
| Auth gate | Results teaser; rent shown rounded, cost/payback/zoning blurred until free sign-up unlocks live parcel data |
| Secondary sections | Inside the fully-expanded sheet as one continuous scroll (no tabs, no separate pages) |
| Desktop | Untouched; existing `AppShell` layout renders at `lg+` |
| Guest access | `/studio` page-level login redirect is removed; guests get the wizard + demo/estimated studio on any device. Live parcel data and saved scenarios remain auth-gated (enforced server-side) |
| Build approach | Parallel mobile composition — one state orchestrator, two layout trees |
| New dependency | `vaul` (Radix-based drawer with snap points) |

## Architecture

`FeasibilityStudio` remains the single state orchestrator (config, assumptions, URL hydration, saved scenarios, builder leads — all unchanged). It gains a viewport split at Tailwind's `lg` breakpoint via a `useMediaQuery` hook that renders **one tree or the other** — not CSS hiding. `ParcelScene` is a WebGL canvas; mounting two and hiding one would double GPU memory and break drag interactions.

```
FeasibilityStudio (state orchestrator — logic unchanged)
├── lg+        → AppShell + current desktop layout   (untouched)
└── below lg   → MobileStudio                        (new)
     ├── MobileHeader        — logo, address chip, overflow menu (account/reset)
     ├── ParcelScene         — reused, full-screen behind the sheet
     └── StudioSheet (Vaul)  — three snap points (peek / half / full)

WizardFlow (new, first-run overlay rendered above MobileStudio)
```

New components live in `components/studio/mobile/`. Leaf components are reused where they fit (`AddressSearch`, `MetricsSummary`, inspector control sections, panels); mobile-specific ones are added where they don't (`StudioSheet`, `WizardFlow`, `MobileHeader`).

## First-Run Wizard

Shows when **all** are true: no saved scenario, no URL-shared scenario, no prior-visit flag (localStorage). Desktop never sees it. Every step has "skip — explore the demo lot" (lands on the Seattle preset).

1. **Address.** Reuses `AddressSearch` (browser-safe Places autocomplete, no auth). Demo preset chips (Seattle / Portland / Austin) below. Selecting an address yields lat/lng + formatted address only — `/api/parcel` stays auth-gated, so the anonymous wizard builds an **estimated parcel**: the nearest demo preset by state/metro (falling back to the Seattle preset's lot dimensions) re-centered on the geocoded location, labeled "estimated."
2. **ADU size.** Three tappable cards — Studio 400 ft² / 1BR 600 ft² / 2BR 800 ft² — via existing `configForFootprint`. No sliders; fine-tuning belongs to the studio.
3. **Results teaser.** Feasibility engine runs on estimated parcel + chosen size. Rent shows rounded with "~"; build cost, payback, and zoning are blurred behind: *"Create a free account to unlock your exact numbers for {address}."* On auth success: live Regrid fetch replaces the estimated parcel, numbers refine, wizard dissolves into the studio at peek state with two one-time coach marks ("drag your ADU to place it" / "swipe up for controls").

## Studio Sheet

Vaul drawer with three snap points:

- **Peek (~120px, default):** three headline metrics (rent/mo, build cost, payback) + active config chips. Scene owns the screen: drag-to-place, pinch-zoom, orbit.
- **Half (~50%):** adds config controls (size slider, bed/bath steppers, finish, roof) — existing `FeasibilityInspector` sections restyled for touch, 44px minimum targets. Headline metrics stay pinned at the sheet top so every change shows its effect instantly.
- **Full:** scrollable page in journey order: controls → `MetricsSummary` (6 metrics) → `EstimateSummaryPanel` → `PermitGuidePanel` → `InspirationGalleryPanel` → `ReportPreview` (print/CSV/share) → builder lead CTA.

**Interaction rule:** at half or full, scene pointer events are disabled; the visible scene strip becomes a "tap to collapse" target. This prevents sheet drags from also rotating the camera.

## Data Flow

One new field on parcel state: `dataQuality: "estimated" | "live"`.

- Wizard writes an estimated parcel (regional defaults + geocoded location) through the existing `ParcelProvider`.
- After auth, the live Regrid fetch replaces it and `dataQuality` flips to `"live"`.
- An "estimated" badge renders wherever numbers appear while `dataQuality === "estimated"`.
- `calculateFeasibility`, metrics, and report are already pure functions of parcel + config — no engine changes.
- Wizard and studio share the existing `useParcel`/config state; no new stores. Scenario URLs and saved scenarios work on mobile unchanged.

## Error Handling

- **Geocoding/Places failure or no match** → inline message on step 1 ("We couldn't find that address — try a demo lot"), demo chips promoted. Never a dead end.
- **Live parcel fetch fails after auth** → keep estimated numbers + badge + retry affordance; studio remains fully functional (surfaces the existing `/api/parcel` fallback).
- **Auth cancel/failure at teaser** → stay on step 3; address and size survive in state; retry or skip.
- **Reduced motion** → sheet snaps without spring animation; coach marks render as static hints.
- **Tiny/landscape viewports** → peek enforces a minimum scene height; below it, the sheet defaults to half rather than overlapping the whole scene.

## Testing

- **Vitest:** wizard state machine (transitions, skip paths, show/hide rule), estimated-parcel builder, `dataQuality` flip on live fetch, media-query tree selection.
- **Playwright (mobile viewport project, iPhone-class emulation):** golden path — wizard address → size → teaser → skip → studio shows scene + peek sheet; expand to half, slider change updates pinned metrics; full-sheet scroll reaches the report section. One desktop regression spec asserts the `AppShell` layout is unchanged at `lg+`.
- **Existing suite:** all current unit tests stay green — desktop tree and `lib/` modules are unchanged, so failures indicate the split leaked.

## Out of Scope

- Hyper-local zoning/ordinance/utility data (sub-project 2)
- Generative AI photo overlay (sub-project 3)
- 3D engine precision upgrades (sub-project 4)
- Native app store packaging changes (PWA scaffolding already landed separately)
- Desktop layout changes of any kind
