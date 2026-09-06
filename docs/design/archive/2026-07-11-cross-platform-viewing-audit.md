# LotFoundry — Cross-Platform Viewing Audit (Mobile · Desktop · iOS)

> Historical audit. This predates the 2026-07 mobile journey and references the
> retired `AppShell`, `MobileStudio`, `StudioSheet`, and `WizardFlow` paths.
> Preserve its findings as a record, but use `DESIGN.md`, `docs/AGENTS.md`, and
> `components/studio/mobile/journey/MobileJourney.tsx` for current behavior.

**Method:** Source-grounded review of every responsive surface. Live multi-breakpoint
screenshots were attempted via the preview harness but could not be captured — the preview
server dropped from tracking immediately after each start (two launch configs tried), while
the app itself served `200` on `localhost:3000`. Findings below cite `file:line` so they're
verifiable without the screenshots. Re-run with the preview tools once the harness is healthy
to confirm the visual severity of the HIGH items.

**Surfaces:** landing (`app/page.tsx`), auth (`components/auth/AuthLayout.tsx`, login/signup),
studio shell (`components/studio/AppShell.tsx`), studio body (`components/FeasibilityStudio.tsx`,
`FeasibilityInspector.tsx`, `ParcelScene.tsx`, `AerialView.tsx`, `MetricsSummary.tsx`,
`ReportPreview.tsx`).

---

## Severity summary

| # | Issue | Platforms | Severity |
|---|-------|-----------|----------|
| 1 | `IncomeLens` overlay covers most of the 3D scene | Mobile | **HIGH** |
| 2 | Studio goes side-by-side only at `xl` (1280px) | Small laptops / tablet landscape | **MED** |
| 3 | `min-h-screen` / `h-screen` instead of `dvh` on public + loading screens | iOS Safari | **MED** |
| 4 | 3D control hint hidden on mobile; no touch guidance | Mobile | **MED** |
| 5 | Live aerial mode has zero ADU interactivity | All | **MED** (product gap) |
| 6 | `ReportPreview` sheet uncapped height on mobile | Mobile | **LOW** |
| 7 | Aerial SVG labels use fixed px in a `slice`-cropped image | Mobile | **LOW** |

---

## 1. `IncomeLens` overlay dominates the 3D scene on mobile · **HIGH**

`FeasibilityStudio.tsx:300` — the income card is `absolute left-4 right-4 top-4` (full-width on
mobile, `sm:right-auto` only ≥640px) and stacks: a `text-4xl` rent figure, a `grid sm:grid-cols-3`
of three facts that collapse to **one column** below `sm` (so three stacked rows), plus a footnote.
On a 375×812 phone that card is ~240–300px tall.

The scene section it floats over is only `min-h-[360px]` (`FeasibilityStudio.tsx:244`). So on a
phone the card eclipses ~70–80% of the 3D view. It's `pointer-events-none`, so you can still
*touch* the ADU through it — but you can't **see** the building you're dragging. This is the single
biggest mobile viewing problem and it directly undercuts the "move the ADU" interaction the rest of
this work improves.

**Fix:** below `sm`, render a compact `IncomeLens` — rent figure + zoning badge only — and hide the
3-fact grid and footnote (move them into `MetricsSummary`, which already lives below the scene).
e.g. wrap the grid + note in `hidden sm:block`/`hidden sm:grid`.

## 2. Studio splits side-by-side only at `xl` (1280px) · **MED**

`FeasibilityStudio.tsx:241` — `flex flex-col … xl:flex-row`, with the inspector at
`xl:w-[404px]` (`FeasibilityInspector.tsx:80`). Between **1024–1279px** (13" laptops, half-screen
windows, tablet landscape) the scene and the full-width inspector **stack vertically**, forcing a
long scroll to reach the controls — even though there's plenty of horizontal room.

**Fix:** lower the split to `lg` — `lg:flex-row` on the wrapper and shift the inspector's
`xl:w-[404px] xl:border-l` to `lg:`. The shell already switches to its desktop sidebar at `lg`
(`AppShell.tsx:52`), so the body should match.

## 3. `100vh` units instead of `dvh` on iOS Safari · **MED**

The studio shell correctly uses `min-h-dvh` / `lg:h-dvh` (`AppShell.tsx:49,164`) — good. But three
entry surfaces still use static `screen`:
- `app/page.tsx:6` — landing `min-h-screen`
- `components/auth/AuthLayout.tsx:13` — auth `min-h-screen`
- `app/studio/page.tsx:20` — studio loading/redirect screen `h-screen`

On iOS Safari, `100vh` counts the area behind the dynamic toolbar, so these render slightly taller
than the visible viewport — the centered auth card and loading spinner sit a touch low and can
require a nudge-scroll; the landing footer hides under the URL bar on first paint.

**Fix:** `min-h-[100dvh]` / `h-[100dvh]` on those three. (Safe-area insets are already handled for
the mobile bottom nav at `AppShell.tsx:189` — good.)

## 4. 3D control hint is desktop-only; no touch guidance · **MED**

`ParcelScene.tsx:730` — the controls badge is `hidden … sm:flex`, so phone users see no hint at all.
And phones have no arrow keys, so on touch the **only** way to move the ADU is dragging it — which
users won't discover without a cue. (It's hidden on mobile partly because at `top-20` it would
collide with the `IncomeLens` card from #1 — fixing #1 frees this space.)

**Fix:** after #1, show a minimal mobile cue ("Drag the ADU to move it · pinch to zoom"). Anchor it
to the bottom of the scene (`bottom-5`) to avoid the income card entirely.

## 5. Live aerial mode has no ADU interactivity · **MED (product gap)**

`AerialView.tsx` (live/real-address mode) draws the ADU as a **static** SVG polygon fixed at the
rear of the lot (`aduRect`, lines 102–140) — no drag, no keyboard, no repositioning on any platform.
The interactive massing (drag + arrow keys) only exists in `ParcelScene.tsx` (demo/preset mode).
So when a user searches their actual address — the headline feature — they can't move the ADU at
all. Worth deciding whether parity is in scope; it's the gap most likely to read as "broken" to a
real user.

## 6. `ReportPreview` sheet uncapped on mobile · **LOW**

`ReportPreview.tsx:41` — `lg:max-h-[40vh] lg:overflow-y-auto`. The max-height + internal scroll only
apply at `lg`+. On mobile the report sheet can grow arbitrarily tall and push the page. Add a mobile
cap (e.g. `max-h-[70dvh] overflow-y-auto`).

## 7. Aerial overlay labels use fixed px in a cropped image · **LOW**

`AerialView.tsx` renders into a fixed `800×540` viewBox with `preserveAspectRatio="xMidYMid slice"`
(line 183). On a narrow phone the image is center-cropped, so the side setback label at `x={24}`
(line 260) and edge labels can clip off-screen. Low impact, but the `Side` label is the most exposed.

---

## What's already correct (keep)

- `min-h-dvh` / `h-dvh` in the studio shell (`AppShell.tsx:49,164`).
- Safe-area inset on the fixed mobile tab bar (`AppShell.tsx:189`).
- `viewport.themeColor` set for mobile browser chrome (`app/layout.tsx:64`).
- Landing + auth stack cleanly (`sm:grid-cols-2 lg:grid-cols-3`, `max-w-md px-4`) with no horizontal
  overflow.
- WebGL context-loss handling + 2D fallback (`ParcelScene.tsx` `handleCreated`, `Parcel2DScene`) —
  important on iOS Safari, which evicts WebGL contexts aggressively.
- `backdrop-blur` confined to fixed/overlay layers everywhere — no mobile repaint cost on scroll.

---

## Suggested order

1. **#1 IncomeLens mobile compaction** — biggest viewing win, unblocks #4.
2. **#2 lower studio split to `lg`** — one-line-ish layout change, helps every laptop.
3. **#3 `dvh` on the three entry screens** — trivial, iOS polish.
4. **#4 mobile touch hint**, **#6 sheet cap**, **#7 label clamp** — small follow-ups.
5. **#5 live-mode interactivity** — larger, decide scope separately.
