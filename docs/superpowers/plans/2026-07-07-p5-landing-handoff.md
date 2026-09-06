> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# P5 Landing → Studio Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete P5 of the studio+funnel program — the landing→studio handoff honors DESIGN.md's dawn-ramp seam rules (no wizard interruption, money visible on arrival) and the landing story extends to the two revenue destinations via an embedded Certificate of Feasibility specimen.

**Architecture:** Four surgical changes to existing plumbing: (1) a non-destructive `peekAddressQuery()` on the session-storage handoff lets the mobile first-run wizard yield when an address is pending; (2) the studio's blank auth-loading splash becomes a money-forward "dawn arrival plate"; (3) a new `CertificateSpecimen` landing section renders the parchment certificate artifact on the night ground (DESIGN.md invariant 4) with destination beats 04 (Certificate, paid) and 05 (Builders); (4) a journey e2e proves the whole path on desktop and mobile.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 (strict), Tailwind CSS 4, Vitest + Testing Library (jsdom, globals on), Playwright (desktop-chromium 1440×900 + mobile-chromium 390×844).

**Spec:** `docs/superpowers/specs/2026-07-07-p5-landing-handoff-design.md`

## Global Constraints

- Branch off `master` as `feat/p5-landing-handoff` (create via the worktree skill at execution start). Commit from the repo worktree, never the outer `AR ADU` container.
- `ln-*` tokens and utilities are landing-only. The certificate artifact is the one sanctioned exception in reverse: it renders **daylight parchment with Cormorant** (`lf-*` tokens, `font-display`, `lf-money-*`) even on the night landing (DESIGN.md invariant 4 + two-serif rule).
- Green means money only: `text-lf-forest` on light surfaces; never green for structure or emphasis.
- Privacy rule: a guest's typed address must never appear in the URL, browser history, or `Referer` — the handoff stays in session storage.
- Copy is estimate-honest: "estimate", "concept", "typical · supported markets"; never guaranteed income or permit approval.
- Typography floors: kickers/mono labels use `tracking-[0.14em]`; 9px is the floor for informational text (10px mono labels used here are fine).
- Pill-radius system: read-only frames (the specimen card) stay rectangular (`rounded-lg`); circle step badges need equal explicit width and height (`h-10 w-10`).
- Style: two-space indent, double-quoted imports, `@/*` repo-root imports, PascalCase component files, tests beside code as `*.test.ts(x)`.
- ESLint runs with `--max-warnings=0`; do not add disables except the sanctioned `react-hooks/set-state-in-effect` pattern already present.
- Release gate before the PR: `npm run lint && npm run test && npx tsc --noEmit && npm run build`, plus `npm run test:e2e`.

---

### Task 1: Non-destructive peek on the address handoff

The wizard gate (Task 2) must know an address handoff is pending **without consuming it** — consumption happens later in `FeasibilityStudio`'s hydration effect. Add `peekAddressQuery()` beside the existing stash/consume pair.

**Files:**
- Modify: `lib/address-handoff.ts`
- Test: `lib/address-handoff.test.ts`

**Interfaces:**
- Consumes: existing `ADDRESS_HANDOFF_KEY` module constant, `stashAddressQuery`, `consumeAddressQuery`.
- Produces: `export function peekAddressQuery(): string | null` — returns the stashed address without removing it; `null` when nothing stashed, on the server, or when storage throws. Task 2 imports this from `@/lib/address-handoff`.

- [ ] **Step 1: Write the failing tests**

In `lib/address-handoff.test.ts`, change the import line to include the new function:

```ts
import { consumeAddressQuery, peekAddressQuery, stashAddressQuery } from "./address-handoff";
```

Add these three tests inside the existing `describe("address-handoff", ...)` block, after the `"leaves nothing readable in storage after consuming"` test:

```ts
  it("peeks at the stashed address without consuming it", () => {
    stashAddressQuery("456 Pine St, Denver, CO");
    expect(peekAddressQuery()).toBe("456 Pine St, Denver, CO");
    // Peeking must not consume — the studio's hydration effect still needs it.
    expect(consumeAddressQuery()).toBe("456 Pine St, Denver, CO");
  });

  it("peek returns null when nothing is stashed", () => {
    expect(peekAddressQuery()).toBeNull();
  });

  it("peek degrades to null when sessionStorage reads throw", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    expect(peekAddressQuery()).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/address-handoff.test.ts`
Expected: FAIL — `peekAddressQuery` is not exported (SyntaxError/undefined is not a function).

- [ ] **Step 3: Implement `peekAddressQuery`**

In `lib/address-handoff.ts`, add after `stashAddressQuery` (before `consumeAddressQuery`):

```ts
/**
 * Read the stashed address without removing it (non-destructive peek).
 *
 * Used by the studio's first-run-wizard gate: the wizard must yield when an
 * address handoff is pending, but consumption happens later in the hydration
 * effect, so the peek must leave the value in place.
 *
 * @returns The handed-off address, or null when nothing is stashed or session
 *   storage is unavailable.
 */
export function peekAddressQuery(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ADDRESS_HANDOFF_KEY);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/address-handoff.test.ts`
Expected: PASS — 11 tests (8 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add lib/address-handoff.ts lib/address-handoff.test.ts
git commit -m "feat(studio): add non-destructive peek to the landing address handoff"
```

---

### Task 2: First-run wizard yields to a pending handoff

Fixes the defect: `shouldShowWizard` only checks the URL, but the handoff travels via session storage, so a mobile guest who typed their address on the landing gets the wizard asking for it again.

**Files:**
- Modify: `lib/wizard-state.ts` (the `ShowWizardInput` interface + `shouldShowWizard`, currently lines 20–37)
- Modify: `components/FeasibilityStudio.tsx` (import at line 33; wizard mount effect at lines 235–241)
- Test: `lib/wizard-state.test.ts`

**Interfaces:**
- Consumes: `peekAddressQuery(): string | null` from Task 1 (`@/lib/address-handoff`).
- Produces: `shouldShowWizard({ hasUrlScenario: boolean; hasPendingAddress: boolean; storage: Pick<Storage, "getItem"> }): boolean` — `hasPendingAddress` is a **required** field, so `tsc` forces every call site to decide.

- [ ] **Step 1: Write the failing tests**

In `lib/wizard-state.test.ts`, replace the entire `describe("shouldShowWizard", ...)` block with:

```ts
describe("shouldShowWizard", () => {
  it("shows for a fresh visitor with a clean URL", () => {
    expect(
      shouldShowWizard({ hasUrlScenario: false, hasPendingAddress: false, storage: fakeStorage() }),
    ).toBe(true);
  });

  it("hides when a scenario URL is being opened", () => {
    expect(
      shouldShowWizard({ hasUrlScenario: true, hasPendingAddress: false, storage: fakeStorage() }),
    ).toBe(false);
  });

  it("hides when a landing address handoff is pending", () => {
    expect(
      shouldShowWizard({ hasUrlScenario: false, hasPendingAddress: true, storage: fakeStorage() }),
    ).toBe(false);
  });

  it("hides after the wizard was seen", () => {
    const storage = fakeStorage({ [WIZARD_SEEN_KEY]: "1" });
    expect(shouldShowWizard({ hasUrlScenario: false, hasPendingAddress: false, storage })).toBe(false);
  });

  it("hides (fails closed) when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
    };
    expect(shouldShowWizard({ hasUrlScenario: false, hasPendingAddress: false, storage })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/wizard-state.test.ts`
Expected: FAIL — the new `"hides when a landing address handoff is pending"` test fails (returns `true`); TypeScript may also report the unknown `hasPendingAddress` property.

- [ ] **Step 3: Implement the wizard-state change**

In `lib/wizard-state.ts`, replace the `ShowWizardInput` interface and `shouldShowWizard` (keep `nextStep`/`markWizardSeen` untouched):

```ts
interface ShowWizardInput {
  hasUrlScenario: boolean;
  /** True when a landing-hero address handoff is waiting to be consumed. */
  hasPendingAddress: boolean;
  storage: Pick<Storage, "getItem">;
}

/**
 * Show the wizard only to fresh visitors opening a clean URL with no pending
 * address handoff — a visitor who already typed their address on the landing
 * must arrive in the searched studio, not an onboarding modal (DESIGN.md
 * dawn-ramp seam rule). Fails closed (no wizard) if storage is unavailable —
 * a broken first-run overlay is worse than no overlay.
 */
export function shouldShowWizard({
  hasUrlScenario,
  hasPendingAddress,
  storage,
}: ShowWizardInput): boolean {
  if (hasUrlScenario || hasPendingAddress) return false;
  try {
    return storage.getItem(WIZARD_SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/wizard-state.test.ts`
Expected: PASS — 8 tests (5 in the `shouldShowWizard` block).

- [ ] **Step 5: Update the FeasibilityStudio call site**

In `components/FeasibilityStudio.tsx`, extend the import at line 33:

```ts
import { consumeAddressQuery, peekAddressQuery } from "@/lib/address-handoff";
```

Replace the body of the wizard mount effect (currently lines 235–241; keep the surrounding `eslint-disable` comments exactly as they are):

```ts
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return; // desktop never sees the wizard
    const hasUrlScenario = window.location.search.length > 1;
    setWizardOpen(
      shouldShowWizard({
        hasUrlScenario,
        // A landing handoff is about to run its own search — the wizard must
        // yield or it would ask for the address the visitor already typed.
        // Peek, don't consume: the hydration effect below still needs it.
        hasPendingAddress: peekAddressQuery() !== null,
        storage: window.localStorage,
      }),
    );
  }, []);
```

This works because React runs mount effects in declaration order: the wizard effect (line ~235) peeks before the hydration effect (line ~252) consumes.

- [ ] **Step 6: Type-check and run the full unit suite**

Run: `npx tsc --noEmit`
Expected: clean — if any other `shouldShowWizard` call site exists, the required field surfaces it here; update it the same way.

Run: `npm run test`
Expected: PASS (full suite; ~400+ tests).

- [ ] **Step 7: Commit**

```bash
git add lib/wizard-state.ts lib/wizard-state.test.ts components/FeasibilityStudio.tsx
git commit -m "fix(studio): first-run wizard yields to a pending landing address handoff"
```

---

### Task 3: Promote `TYPICAL_MARKET` to lib and build the dawn arrival plate

Two sub-changes that ship in two commits: move the typical-market constants out of the nocturne folder (a daylight surface must not import from `components/landing/nocturne/`), then replace the studio's blank "Loading studio..." splash with a parchment plate that keeps a forest money figure on screen from the first arrival frame (DESIGN.md seam rule: money-green within 3 seconds, no spinner-on-white).

**Files:**
- Move: `components/landing/nocturne/typical-market.ts` → `lib/typical-market.ts`
- Modify: `components/landing/nocturne/BlueHourHero.tsx:17`, `components/landing/nocturne/DawnStudioLink.tsx:7`, `components/landing/nocturne/SignalLedger.tsx:2` (import path only)
- Modify: `app/studio/page.tsx` (the `loading || builder` branch, currently lines 25–36)
- Test: `app/studio/page.test.tsx` (exists — update the loading-splash test)

**Interfaces:**
- Consumes: nothing new.
- Produces: `lib/typical-market.ts` exporting `TYPICAL_MARKET: { rentBand: "$2,100–$2,600"; noi: "$22,400"; paybackYears: "12"; buildBand: "$230K–$290K" }` (values unchanged, `as const`). Tasks 4 and 5 import `TYPICAL_MARKET` from `@/lib/typical-market`. Note `rentBand` uses an **en dash** (–), not a hyphen.

- [ ] **Step 1: Move the module and update imports**

```bash
git mv components/landing/nocturne/typical-market.ts lib/typical-market.ts
```

In each of `BlueHourHero.tsx`, `DawnStudioLink.tsx`, `SignalLedger.tsx`, change:

```ts
import { TYPICAL_MARKET } from "./typical-market";
```

to:

```ts
import { TYPICAL_MARKET } from "@/lib/typical-market";
```

- [ ] **Step 2: Verify no stragglers and nothing broke**

Run: `grep -rn "\./typical-market" components app`
Expected: no output.

Run: `npx tsc --noEmit && npx vitest run components/landing`
Expected: clean type-check; landing tests PASS.

- [ ] **Step 3: Commit the move**

```bash
git add -A
git commit -m "refactor(landing): promote typical-market constants to lib for cross-surface use"
```

- [ ] **Step 4: Write the failing arrival-plate test**

In `app/studio/page.test.tsx`, add the import at the top (after the existing imports):

```ts
import { TYPICAL_MARKET } from "@/lib/typical-market";
```

Replace the `"shows the loading splash while auth state resolves"` test with:

```tsx
  it("shows the dawn arrival plate with the typical money band while auth resolves", () => {
    mocks.authState.loading = true;

    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    // Seam rule (DESIGN.md): a money-green figure must be visible on arrival —
    // never a bare "Loading studio..." spinner state.
    expect(screen.queryByText("Loading studio...")).not.toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.rentBand)).toBeInTheDocument();
    expect(screen.getByText(/typical supported markets/i)).toBeInTheDocument();
  });
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run app/studio/page.test.tsx`
Expected: FAIL — "Loading studio..." is still rendered; the rent band is not.

- [ ] **Step 6: Implement the arrival plate**

In `app/studio/page.tsx`, add the import:

```ts
import { TYPICAL_MARKET } from "@/lib/typical-market";
```

Replace the `if (loading || profile?.role === "builder")` return block with:

```tsx
  // Dawn arrival plate: auth resolution is the first thing a landing visitor
  // sees after the ramp, so it must keep the money moment alive (DESIGN.md
  // seam rule: money-green figure within 3s, no spinner-on-white). Parchment
  // ground so the landing's 520ms dawn ramp lands on a continuous surface.
  if (loading || profile?.role === "builder") {
    return (
      <div role="status" className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="px-6 text-center">
          <p className="lf-kicker-dense text-lf-muted">
            Opening studio · typical supported markets
          </p>
          <p data-money className="lf-money-lg mt-3 text-lf-forest">
            {TYPICAL_MARKET.rentBand}
            <span className="ml-1 font-mono text-sm font-normal text-lf-muted">/mo</span>
          </p>
          <p className="lf-caption mt-3 text-lf-muted">Estimates, not guarantees.</p>
        </div>
      </div>
    );
  }
```

Notes: `lf-money-lg` is the Cormorant range utility (`app/globals.css`) — `MoneyFigure` can't render a band. `data-money` mirrors the attribute `MoneyFigure` stamps, so the journey e2e can use one selector across the plate and step 1. Update the component's JSDoc first line from "Waits for auth to resolve" phrasing only if it mentions the old splash.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run app/studio/page.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 8: Commit**

```bash
git add app/studio/page.tsx app/studio/page.test.tsx
git commit -m "feat(studio): dawn arrival plate keeps the money figure on screen while auth resolves"
```

---

### Task 4: Certificate specimen section on the night landing

DESIGN.md invariant 4: "The certificate is the sun … including embedded on the night landing (a lit window in a dark house)." The section extends OwnerPath's 01–03 numbering with destinations 04 (Certificate, paid) and 05 (Builders), closing the program's "revenue designed into the arc" principle. No CTA here — `ClosingCall` follows immediately and keeps the single quiet ask.

**Files:**
- Create: `components/landing/nocturne/CertificateSpecimen.tsx`
- Create: `components/landing/nocturne/CertificateSpecimen.test.tsx`
- Modify: `app/page.tsx` (import + render between `<DuskShowcase />` and `<ClosingCall />`)
- Modify: `e2e/visual-breakpoints.spec.ts` (one heading assertion)

**Interfaces:**
- Consumes: `TYPICAL_MARKET` from `@/lib/typical-market` (Task 3); `Reveal` from `./Reveal` (existing — renders children unconditionally, jsdom-safe).
- Produces: `export function CertificateSpecimen(): JSX.Element` — a server component (no `"use client"`), section `aria-labelledby="specimen-heading"`.

- [ ] **Step 1: Write the failing tests**

Create `components/landing/nocturne/CertificateSpecimen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TYPICAL_MARKET } from "@/lib/typical-market";
import { CertificateSpecimen } from "./CertificateSpecimen";

describe("CertificateSpecimen", () => {
  it("extends the owner path to the certificate and builder destinations", () => {
    render(<CertificateSpecimen />);

    expect(
      screen.getByRole("heading", { name: /certificate meets your builder/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Own the record")).toBeInTheDocument();
    expect(screen.getByText("Meet your builders")).toBeInTheDocument();
  });

  it("renders the parchment specimen with typical figures and the honesty stamp", () => {
    render(<CertificateSpecimen />);

    expect(screen.getByText("Certificate of Feasibility")).toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.rentBand)).toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.noi)).toBeInTheDocument();
    expect(screen.getByText(/concept · not a permit/i)).toBeInTheDocument();
    expect(screen.getByText(/specimen — your address replaces this/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/landing/nocturne/CertificateSpecimen.test.tsx`
Expected: FAIL — cannot resolve `./CertificateSpecimen`.

- [ ] **Step 3: Implement the component**

Create `components/landing/nocturne/CertificateSpecimen.tsx`:

```tsx
import { TYPICAL_MARKET } from "@/lib/typical-market";
import { Reveal } from "./Reveal";

/**
 * Steps 04–05 of the arc: the paid Certificate of Feasibility and the builder
 * handoff — the two revenue destinations the studio spine ends at. Per
 * DESIGN.md invariant 4 ("the certificate is the sun"), the specimen renders
 * as daylight parchment with Cormorant recorded figures even on the night
 * landing — a lit window in a dark house. The `lf-*` classes on the card are
 * deliberate: the card is an artifact of the daylight system, not landing
 * type, and stays rectangular (a document, not a control).
 */
const DESTINATIONS = [
  {
    number: "04",
    title: "Own the record",
    body: "When the numbers hold, the studio engraves them: rent, build range, payback, and the assumptions behind them, recorded as a Certificate of Feasibility you keep and share.",
    record: "In the studio · certificate · paid",
  },
  {
    number: "05",
    title: "Meet your builders",
    body: "Matched local builders read the same certificate and answer with real bids — no cold calls, no catalog packages.",
    record: "In the studio · builder connect",
  },
] as const;

const RECORDED = [
  "Your ADU's size, style, and placement",
  "Estimated rent, income, payback, and lot coverage",
  "Honest fine print instead of empty promises",
] as const;

/** The lit-window section: parchment certificate specimen on the night ground. */
export function CertificateSpecimen() {
  return (
    <section aria-labelledby="specimen-heading" className="border-t border-ln-hairline/60">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 sm:py-32 lg:grid-cols-[1fr_1.05fr]">
        <Reveal>
          <p className="lf-kicker flex items-center gap-2.5 text-ln-glow">
            <span aria-hidden="true" className="h-px w-6 bg-ln-glow/70" />
            Where the path leads
          </p>
          <h2 id="specimen-heading" className="ln-section-heading mt-4 max-w-2xl text-ln-mist">
            The survey ends in a certificate. The certificate meets your builder.
          </h2>
          <ul className="mt-12 space-y-9">
            {DESTINATIONS.map((step) => (
              <li key={step.number} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ln-glow/50 font-mono text-xs font-semibold text-ln-glow"
                >
                  {step.number}
                </span>
                <div>
                  <h3 className="ln-card-heading text-ln-mist">{step.title}</h3>
                  <p className="lf-body-sm mt-2 max-w-[52ch] text-ln-slate">{step.body}</p>
                  <p className="lf-kicker-dense mt-3 text-ln-slate/70">{step.record}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="lf-caption mt-10 max-w-[60ch] text-ln-slate/70">
            The certificate records estimates and concepts — it is not a permit,
            an appraisal, or a guarantee.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {/* Daylight parchment on night ground: the lit window (invariant 4). */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-lg border border-lf-hairline bg-lf-card p-6 text-lf-espresso shadow-[0_0_80px_rgba(245,181,74,0.16),0_24px_48px_rgba(0,0,0,0.55)] sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                <span>No. LF-042-0117-118</span>
                <span>Typical · supported markets</span>
              </div>
              <div className="mt-4 border-t border-lf-hairline pt-4">
                <p className="font-display text-2xl font-semibold leading-tight">
                  Certificate of Feasibility
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                  Specimen — your address replaces this
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                  Rent potential
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                  Build range
                </p>
                <p className="lf-money-md text-lf-forest">
                  {TYPICAL_MARKET.rentBand}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-muted">/mo</span>
                </p>
                <p className="lf-money-md">{TYPICAL_MARKET.buildBand}</p>
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-4 border-b-4 border-double border-lf-taupe pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                  Net operating income
                </span>
                <span className="lf-money-md text-lf-forest">
                  {TYPICAL_MARKET.noi}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-muted">/yr</span>
                </span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {RECORDED.map((item) => (
                  <li key={item} className="flex gap-2.5 font-mono text-xs leading-5 text-lf-espresso/85">
                    <span aria-hidden="true" className="shrink-0 text-lf-taupe">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-3 right-8 rotate-6 rounded-sm border-2 border-lf-brick/80 bg-lf-brick/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-brick"
            >
              Concept · not a permit
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

Design notes for the reviewer: the glow shadow `rgba(245,181,74,0.16)` is `--color-ln-glow` at low alpha — the "lit window" halo, a shadow, not a CSS gradient fill (anti-slop safe). Money figures are forest on parchment; the build range stays espresso (cost is not money-green). `lf-money-md` is Cormorant via `--font-display`, which remains Cormorant inside the landing wrapper (`--font-display-ln` is a separate variable), satisfying the two-serif rule.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/landing/nocturne/CertificateSpecimen.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Wire the section into the landing page**

In `app/page.tsx`, add the import:

```ts
import { CertificateSpecimen } from "@/components/landing/nocturne/CertificateSpecimen";
```

Insert between the existing showcase and closing call inside `<main>`:

```tsx
        <DuskShowcase />
        <CertificateSpecimen />
        <ClosingCall />
```

- [ ] **Step 6: Guard the section in the visual-breakpoints e2e**

In `e2e/visual-breakpoints.spec.ts`, after the `"Take the studio to the yard"` assertion, add:

```ts
      // The certificate specimen (steps 04–05) must survive every breakpoint.
      await expect(
        page.getByRole("heading", { name: /certificate meets your builder/i }),
      ).toBeVisible();
```

- [ ] **Step 7: Run the landing suites**

Run: `npx vitest run components/landing`
Expected: PASS.

Run: `npx playwright test e2e/visual-breakpoints.spec.ts --project=desktop-chromium`
Expected: PASS — 5 breakpoint tests (Playwright boots the dev server; allow ~2 min on first run).

- [ ] **Step 8: Commit**

```bash
git add components/landing/nocturne/CertificateSpecimen.tsx components/landing/nocturne/CertificateSpecimen.test.tsx app/page.tsx e2e/visual-breakpoints.spec.ts
git commit -m "feat(landing): embed the Certificate of Feasibility specimen — steps 04–05 of the arc"
```

---

### Task 5: Journey e2e — landing address to studio value moment

Proves the whole P5 path. The test submits a deliberately unresolvable address so the studio's `role="alert"` search banner appears in **both** environments — with live API keys (geocoder returns zero results) and without (API reports missing configuration) — as proof the handed-off search actually ran, while the demo parcel keeps the money moment alive.

**Files:**
- Create: `e2e/handoff.spec.ts`

**Interfaces:**
- Consumes: the hero form (`getByLabel(/property address/i)`, button `/run feasibility/i` — `BlueHourHero.tsx`); wizard suppression (Task 2); `data-money` markers (Task 3's plate + `MoneyFigure` in the studio's step 1); mobile sheet `data-testid="studio-sheet"`; wizard heading text `/could your backyard pay you rent/i`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the e2e spec**

Create `e2e/handoff.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

// An address no geocoder resolves: with live keys the search returns zero
// results; without keys the API reports missing configuration. Either way the
// studio surfaces its role="alert" banner — proof the handed-off search ran —
// while the demo parcel keeps the money moment on screen.
const UNRESOLVABLE_ADDRESS = "0 Nowhere Lane, Zzyzx Flats, ZZ 00000";

test.describe("landing → studio handoff", () => {
  test("desktop: the searched address runs and the money moment survives", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/");
    await page.getByLabel(/property address/i).fill(UNRESOLVABLE_ADDRESS);
    await page.getByRole("button", { name: /run feasibility/i }).click();

    await expect(page).toHaveURL(/\/studio/);
    // Seam rule: a money figure within 3 seconds of arrival (arrival plate
    // and the step-1 MoneyFigure both stamp data-money).
    await expect(page.locator("[data-money]").first()).toBeVisible({ timeout: 3000 });
    // Step 1 leads with the value hook on the demo parcel.
    await expect(page.getByText("If built")).toBeVisible();
    // The handed-off search ran (and failed for this unresolvable address).
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
    // Privacy: the typed address never reaches the URL.
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });

  test("mobile: the first-run wizard yields to the handed-off address", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width >= 1024, "mobile-only");
    await page.goto("/");
    await page.getByLabel(/property address/i).fill(UNRESOLVABLE_ADDRESS);
    await page.getByRole("button", { name: /run feasibility/i }).click();

    await expect(page).toHaveURL(/\/studio/);
    // The studio sheet renders first…
    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    // …and the wizard never interrupts an arrival that brought an address.
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
    await expect(page.getByText("Rent potential / mo")).toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });
});
```

- [ ] **Step 2: Run the spec and verify it passes**

Run: `npx playwright test e2e/handoff.spec.ts`
Expected: 2 passed, 2 skipped (each test runs on its own project). If the mobile test fails on the wizard assertion, Task 2's suppression is broken — do not weaken the test.

- [ ] **Step 3: Run the existing hero and mobile-studio suites to confirm no regression**

Run: `npx playwright test e2e/hero.spec.ts e2e/mobile-studio.spec.ts`
Expected: PASS — the existing `"first-run wizard skips into the bottom-sheet studio"` test still passes because it visits `/studio` directly with no handoff stashed.

- [ ] **Step 4: Commit**

```bash
git add e2e/handoff.spec.ts
git commit -m "test(e2e): cover the landing-to-studio handoff journey end to end"
```

---

### Task 6: Docs closeout and release gate

**Files:**
- Modify: `DESIGN.md` (Decisions Log table — append one row)
- Modify: `docs/AGENTS.md` (Current Status table + "Last updated" line, ~lines 205–220)

**Interfaces:**
- Consumes: everything above, landed.
- Produces: the program record showing P5 complete.

- [ ] **Step 1: Append the DESIGN.md decisions-log row**

Add at the bottom of the Decisions Log table:

```markdown
| 2026-07-07 | P5 landing handoff: certificate specimen embedded on the nocturne landing; dawn arrival plate | Invariant 4 realized: a parchment `CertificateSpecimen` (Cormorant recorded figures, forest money, brick stamp) extends the owner path to the revenue destinations (04 certificate · 05 builders) on the night ground. The studio's auth-loading splash became a money-forward arrival plate (`lf-money-lg` forest band on sand) — interim satisfaction of the seam's money-within-3s rule until the full settle-and-stamp assembly ships. The mobile first-run wizard now yields to a pending address handoff (peek-don't-consume on the session-storage channel). |
```

- [ ] **Step 2: Update docs/AGENTS.md status**

In the Current Status table, add a row after the `Guided Spine (P0–P4)` row:

```markdown
| Landing handoff (P5) | ✅ Landed | Session-storage address handoff + dawn ramp; wizard yields to a pending handoff; arrival plate keeps money-in-3s; certificate specimen extends the landing arc to steps 04–05 |
```

Update the `_Last updated …_` line under "## Current Status" to `_Last updated 2026-07-07 (P5 landing handoff)._`

- [ ] **Step 3: Run the full release gate**

Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
Expected: lint 0 warnings; all Vitest suites pass; tsc clean; build succeeds.

Run: `npm run test:e2e`
Expected: all Playwright suites pass on both projects.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/AGENTS.md
git commit -m "docs: record P5 landing-handoff completion"
```

- [ ] **Step 5: Open the PR**

Push and open a PR against `master` titled `feat(landing): P5 landing → studio handoff — seam fixes + certificate specimen`. The body should list the four gaps closed, the verification commands from Step 3, and screenshots of (a) the new specimen section at 1440 and 390, and (b) the dawn arrival plate. Include the mobile before/after for the wizard suppression if practical (gstack browse or Playwright screenshots).
