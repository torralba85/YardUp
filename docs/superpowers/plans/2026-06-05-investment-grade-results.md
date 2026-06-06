# Investment-Grade Results Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commit policy note:** This repo's environment rule is "commit only when the user asks." Commit steps are included per TDD convention, but **do not run them without the user's go-ahead** — stage and pause, or batch the commit at the user's request.

**Goal:** Re-skin the Feasibility Studio results surface (`MetricsSummary` strip + `IncomeLens` overlay) into a premium "Private-Bank Ledger" readout — serif display numerals, a gold-leaf amber value hairline, two-tier hierarchy, and a reduced-motion-safe count-up on the lead money figures — with zero data or layout changes.

**Architecture:** Pure presentation. A small standalone `useCountUp` hook (rAF-based, defensive about SSR/jsdom/reduced-motion) animates the two lead figures. `MetricsSummary` is re-tiered into a lead band (Rent, NOI) + supporting band. `IncomeLens` is re-skinned to match. All props, data, ids, and grid contracts preserved.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (theme tokens in `app/globals.css`), Vitest + Testing Library, Cormorant Garamond (`font-display`) / Libre Franklin (`font-sans`).

---

### Task 1: `useCountUp` hook

A rAF-driven count-up that snaps to the final value under SSR, missing `matchMedia` (jsdom), reduced-motion, or missing rAF — and tweens otherwise, retargeting cleanly mid-flight. Snapping under missing `matchMedia` is what keeps the existing `FeasibilityStudio.test.tsx` deterministic.

**Files:**
- Create: `components/studio/use-count-up.ts`
- Test: `components/studio/use-count-up.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/studio/use-count-up.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useCountUp } from "./use-count-up";

function Probe({ value }: { value: number }) {
  const display = useCountUp(value);
  return <span data-testid="out">{Math.round(display)}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // @ts-expect-error allow clearing the stub between tests
  delete window.matchMedia;
});

describe("useCountUp", () => {
  it("renders the final value immediately when matchMedia is unavailable (jsdom default)", () => {
    render(<Probe value={1234} />);
    expect(screen.getByTestId("out")).toHaveTextContent("1234");
  });

  it("snaps to the final value when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { rerender } = render(<Probe value={100} />);
    rerender(<Probe value={900} />);
    expect(screen.getByTestId("out")).toHaveTextContent("900");
  });

  it("settles on the final value when motion is allowed", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    let now = 0;
    vi.stubGlobal("performance", { now: () => now });
    const cbs: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cbs.push(cb);
      return cbs.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const { rerender } = render(<Probe value={0} />);
    rerender(<Probe value={1000} />);

    // Drain frames past the 350ms duration.
    act(() => {
      for (let i = 0; i < 50 && cbs.length > 0; i++) {
        now += 20;
        const cb = cbs.shift()!;
        cb(now);
      }
    });

    expect(screen.getByTestId("out")).toHaveTextContent("1000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- use-count-up`
Expected: FAIL — `Failed to resolve import "./use-count-up"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `components/studio/use-count-up.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION = 350;

// Cubic ease-out — fast start, gentle settle. Matches the calm, expensive feel.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animate a number from its previously displayed value to `value`.
 *
 * Snaps immediately (no tween) under SSR, in jsdom (no `matchMedia`), when the
 * user prefers reduced motion, or when rAF/performance are unavailable. This
 * defensiveness is deliberate: it keeps component tests deterministic and
 * honors accessibility without extra wiring at the call site.
 *
 * Retargets cleanly: a value change mid-tween continues from wherever the
 * number currently sits, so rapid slider drags never jump.
 */
export function useCountUp(value: number, duration = DEFAULT_DURATION): number {
  const [display, setDisplay] = useState(value);
  // Mirror the latest displayed value so a retarget starts from the visible
  // number, not the previous prop.
  const displayRef = useRef(value);
  displayRef.current = display;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof requestAnimationFrame !== "function" ||
      typeof performance === "undefined";

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    if (from === value) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (value - from) * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- use-count-up`
Expected: PASS (3 tests).

- [ ] **Step 5: Stage (commit only with user go-ahead)**

```bash
git add components/studio/use-count-up.ts components/studio/use-count-up.test.tsx
# Pause for user approval before:
# git commit -m "feat(studio): add reduced-motion-safe useCountUp hook"
```

---

### Task 2: `MetricsSummary` two-tier ledger redesign

Re-tier the flat 6-cell strip into a lead band (Monthly Rent, Annual NOI — serif numerals, amber gold-leaf hairline, count-up) and a supporting band (Build, Payback, Coverage, Zoning — quieter, hairline-divided). Preserve the `#summary` id, the responsive grid (2 → 3 → 6 col), `aria-label`, all text content, and the print rules.

**Files:**
- Modify: `components/studio/MetricsSummary.tsx` (full rewrite of the component body)
- Test: `components/studio/FeasibilityStudio.test.tsx` (add one assertion)

- [ ] **Step 1: Write the failing test**

Add this test inside the `describe("FeasibilityStudio", ...)` block in `components/studio/FeasibilityStudio.test.tsx`:

```tsx
  it("marks the lead money figures with the investment-grade accent", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    const summary = document.getElementById("summary");
    expect(summary).not.toBeNull();
    const leads = summary!.querySelectorAll('[data-metric-lead="true"]');
    // Exactly the two lead figures: Monthly Rent and Annual NOI.
    expect(leads).toHaveLength(2);
    leads.forEach((el) => expect(el).toHaveAttribute("data-accent", "amber"));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- FeasibilityStudio`
Expected: FAIL — `expected length 0 to be 2` (no `data-metric-lead` markers exist yet).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `components/studio/MetricsSummary.tsx` with:

```tsx
import { BarChart3, CheckCircle2, Home, Layers3, Ruler, SlidersHorizontal } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";
import { useCountUp } from "./use-count-up";

export interface MetricsSummaryProps {
  result: FeasibilityResult;
}

export default function MetricsSummary({ result }: MetricsSummaryProps) {
  // Lead tier: the two figures that carry the "this is the money" story. Serif
  // display numerals, amber gold-leaf hairline, animated count-up.
  const leads = [
    {
      key: "monthly-rent",
      icon: Home,
      label: "Monthly Rent",
      value: result.monthlyRent,
      format: formatCurrency,
      detail: "Local demo estimate",
    },
    {
      key: "annual-noi",
      icon: BarChart3,
      label: "Annual NOI",
      value: result.annualNoi,
      format: formatCurrency,
      detail: "After expenses & vacancy",
    },
  ] as const;

  // Supporting tier: the statement's fine print — quieter, mono-flavored.
  const support = [
    {
      key: "build-cost",
      icon: Ruler,
      label: "Build Cost Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `$${result.costPerSqftLow} - $${result.costPerSqftHigh} / sf`,
      detailMono: true,
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
    },
    {
      key: "payback",
      icon: SlidersHorizontal,
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
    },
    {
      key: "lot-coverage",
      icon: Layers3,
      label: "Lot Coverage",
      value: `${Math.round(result.coveragePercent)}%`,
      detail: `of ${result.maxCoveragePercent}% max`,
      detailMono: true,
      valueClass: `font-mono font-semibold text-xl ${
        result.remainingCapacity < 0 ? "text-lf-clay" : "text-lf-espresso"
      }`,
    },
    {
      key: "zoning-status",
      icon: CheckCircle2,
      label: "Zoning Status",
      value: result.zoningStatus,
      detail: result.zoningStatus === "Compliant" ? "ADU appears allowed" : "Needs review",
      valueClass: `font-sans font-semibold text-xl ${
        result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-clay"
      }`,
    },
  ] as const;

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="grid grid-cols-2 gap-px border-t border-lf-hairline bg-lf-hairline sm:grid-cols-3 lg:grid-cols-6"
    >
      {leads.map((metric) => (
        <LeadCell key={metric.key} {...metric} />
      ))}
      {support.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.key} className="bg-lf-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
            <CellLabel icon={Icon} label={metric.label} />
            <div className={`mt-2 tabular-nums ${metric.valueClass}`}>{metric.value}</div>
            <div className={`mt-0.5 text-[11px] text-lf-muted ${metric.detailMono ? "font-mono" : ""}`}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function LeadCell({
  icon: Icon,
  label,
  value,
  format,
  detail,
}: {
  icon: typeof Home;
  label: string;
  value: number;
  format: (n: number) => string;
  detail: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-lf-sand-2 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
      <CellLabel icon={Icon} label={label} />
      <div
        data-metric-lead="true"
        data-accent="amber"
        className="mt-2 inline-block font-display text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-lf-espresso"
      >
        {format(animated)}
        {/* Gold-leaf value hairline — the signature "this is the money" tell. */}
        <span aria-hidden className="mt-1.5 block h-px w-10 bg-lf-amber" />
      </div>
      <div className="mt-2 text-[11px] text-lf-muted">{detail}</div>
    </div>
  );
}

function CellLabel({ icon: Icon, label }: { icon: typeof Home; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-lf-muted sm:text-[11px]">
      <Icon size={13} />
      {label}
    </div>
  );
}
```

Notes baked into the code above:
- The section background flips to `bg-lf-hairline` so the existing `gap-px` reads as hairline rules between cells (previously `bg-lf-card` with per-cell borders); each cell now paints its own `bg-lf-card`/`bg-lf-sand-2`. This keeps the hairline-divided look while letting the lead band sit on a warmer field.
- Zoning "Compliant" now uses `text-lf-forest` (a true positive-green semantic token) instead of `text-lf-mahogany` — better signal for an investment-grade readout. Text content is unchanged so tests pass.
- The mount entrance still comes from the `lf-entrance lf-entrance-delay-1` wrapper in `FeasibilityStudio.tsx` (unchanged).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- FeasibilityStudio`
Expected: PASS — including the new accent assertion and the existing `$2,350` / "Build Cost Range" / "Review needed" assertions (count-up snaps to final value in jsdom, so value text is exact).

- [ ] **Step 5: Stage (commit only with user go-ahead)**

```bash
git add components/studio/MetricsSummary.tsx components/studio/FeasibilityStudio.test.tsx
# Pause for user approval before committing.
```

---

### Task 3: `IncomeLens` overlay re-skin

Re-skin the floating results card inside `FeasibilityStudio.tsx` to match the ledger: the hero rent figure becomes a Cormorant serif numeral with the amber hairline and a count-up; Annual NOI also counts up. Same props, data, and top-left position.

**Files:**
- Modify: `components/FeasibilityStudio.tsx` — the `IncomeLens` and `LensFact` functions (bottom of file), plus an import.

- [ ] **Step 1: Add the hook import**

At the top of `components/FeasibilityStudio.tsx`, add to the existing imports:

```tsx
import { useCountUp } from "./studio/use-count-up";
```

- [ ] **Step 2: Replace the `IncomeLens` function**

Replace the entire `IncomeLens` function with:

```tsx
function IncomeLens({
  result,
  isCompliant,
}: {
  result: FeasibilityResult;
  isCompliant: boolean;
}) {
  const rent = useCountUp(result.monthlyRent);
  const noi = useCountUp(result.annualNoi);
  return (
    <div className="pointer-events-none absolute left-4 right-4 top-4 z-30 max-w-[760px] rounded-md border border-lf-taupe/25 bg-lf-espresso/90 p-4 text-lf-sand-2 shadow-lg sm:left-5 sm:right-auto sm:min-w-[520px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-lf-taupe">
            ADU income potential
          </p>
          <h2 className="mt-1 inline-block font-display text-5xl font-semibold leading-[0.95] tracking-[-0.02em] text-lf-sand tabular-nums sm:text-6xl">
            {formatCurrency(rent)}
            <span className="ml-2 font-sans text-base font-medium tracking-normal text-lf-sand/70 pl-1.5">/ mo rent</span>
            {/* Gold-leaf value hairline mirrors the MetricsSummary lead cells. */}
            <span aria-hidden className="mt-2 block h-px w-16 bg-lf-amber" />
          </h2>
        </div>
        <div
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            isCompliant
              ? "border-lf-forest bg-lf-forest text-lf-sand"
              : "border-lf-clay bg-lf-clay text-lf-sand"
          }`}
        >
          {result.zoningStatus}
        </div>
      </div>

      <div className="mt-4 hidden sm:grid sm:gap-2 sm:grid-cols-3">
        <LensFact
          icon={BadgeDollarSign}
          label="Annual NOI"
          value={formatCurrency(noi)}
          fontClass="font-display text-white text-2xl"
        />
        <LensFact
          icon={Clock3}
          label="Payback"
          value={`${result.paybackYears} yrs`}
          fontClass="font-display text-white text-2xl"
        />
        <LensFact
          icon={Hammer}
          label="Build range"
          value={`${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`}
          fontClass="font-mono text-base mt-1.5 text-lf-sand-2"
        />
      </div>

      <div className="mt-3 hidden items-start gap-2 text-xs leading-5 text-lf-taupe sm:flex">
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-lf-clay" />
        Estimate updates as you change parcel, size, finish, and rent assumptions.
      </div>
    </div>
  );
}
```

Changes from the original: serif hero figure jumps from `text-4xl/5xl` to `text-5xl/6xl` and from `font-bold` to `font-semibold` (Cormorant reads heavy at semibold); the rent and NOI figures count up; an amber value hairline is added; the compliant badge uses `text-/bg-lf-forest`; NOI/Payback figures bump to `text-2xl`. `LensFact` itself is unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — no test asserts on the overlay's exact font sizes; value text is unchanged.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS with 0 warnings (`--max-warnings=0`). Confirm no unused imports remain.

- [ ] **Step 5: Stage (commit only with user go-ahead)**

```bash
git add components/FeasibilityStudio.tsx
# Pause for user approval before committing.
```

---

### Task 4: Visual verification in the dev server

Confirm the redesign reads as intended and the count-up fires on interaction.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server at `http://localhost:3000`.

- [ ] **Step 2: Verify the studio results**

Open `http://localhost:3000/studio`. Confirm:
- The `MetricsSummary` strip shows two lead cells (Monthly Rent, Annual NOI) with serif numerals on a warmer field, each underlined by a short amber hairline; four quieter supporting cells follow.
- The `IncomeLens` overlay on the scene shows the large serif rent figure with the amber hairline, matching the strip.
- Dragging the Width/Length sliders or switching the rent scenario animates the two lead figures (count-up), while supporting figures snap.
- Toggling OS "reduce motion" makes the figures update instantly with no tween.

- [ ] **Step 3: Capture a screenshot for the user**

Take a screenshot of `/studio` (per the project's `lotfoundry-preview-verification` convention: chrome-devtools screenshot at `localhost:3000`) and share it for sign-off.

- [ ] **Step 4: Final full verification**

Run: `npm run test && npm run lint`
Expected: all tests PASS, lint clean.

---

## Self-Review

**Spec coverage:**
- Aesthetic direction (Private-Bank Ledger), serif numerals, amber value hairline → Tasks 2 & 3. ✓
- Two-tier split (Rent + NOI lead) → Task 2. ✓
- `MetricsSummary` redesign, preserved grid/`#summary`/aria/print → Task 2. ✓
- `IncomeLens` re-skin, same props/position → Task 3. ✓
- Count-up on lead figures, reduced-motion gated, retarget-safe → Task 1 (hook) + Tasks 2/3 (wiring). ✓
- Reuse existing tokens only; no new colors (uses existing `lf-forest`, `lf-amber`) → Tasks 2 & 3. ✓
- Existing `FeasibilityStudio.test.tsx` still passes; accent assertion added; count-up unit test → Tasks 1 & 2. ✓
- Accessibility: contrast preserved, no `aria-live` spam, `aria-hidden` on decorative hairline → Tasks 2 & 3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `useCountUp(value: number, duration?) => number` is defined once (Task 1) and called the same way in Tasks 2 & 3. `data-metric-lead="true"` / `data-accent="amber"` markers defined in Task 2 match the assertion added in Task 2 Step 1. ✓
