> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Studio "Field Book" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the studio's two overlapping navigation systems (5-item sidebar + 3-item tab bar) with one ordered "field book" of four plates — The Lot, The Build, The Return, The Record — fronted by a persistent income rail, removing the duplicated rent/zoning figures and the readiness score.

**Architecture:** Add a small plate model (`lib/studio-plates.ts`), two new shell pieces (`IncomeRail`, `FieldBookIndex`), and one new money component (`ReturnLedger`). Re-route `FeasibilityStudio`'s existing panels into four plates instead of `activeNav` + `studioTab`. Reuse existing panels nearly verbatim: Lot ≈ scene + `ConstraintsPanel`, Build ≈ scene + `FeasibilityInspector` + inspiration, Return = `ReturnLedger` + `EstimateSummaryPanel`, Record = `ReportPreview` certificate + `PermitGuidePanel` + `BuilderLeadPanel`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), Tailwind CSS 4 (`@theme` tokens), Vitest + Testing Library + userEvent, Playwright. Source of design truth: `DESIGN.md` and `docs/superpowers/specs/2026-06-29-studio-field-book-redesign-design.md`.

## Global Constraints

- Visual tokens are FROZEN. Use only the existing `--color-lf-*` tokens / `lf-*` Tailwind utilities; introduce no new colors, fonts, or radii. DESIGN.md governs.
- Fonts by role: Cormorant Garamond (`font-display`) for dollar figures + headlines, Libre Franklin (`font-sans`) for UI/body, IBM Plex Mono (`font-mono`) for recorded facts/eyebrows/labels.
- Forest (`lf-forest` / `lf-money-on-dark`) means money/eligible/primary-CTA ONLY. Clay is the interactive accent + focus ring. Amber = review (`lf-amber-ink` on light, `lf-amber-on-dark` on dark). Brick = blockers.
- Status is never encoded by color alone — always glyph + label.
- `font-variant-numeric: tabular-nums` on every numeric figure.
- Pill-radius system (2026-06-27): clickable controls/CTAs/search use `rounded-full`; read-only data chips/frames use `rounded-lg`/`rounded-md`; circular indicators get equal explicit width/height.
- Motion: prefer CSS `motion-safe:` variants; everything respects `prefers-reduced-motion` (global rule already neutralizes animation/transition durations under reduce). No spring/overshoot.
- A11y floor: visible clay focus ring on all interactive elements; responsive to mobile; keyboard operable.
- Release gate for the final task: `npm run lint && npm run test && npx tsc --noEmit && npm run build`; plus `npm run test:e2e` for the UI flows.
- Commit style: Conventional Commits (`feat(studio): …`, `refactor(studio): …`, `test(studio): …`). Commit from the repo worktree, branch off `master` first.

---

## File Structure

**Create:**
- `lib/studio-plates.ts` — plate model: `StudioPlate` union, `PLATES` metadata, `PlateTick`, `verdictTick`, `derivePlateStatuses`.
- `lib/studio-plates.test.ts`
- `components/studio/IncomeRail.tsx` — persistent espresso income rail (replaces the money half of `FeasibilityVerdictBand`).
- `components/studio/IncomeRail.test.tsx`
- `components/studio/FieldBookIndex.tsx` — the signature: subject header + four numbered plates + monument marker (replaces sidebar `navItems` and `StudioTabBar`).
- `components/studio/FieldBookIndex.test.tsx`
- `components/studio/ReturnLedger.tsx` — the T-account money ledger for Plate III (replaces the six-cell `MetricsSummary` on the money view).
- `components/studio/ReturnLedger.test.tsx`

**Modify:**
- `components/studio/AppShell.tsx` — render `FieldBookIndex` for desktop nav; switch mobile bottom-nav to the four plates; plate-based props.
- `components/FeasibilityStudio.tsx` — replace `activeNav`/`studioTab` with `activePlate`; mount `IncomeRail`; route the four plates to existing panels; drop `FeasibilityVerdictBand` + `StudioTabBar`; remove readiness.
- `components/FeasibilityStudio.test.tsx` — rewrite assertions for the four-plate IA.

**Retire (becomes unused — delete after wiring, per "remove dead code from your own change"):**
- `components/studio/StudioTabBar.tsx`
- `components/studio/FeasibilityVerdictBand.tsx` (the income rail + the Return plate header supersede it)

**Flag (do not edit blind):** `e2e/*.spec.ts` that assert old nav labels ("Permit Guide", "Estimate Summary", "Feasibility Studio" heading, `tab` roles). Task 7 updates these against the running app.

---

### Task 1: Plate model (`lib/studio-plates.ts`)

Pure, dependency-light module so the index, rail, and orchestrator share one source of truth for plate identity and per-plate status.

**Files:**
- Create: `lib/studio-plates.ts`
- Test: `lib/studio-plates.test.ts`

**Interfaces:**
- Consumes: `VerdictLevel` from `@/lib/feasibility-verdict`.
- Produces:
  - `type StudioPlate = "lot" | "build" | "return" | "record"`
  - `interface PlateMeta { id: StudioPlate; numeral: "I"|"II"|"III"|"IV"; title: string; job: string; optional?: boolean }`
  - `const PLATES: PlateMeta[]` (length 4, in order lot→build→return→record)
  - `type PlateTick = "eligible" | "review" | "unlikely" | "pending" | "ready"`
  - `function verdictTick(verdict: VerdictLevel): PlateTick`
  - `function derivePlateStatuses(input: { verdict: VerdictLevel; hasBuild: boolean; reportReady: boolean }): Record<StudioPlate, PlateTick>`

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio-plates.test.ts
import { describe, expect, it } from "vitest";
import {
  PLATES,
  verdictTick,
  derivePlateStatuses,
  type StudioPlate,
} from "./studio-plates";

describe("studio-plates", () => {
  it("declares the four plates in survey order", () => {
    expect(PLATES.map((p) => p.id)).toEqual<StudioPlate[]>([
      "lot",
      "build",
      "return",
      "record",
    ]);
    expect(PLATES.map((p) => p.numeral)).toEqual(["I", "II", "III", "IV"]);
    expect(PLATES.find((p) => p.id === "build")?.optional).toBe(true);
  });

  it("maps a verdict to a plate tick", () => {
    expect(verdictTick("Likely Feasible")).toBe("eligible");
    expect(verdictTick("Needs Review")).toBe("review");
    expect(verdictTick("Unlikely")).toBe("unlikely");
  });

  it("derives per-plate status from verdict and progress", () => {
    const s = derivePlateStatuses({
      verdict: "Likely Feasible",
      hasBuild: false,
      reportReady: true,
    });
    expect(s.lot).toBe("eligible");
    expect(s.return).toBe("eligible");
    expect(s.build).toBe("pending"); // optional, not yet configured
    expect(s.record).toBe("ready");
  });

  it("marks build eligible once a build is configured", () => {
    const s = derivePlateStatuses({
      verdict: "Needs Review",
      hasBuild: true,
      reportReady: false,
    });
    expect(s.build).toBe("eligible");
    expect(s.lot).toBe("review");
    expect(s.record).toBe("pending");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- studio-plates`
Expected: FAIL — `Cannot find module './studio-plates'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio-plates.ts
import type { VerdictLevel } from "@/lib/feasibility-verdict";

/** The four plates of the studio "field book", in survey order. */
export type StudioPlate = "lot" | "build" | "return" | "record";

export interface PlateMeta {
  id: StudioPlate;
  numeral: "I" | "II" | "III" | "IV";
  /** Plate name, e.g. "The Lot". */
  title: string;
  /** One-line job, e.g. "what you own". */
  job: string;
  /** Build is reachable but never required for a verdict. */
  optional?: boolean;
}

export const PLATES: PlateMeta[] = [
  { id: "lot", numeral: "I", title: "The Lot", job: "what you own" },
  { id: "build", numeral: "II", title: "The Build", job: "what could stand here", optional: true },
  { id: "return", numeral: "III", title: "The Return", job: "what it earns" },
  { id: "record", numeral: "IV", title: "The Record", job: "make it real" },
];

/** Status glyph state for a plate's index entry. */
export type PlateTick = "eligible" | "review" | "unlikely" | "pending" | "ready";

export function verdictTick(verdict: VerdictLevel): PlateTick {
  if (verdict === "Likely Feasible") return "eligible";
  if (verdict === "Unlikely") return "unlikely";
  return "review";
}

/**
 * Per-plate status. The Lot and The Return reflect the feasibility verdict
 * (eligibility vs. money, same underlying signal). The Build is optional —
 * "pending" until the user shapes a building. The Record is "ready" once a
 * report can be recorded, else "pending".
 */
export function derivePlateStatuses(input: {
  verdict: VerdictLevel;
  hasBuild: boolean;
  reportReady: boolean;
}): Record<StudioPlate, PlateTick> {
  const tick = verdictTick(input.verdict);
  return {
    lot: tick,
    build: input.hasBuild ? "eligible" : "pending",
    return: tick,
    record: input.reportReady ? "ready" : "pending",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- studio-plates`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/studio-plates.ts lib/studio-plates.test.ts
git commit -m "feat(studio): add field-book plate model"
```

---

### Task 2: IncomeRail (`components/studio/IncomeRail.tsx`)

A thin persistent espresso strip carrying the asset value on every plate — replaces the money figure currently duplicated between `FeasibilityVerdictBand` and `MetricsSummary`.

**Files:**
- Create: `components/studio/IncomeRail.tsx`
- Test: `components/studio/IncomeRail.test.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from `@/lib/feasibility`; `verdictTone` + `VerdictLevel` from `@/lib/feasibility-verdict`; `useCountUp` from `./use-count-up`.
- Produces: `default function IncomeRail(props: { monthlyRent: number; verdict: VerdictLevel })`. Root carries `data-testid="income-rail"`; the figure carries `data-income-figure="true"`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/studio/IncomeRail.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IncomeRail from "./IncomeRail";

describe("IncomeRail", () => {
  beforeEach(() => {
    // Reduced motion => useCountUp snaps to final value synchronously.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  it("shows the monthly income figure and the verdict", () => {
    render(<IncomeRail monthlyRent={2100} verdict="Likely Feasible" />);
    const rail = screen.getByTestId("income-rail");
    expect(rail).toHaveTextContent("$2,100");
    expect(rail).toHaveTextContent("/mo");
    expect(rail).toHaveTextContent(/If built/i);
    expect(rail).toHaveTextContent("Likely Feasible");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- IncomeRail`
Expected: FAIL — cannot resolve `./IncomeRail`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/studio/IncomeRail.tsx
"use client";

/**
 * IncomeRail — the field book's running header. A slim espresso strip that
 * keeps the asset value ("If built $X,XXX/mo") present on every plate, with a
 * compact verdict pill on the right. The full verdict lives on The Return, so
 * it is never printed twice. The figure animates via the shared count-up hook.
 */

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/feasibility";
import { verdictTone, type VerdictLevel } from "@/lib/feasibility-verdict";
import { useCountUp } from "./use-count-up";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

export interface IncomeRailProps {
  monthlyRent: number;
  verdict: VerdictLevel;
}

export default function IncomeRail({ monthlyRent, verdict }: IncomeRailProps) {
  const rent = useCountUp(monthlyRent);
  const tone = verdictTone(verdict);
  const Icon = VERDICT_ICON[verdict];

  return (
    <div
      data-testid="income-rail"
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-lf-espresso px-7 py-2.5 text-lf-sand"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-lf-taupe">
          If built
        </span>
        <span
          data-income-figure="true"
          className="font-display text-[28px] font-semibold leading-none tabular-nums text-lf-money-on-dark"
        >
          {formatCurrency(rent)}
          <span className="ml-1 font-mono text-xs text-lf-taupe">/mo</span>
        </span>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ backgroundColor: tone.soft, color: tone.onDark }}
      >
        <Icon size={13} />
        {verdict}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- IncomeRail`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/studio/IncomeRail.tsx components/studio/IncomeRail.test.tsx
git commit -m "feat(studio): add persistent income rail"
```

---

### Task 3: FieldBookIndex (`components/studio/FieldBookIndex.tsx`)

The signature element: the studio's navigation rendered as a surveyor's field-book contents page — a "SURVEY OF" subject header and four numbered plates, each with a status tick, plus a sliding "you are here" monument marker.

**Files:**
- Create: `components/studio/FieldBookIndex.tsx`
- Test: `components/studio/FieldBookIndex.test.tsx`

**Interfaces:**
- Consumes: `PLATES`, `StudioPlate`, `PlateTick` from `@/lib/studio-plates`.
- Produces: `default function FieldBookIndex(props: FieldBookIndexProps)` where
  ```ts
  interface FieldBookIndexProps {
    active: StudioPlate;
    onNavigate: (plate: StudioPlate) => void;
    statuses: Record<StudioPlate, PlateTick>;
    subject: { address: string; apn?: string; zone?: string };
  }
  ```
  Renders a `<nav aria-label="Survey plates">`; the active plate button carries `aria-current="page"`. Status ticks expose an accessible label (`title` + visually-hidden text), never color alone.

- [ ] **Step 1: Write the failing test**

```tsx
// components/studio/FieldBookIndex.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldBookIndex from "./FieldBookIndex";

const statuses = {
  lot: "eligible",
  build: "pending",
  return: "eligible",
  record: "ready",
} as const;

describe("FieldBookIndex", () => {
  it("lists the four plates with the subject and marks the active one", () => {
    render(
      <FieldBookIndex
        active="lot"
        onNavigate={() => {}}
        statuses={statuses}
        subject={{ address: "1411 Elm St", apn: "061-244-018", zone: "R-1" }}
      />,
    );
    expect(screen.getByText("1411 Elm St")).toBeInTheDocument();
    expect(screen.getByText(/061-244-018/)).toBeInTheDocument();
    for (const name of ["The Lot", "The Build", "The Return", "The Record"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /The Lot/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigates when a plate is chosen", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldBookIndex
        active="lot"
        onNavigate={onNavigate}
        statuses={statuses}
        subject={{ address: "1411 Elm St" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /The Return/ }));
    expect(onNavigate).toHaveBeenCalledWith("return");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- FieldBookIndex`
Expected: FAIL — cannot resolve `./FieldBookIndex`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/studio/FieldBookIndex.tsx
"use client";

/**
 * FieldBookIndex — the studio's single navigation, drawn as a surveyor's field
 * book contents page. A "SURVEY OF" subject header sits above four numbered
 * plates; the active plate carries a sliding monument marker and aria-current.
 * Replaces the old 5-item sidebar nav AND the 3-item StudioTabBar.
 */

import { PLATES, type PlateTick, type StudioPlate } from "@/lib/studio-plates";

const TICK_META: Record<PlateTick, { glyph: string; label: string; className: string }> = {
  eligible: { glyph: "✓", label: "eligible", className: "text-lf-money-on-dark" },
  review: { glyph: "△", label: "review", className: "text-lf-amber-on-dark" },
  unlikely: { glyph: "✕", label: "unlikely", className: "text-lf-brick" },
  pending: { glyph: "·", label: "not started", className: "text-lf-taupe/60" },
  ready: { glyph: "◦", label: "ready to record", className: "text-lf-money-on-dark" },
};

export interface FieldBookIndexProps {
  active: StudioPlate;
  onNavigate: (plate: StudioPlate) => void;
  statuses: Record<StudioPlate, PlateTick>;
  subject: { address: string; apn?: string; zone?: string };
}

export default function FieldBookIndex({
  active,
  onNavigate,
  statuses,
  subject,
}: FieldBookIndexProps) {
  return (
    <div>
      <div className="px-2 pb-4">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-lf-taupe">
          Survey of
        </p>
        <p className="mt-1 truncate font-display text-base font-semibold text-lf-sand">
          {subject.address}
        </p>
        {(subject.apn || subject.zone) && (
          <p className="mt-0.5 font-mono text-[10px] text-lf-taupe">
            {subject.apn ? `⌖ APN ${subject.apn}` : ""}
            {subject.apn && subject.zone ? " · " : ""}
            {subject.zone ?? ""}
          </p>
        )}
      </div>

      <nav aria-label="Survey plates" className="space-y-0.5 border-t border-white/10 pt-2">
        {PLATES.map((plate) => {
          const isActive = active === plate.id;
          const tick = TICK_META[statuses[plate.id]];
          return (
            <button
              key={plate.id}
              type="button"
              onClick={() => onNavigate(plate.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset ${
                isActive ? "bg-lf-espresso/45 ring-1 ring-lf-taupe/20" : "hover:bg-white/5"
              }`}
            >
              {/* Sliding monument marker — the "you are here" gesture. */}
              <span
                aria-hidden
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-lf-clay transition-opacity motion-safe:transition-all ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`w-6 shrink-0 font-mono text-[11px] font-semibold tracking-widest ${
                  isActive ? "text-lf-sand" : "text-lf-taupe"
                }`}
              >
                {plate.numeral}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${isActive ? "text-lf-sand" : "text-lf-taupe"}`}
                >
                  {plate.title}
                  {plate.optional && (
                    <span className="ml-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-lf-taupe/70">
                      optional
                    </span>
                  )}
                </span>
              </span>
              <span className={`shrink-0 font-mono text-xs ${tick.className}`} title={tick.label}>
                {tick.glyph}
                <span className="sr-only"> {tick.label}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- FieldBookIndex`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/studio/FieldBookIndex.tsx components/studio/FieldBookIndex.test.tsx
git commit -m "feat(studio): add field-book index navigation"
```

---

### Task 4: Wire the spine — AppShell + FeasibilityStudio route four plates

The integration task. Swaps the dual nav for the four plates, mounts `IncomeRail`, and retires `StudioTabBar` + `FeasibilityVerdictBand`. After this task the app runs on the new IA; the Return ledger (Task 5) and mobile polish (Task 6) refine it.

**Files:**
- Modify: `components/studio/AppShell.tsx`
- Modify: `components/FeasibilityStudio.tsx`
- Modify: `components/FeasibilityStudio.test.tsx`
- Delete: `components/studio/StudioTabBar.tsx`, `components/studio/FeasibilityVerdictBand.tsx`

**Interfaces:**
- `AppShell` new props (replacing `activeNav: string` / `onNavigate: (id: string) => void` / `navItems` usage):
  ```ts
  activePlate: StudioPlate;
  onNavigatePlate: (plate: StudioPlate) => void;
  plateStatuses: Record<StudioPlate, PlateTick>;
  subject: { address: string; apn?: string; zone?: string };
  ```
  (Keep existing `parcelAddress`/`parcelCity`/`onReset`/`onChangeAddress`/saved-scenario props/account block unchanged.)
- `FeasibilityStudioInner` replaces `activeNav` + `studioTab` state with `const [activePlate, setActivePlate] = useState<StudioPlate>("lot")`.

- [ ] **Step 1: Update the orchestrator test to the four-plate IA (write the failing test first)**

Replace the body of `components/FeasibilityStudio.test.tsx`'s `describe` block's tests with assertions for plates. Keep the `beforeEach`/`afterEach`/mocks/`TestWrapper` exactly as they are. New tests:

```tsx
  it("opens on The Lot plate with the income rail and constraints", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(screen.getByTestId("income-rail")).toHaveTextContent("/mo");
    expect(screen.getByRole("button", { name: /The Lot/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "What this lot allows" })).toBeInTheDocument();
  });

  it("navigates to The Build plate and exposes massing controls", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await user.click(screen.getByRole("button", { name: /The Build/ }));
    expect(screen.getByRole("combobox", { name: "Sample Property" })).toBeInTheDocument();
    expect(screen.getByText("ADU fit")).toBeInTheDocument();
  });

  it("navigates to The Record plate and can create the certificate report", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await user.click(screen.getByRole("button", { name: /The Record/ }));
    await user.click(screen.getByRole("button", { name: /Create report/i }));
    expect(screen.getByText(/recorded concept for this lot/i)).toBeInTheDocument();
  });

  it("does not render the retired readiness score", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(screen.queryByText("Readiness")).not.toBeInTheDocument();
  });
```

Delete the obsolete tests that asserted the old nav/tabs ("renders the verdict-led workflow…", "switches among feasibility, massing, and certificate surfaces", "routes every primary navigation item…", "opens the estimate summary from the navigation", "opens the certificate tab without also opening the report preview", "marks the lead money figures…"). Keep the two engine-behavior tests ("flags review needed…", "updates the rental estimate…") but update their navigation step from `getByRole("tab", { name: /Massing/i })` to `getByRole("button", { name: /The Build/ })`, and the "Market" test's path to The Build plate.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- FeasibilityStudio`
Expected: FAIL — `income-rail` not found / `The Lot` button not found (old shell still rendered).

- [ ] **Step 3: Rewrite AppShell's desktop nav + mobile nav to plates**

In `components/studio/AppShell.tsx`:
1. Replace the import block's `navItems`/`NavItem` usage. Remove the exported `navItems` array. Add:
   ```tsx
   import FieldBookIndex from "./FieldBookIndex";
   import { PLATES, type PlateTick, type StudioPlate } from "@/lib/studio-plates";
   ```
2. Change `AppShellProps`: remove `activeNav`/`onNavigate`; add the four interface props listed above (`activePlate`, `onNavigatePlate`, `plateStatuses`, `subject`).
3. Replace the desktop `<nav aria-label="Primary"> … {navItems.map(...)} </nav>` block with:
   ```tsx
   <div className="mt-6">
     <FieldBookIndex
       active={activePlate}
       onNavigate={onNavigatePlate}
       statuses={plateStatuses}
       subject={subject}
     />
   </div>
   ```
4. Replace the mobile bottom `<nav aria-label="Mobile navigation"> … {navItems.map(...)} </nav>` with a four-plate version (icons may be the Roman numerals or reuse `PLATES`):
   ```tsx
   {PLATES.map((plate) => {
     const isActive = activePlate === plate.id;
     return (
       <button
         key={plate.id}
         type="button"
         onClick={() => onNavigatePlate(plate.id)}
         aria-current={isActive ? "page" : undefined}
         className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset"
       >
         <span className={`font-mono text-[11px] font-semibold tracking-widest ${isActive ? "text-lf-mahogany" : "text-lf-muted"}`}>
           {plate.numeral}
         </span>
         <span className={`truncate text-[10px] font-semibold ${isActive ? "text-lf-mahogany" : "text-lf-muted"}`}>
           {plate.title}
         </span>
       </button>
     );
   })}
   ```

- [ ] **Step 4: Re-route FeasibilityStudio to plates + mount IncomeRail**

In `components/FeasibilityStudio.tsx` (desktop `return` branch — the `if (!isDesktop)` mobile branch is refined in Task 6):
1. Imports: remove `FeasibilityVerdictBand` and `StudioTabBar`/`StudioTab`; add
   ```tsx
   import IncomeRail from "./studio/IncomeRail";
   import { derivePlateStatuses, type StudioPlate } from "@/lib/studio-plates";
   import { summarizeFeasibility } from "@/lib/feasibility-verdict";
   ```
2. State: replace `const [activeNav, setActiveNav] = useState("studio")` and `const [studioTab, setStudioTab] = useState<StudioTab>("feasibility")` with
   ```tsx
   const [activePlate, setActivePlate] = useState<StudioPlate>("lot");
   const [hasBuild, setHasBuild] = useState(false);
   ```
   In `setConfig` call sites that come from user massing edits (the inspector / inspiration "apply"), also `setHasBuild(true)`. Wrap `handleChangeAddress`, `resetScenario`, `handleNavigate` to set `setActivePlate("lot")` / appropriate plate instead of `activeNav`/`studioTab`.
3. Derive status + subject near `result`:
   ```tsx
   const summary = summarizeFeasibility(activeParcel, result, config);
   const plateStatuses = derivePlateStatuses({
     verdict: summary.verdict,
     hasBuild,
     reportReady: true,
   });
   const subject = {
     address: activeParcel.address,
     apn: "apn" in activeParcel ? String((activeParcel as { apn?: string }).apn ?? "") || undefined : undefined,
     zone: "zoning" in activeParcel ? String((activeParcel as { zoning?: string }).zoning ?? "") || undefined : undefined,
   };
   ```
4. Replace the desktop `<AppShell … >` props (`activeNav`/`onNavigate`) with `activePlate`, `onNavigatePlate={setActivePlate}`, `plateStatuses`, `subject`. Keep the rest.
5. Replace the desktop children (the whole `activeNav === "guide" ? … : …` chain) with the income rail + a plate switch:
   ```tsx
   <div className="flex min-h-0 flex-1 flex-col">
     <h2 className="sr-only">Feasibility field book</h2>
     <IncomeRail monthlyRent={result.monthlyRent} verdict={summary.verdict} />

     {activePlate === "lot" && (
       <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
         <SceneSection sceneNode={sceneNode} />
         <ConstraintsPanel
           parcel={activeParcel}
           result={result}
           config={config}
           assumptions={assumptions}
           onAssumptionsChange={setAssumptions}
           onViewCertificate={() => setActivePlate("record")}
           addressFocusSignal={addressFocusSignal}
         />
       </div>
     )}

     {activePlate === "build" && (
       <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
         <SceneSection sceneNode={sceneNode} />
         <FeasibilityInspector
           parcelId={parcelId}
           config={config}
           assumptions={assumptions}
           result={result}
           onParcelChange={setParcelId}
           onConfigChange={(c) => { setConfig(c); setHasBuild(true); }}
           onAssumptionsChange={setAssumptions}
           onReset={resetScenario}
           onGenerateReport={() => { setReportOpen(true); setReportAutoFocus(true); setActivePlate("record"); }}
           onSaveScenario={handleSaveScenario}
           savingScenario={savingScenario}
           saveNotice={saveNotice}
         />
       </div>
     )}

     {activePlate === "return" && (
       <EstimateSummaryPanel
         parcelName={parcelName}
         result={result}
         onGenerateReport={() => { setReportOpen(true); setReportAutoFocus(true); setActivePlate("record"); }}
       />
     )}

     {activePlate === "record" && (
       <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
         <EstimateSummaryPanel
           parcelName={parcelName}
           result={result}
           onGenerateReport={handleGenerateReport}
         />
         <PermitGuidePanel address={parcelName} />
       </div>
     )}
   </div>
   ```
6. Keep `MetricsSummary` mounted under the Lot/Build/Return plates for now (Task 5 replaces it on Return). Change the `showMetrics` guard to: `const showMetrics = activePlate !== "record";`
7. Keep the `ReportPreview`, `BuilderLeadPanel`, `BeforeAfterBoard` overlays unchanged at the bottom of the shell.
8. Update `handleNavigate`/`handleGenerateReport`/`handleChangeAddress`/`resetScenario` to use `setActivePlate` (`export` → record plate; change-address → lot).

- [ ] **Step 5: Delete the retired components**

```bash
git rm components/studio/StudioTabBar.tsx components/studio/FeasibilityVerdictBand.tsx
```
Then remove any remaining imports of them (only `FeasibilityStudio.tsx` referenced them).

- [ ] **Step 6: Run the studio tests + typecheck**

Run: `npm run test -- FeasibilityStudio && npx tsc --noEmit`
Expected: PASS (4 new + 2 updated engine tests) and zero type errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(studio): route four field-book plates with income rail"
```

---

### Task 5: ReturnLedger (`components/studio/ReturnLedger.tsx`) — the money plate

Replace the six-cell `MetricsSummary` on The Return with the engraved ledger T-account (DESIGN.md signature risk #1: use the ledger, not charts, for the money story).

**Files:**
- Create: `components/studio/ReturnLedger.tsx`
- Test: `components/studio/ReturnLedger.test.tsx`
- Modify: `components/FeasibilityStudio.tsx` (render `ReturnLedger` at the top of the `activePlate === "return"` branch; drop the `MetricsSummary` strip on Return by tightening `showMetrics` to `activePlate === "lot" || activePlate === "build"`).

**Interfaces:**
- Consumes: `FeasibilityResult` from `@/lib/feasibility`; `formatCurrency`, `formatCompactCurrency` from `@/lib/feasibility`; `VerdictLevel` + `verdictTone` from `@/lib/feasibility-verdict`; `useCountUp`.
- Produces: `default function ReturnLedger(props: { result: FeasibilityResult; verdict: VerdictLevel })`. Root carries `data-testid="return-ledger"`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/studio/ReturnLedger.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReturnLedger from "./ReturnLedger";
import type { FeasibilityResult } from "@/lib/feasibility";

const result = {
  monthlyRent: 2100,
  annualNoi: 20160,
  costLow: 250000,
  costHigh: 400000,
  costPerSqftLow: 312,
  costPerSqftHigh: 520,
  paybackYears: 11,
  coveragePercent: 18,
  maxCoveragePercent: 40,
  remainingCapacity: 1200,
  aduSqft: 600,
  zoningStatus: "Compliant",
} as unknown as FeasibilityResult;

describe("ReturnLedger", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  it("renders income, costs, NOI and payback as a ledger", () => {
    render(<ReturnLedger result={result} verdict="Likely Feasible" />);
    const ledger = screen.getByTestId("return-ledger");
    expect(ledger).toHaveTextContent("Income");
    expect(ledger).toHaveTextContent("Costs");
    expect(ledger).toHaveTextContent("$2,100");
    expect(ledger).toHaveTextContent("$20,160");
    expect(ledger).toHaveTextContent(/11\s*yrs?/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- ReturnLedger`
Expected: FAIL — cannot resolve `./ReturnLedger`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/studio/ReturnLedger.tsx
"use client";

/**
 * ReturnLedger — the money story as an engraved T-account (DESIGN.md: use the
 * ledger, not charts). Income on the left, costs on the right, NOI double-
 * underlined, payback to the side. Replaces the six-cell metrics strip on
 * The Return plate.
 */

import {
  formatCompactCurrency,
  formatCurrency,
  type FeasibilityResult,
} from "@/lib/feasibility";
import { verdictTone, type VerdictLevel } from "@/lib/feasibility-verdict";
import { useCountUp } from "./use-count-up";

export interface ReturnLedgerProps {
  result: FeasibilityResult;
  verdict: VerdictLevel;
}

export default function ReturnLedger({ result, verdict }: ReturnLedgerProps) {
  const rent = useCountUp(result.monthlyRent);
  const noi = useCountUp(result.annualNoi);
  const tone = verdictTone(verdict);
  const grossYear = result.monthlyRent * 12;
  const opYear = Math.max(0, grossYear - result.annualNoi);

  return (
    <section
      data-testid="return-ledger"
      aria-label="Ledger of feasibility"
      className="lf-entrance border-b border-lf-hairline bg-lf-card px-7 py-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-lf-muted">
            What it earns
          </p>
          <p className="mt-1 font-display text-[44px] font-semibold leading-none tabular-nums text-lf-espresso">
            {formatCurrency(rent)}
            <span className="ml-1 font-mono text-sm text-lf-muted">/mo</span>
          </p>
          <span aria-hidden className="mt-1.5 block h-px w-12 bg-lf-amber" />
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: tone.soft, color: tone.color }}
        >
          {verdict}
        </span>
      </div>

      <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-lf-muted">
        Ledger of feasibility
      </p>
      <div className="mt-2 grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
        <LedgerColumn
          heading="Income"
          rows={[
            ["Rent", `${formatCurrency(result.monthlyRent)}/mo`],
            ["Gross / yr", formatCurrency(grossYear)],
          ]}
        />
        <LedgerColumn
          heading="Costs"
          rows={[
            ["Build", `${formatCompactCurrency(result.costLow)}–${formatCompactCurrency(result.costHigh)}`],
            ["Operating / yr", formatCurrency(opYear)],
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t-[3px] border-double border-lf-espresso pt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lf-muted">
          NOI / yr
          <span className="ml-3 font-display text-2xl font-semibold tabular-nums text-lf-forest">
            {formatCurrency(noi)}
          </span>
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lf-muted">
          Payback
          <span className="ml-2 font-display text-2xl font-semibold tabular-nums text-lf-espresso">
            {result.paybackYears} yrs
          </span>
        </p>
      </div>

      <p className="mt-3 font-mono text-[11px] text-lf-muted">
        Build ${result.costPerSqftLow}–${result.costPerSqftHigh}/sf · coverage{" "}
        {Math.round(result.coveragePercent)}/{result.maxCoveragePercent}% · estimate, not an appraisal
      </p>
    </section>
  );
}

function LedgerColumn({ heading, rows }: { heading: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="border-b border-lf-hairline pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lf-clay">
        {heading}
      </p>
      <dl className="mt-1.5 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] text-lf-espresso">{k}</dt>
            <dd className="font-mono text-[13px] tabular-nums text-lf-espresso">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- ReturnLedger`
Expected: PASS.

- [ ] **Step 5: Mount it on The Return and drop the metrics strip there**

In `components/FeasibilityStudio.tsx`: in the `activePlate === "return"` branch, render `<ReturnLedger result={result} verdict={summary.verdict} />` above `EstimateSummaryPanel`. Change `showMetrics` to `const showMetrics = activePlate === "lot" || activePlate === "build";`. Add `import ReturnLedger from "./studio/ReturnLedger";`.

- [ ] **Step 6: Run the studio tests**

Run: `npm run test -- FeasibilityStudio ReturnLedger && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(studio): add return ledger to the money plate"
```

---

### Task 6: Mobile plates + income rail in the peek

Bring the four-plate model to the mobile studio: the bottom nav is already plate-based (Task 4 / AppShell), so this wires the income rail into the mobile peek and routes the mobile body by `activePlate`.

**Files:**
- Modify: `components/FeasibilityStudio.tsx` (the `if (!isDesktop)` branch)
- Modify: `components/studio/mobile/PeekMetrics.tsx` (render `IncomeRail` at the top of the peek)
- Test: `components/studio/mobile/PeekMetrics.test.tsx` (extend)

**Interfaces:**
- `PeekMetrics` gains props `monthlyRent: number; verdict: VerdictLevel` (passed through from the orchestrator), or accepts an optional `rail?: React.ReactNode` slot. Use the slot form to avoid importing verdict logic into the peek:
  ```ts
  interface PeekMetricsProps { /* existing */ rail?: React.ReactNode }
  ```

- [ ] **Step 1: Extend the PeekMetrics test (failing)**

```tsx
// add to components/studio/mobile/PeekMetrics.test.tsx
it("renders a provided rail slot above the metrics", () => {
  render(
    <PeekMetrics
      result={baseResult}
      config={baseConfig}
      rail={<div data-testid="peek-rail">rail</div>}
    />,
  );
  expect(screen.getByTestId("peek-rail")).toBeInTheDocument();
});
```
(Reuse the file's existing `baseResult`/`baseConfig` fixtures; if none, mirror the `ReturnLedger.test.tsx` result fixture.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- PeekMetrics`
Expected: FAIL — `rail` prop not rendered.

- [ ] **Step 3: Render the rail slot**

In `PeekMetrics.tsx`, add `rail?: React.ReactNode` to the props and render `{rail}` at the top of the returned markup (above the existing metrics row).

- [ ] **Step 4: Pass the income rail + route mobile body by plate**

In `FeasibilityStudio.tsx` mobile branch: pass `rail={<IncomeRail monthlyRent={result.monthlyRent} verdict={summary.verdict} />}` to `PeekMetrics`, and switch the `sections` content on `activePlate` (Lot → MetricsSummary + EstimateSummaryPanel; Build → InspirationGalleryPanel + inspector controls; Return → ReturnLedger; Record → PermitGuidePanel + report controls). Keep `MobileStudio`'s `controls`/`scene` slots; the existing bottom nav (AppShell) already drives `activePlate`.

- [ ] **Step 5: Run mobile tests + typecheck**

Run: `npm run test -- PeekMetrics MobileStudio && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(studio): bring field-book plates + income rail to mobile"
```

---

### Task 7: Motion, a11y, and the full gate

Finish the signature motion, keyboard support, and verify the whole change against the release gate + Playwright.

**Files:**
- Modify: `components/studio/FieldBookIndex.tsx` (arrow-key traversal across plates)
- Modify: `e2e/*.spec.ts` (only those that assert retired nav labels/roles — update against the running app)

- [ ] **Step 1: Add roving arrow-key navigation to the index (failing test)**

```tsx
// add to components/studio/FieldBookIndex.test.tsx
it("moves between plates with arrow keys", async () => {
  const onNavigate = vi.fn();
  const user = userEvent.setup();
  render(
    <FieldBookIndex active="lot" onNavigate={onNavigate} statuses={statuses}
      subject={{ address: "1411 Elm St" }} />,
  );
  screen.getByRole("button", { name: /The Lot/ }).focus();
  await user.keyboard("{ArrowDown}");
  expect(onNavigate).toHaveBeenCalledWith("build");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- FieldBookIndex`
Expected: FAIL — ArrowDown does not navigate.

- [ ] **Step 3: Implement arrow handling**

In `FieldBookIndex.tsx`, add an `onKeyDown` on each plate button that maps `ArrowDown`/`ArrowUp` to the next/previous plate id in `PLATES` and calls `onNavigate`:
```tsx
function move(dir: 1 | -1, current: StudioPlate) {
  const i = PLATES.findIndex((p) => p.id === current);
  const next = PLATES[(i + dir + PLATES.length) % PLATES.length];
  onNavigate(next.id);
}
// on the button: onKeyDown={(e) => {
//   if (e.key === "ArrowDown") { e.preventDefault(); move(1, plate.id); }
//   if (e.key === "ArrowUp") { e.preventDefault(); move(-1, plate.id); }
// }}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- FieldBookIndex`
Expected: PASS.

- [ ] **Step 5: Run the full release gate**

Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
Expected: lint clean (0 warnings), all unit tests pass, no type errors, build succeeds.

- [ ] **Step 6: Update + run E2E against the new IA**

Run: `npm run test:e2e`
For each failure caused by a retired label ("Permit Guide"/"Estimate Summary"/"Feasibility Studio" heading/`tab` role), update the selector to the plate equivalent (`The Lot`/`The Build`/`The Return`/`The Record`, `income-rail`, `return-ledger`). Re-run until green. Capture desktop + mobile screenshots of all four plates for the PR.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(studio): keyboard plate nav + field-book redesign verification"
```

---

## Self-Review

**Spec coverage:** Four plates (Tasks 4–6), field-book index + monument marker + status ticks (Task 3), persistent income rail (Task 2, mounted Tasks 4/6), ledger T-account replacing the six-cell strip (Task 5), readiness cut (Task 4 test asserts its absence), single nav system / no duplicated figures (Task 4 retires `StudioTabBar` + `FeasibilityVerdictBand`), mobile (Task 6), motion + a11y + gate (Task 7). Visual tokens untouched (Global Constraints). All spec sections map to a task.

**Placeholder scan:** No "TODO"/"handle edge cases"/"similar to". Task 4 and Task 6 show changed regions only by design (the orchestrator is 715 lines; unchanged code stays) but every changed region is given as real code or a named, typed prop change — no behavioral gaps.

**Type consistency:** `StudioPlate`, `PlateTick`, `derivePlateStatuses`, `verdictTick`, `PLATES` (Task 1) are used with identical names/signatures in Tasks 3–6. `IncomeRail({ monthlyRent, verdict })` and `ReturnLedger({ result, verdict })` signatures match every call site. `FieldBookIndexProps` matches the `AppShell` pass-through.

## Open questions (resolve at execution)

- **Default landing plate for a returning scenario** — plan defaults all sessions to `lot`; if arriving via a shared scenario URL you may prefer `return`. Decide in Task 4 Step 4.
- **`apn` field on parcels** — the subject header reads `apn`/`zoning` defensively (`"apn" in activeParcel`). Confirm the live-parcel field name in `lib/parcel-types.ts` during Task 4; fall back to omitting the APN line if absent.
- **`hasBuild` heuristic** — currently flips true on any inspector/inspiration config change. If you want it true only on a *meaningful* massing change, tighten in Task 4 Step 2.
