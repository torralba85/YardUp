> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Mobile Native-Feel Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LotFoundry Android TWA behave like an installed app — back gesture steps through the journey instead of exiting, pull-to-refresh cannot wipe state, taps have haptic and visual feedback, and reveals transition directionally.

**Architecture:** Two new pure modules (`lib/haptics.ts`, `lib/use-journey-history.ts`) plus CSS additions and three integration edits. Journey position gains a session-history mirror so the browsing context can no longer destroy it. Motion uses the Web Animations API on a stable node — never a keyed remount, because `ShapeStep` carries the WebGL scene.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 (strict), Tailwind CSS 4, Vitest + `@testing-library/react`, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-28-mobile-native-feel-design.md`

## Global Constraints

- **Do not push to GitHub.** Freeze until 2026-08-03 (Devpost judging). Local commits only.
- Branch is `release/mobile-store`. It carries unrelated pre-staged Play Billing changes — **stage only the files each task names**, never `git add -A` or `git add .`.
- Release gate after the final task: `npm run lint && npm run test && npx tsc --noEmit && npm run build`. All four must pass.
- ESLint runs with `--max-warnings=0`.
- TypeScript strict; two-space indent; double-quoted imports; `@/*` repo-root imports.
- Mobile journey only. Desktop rendering must be untouched.
- **Hydration safety:** server and client markup must stay identical. No `useReducedMotion()`, no motion wrapper that changes rendered attributes. Motion is CSS gated by `@media (prefers-reduced-motion: no-preference)`, or WAAPI inside an effect.
- Motion values per `DESIGN.md`: `ease-out`, 200–220ms.
- The journey URL must never change. `e2e/hero.spec.ts:61` asserts a guest's typed address never reaches the URL or history.

## File Structure

| File | Responsibility |
|---|---|
| `app/globals.css` (modify) | Touch chrome: tap highlight, selection, overscroll containment |
| `lib/use-journey-history.ts` (create) | Mirror journey position into session history; restore on `popstate` |
| `lib/use-journey-history.test.ts` (create) | Hook unit tests |
| `components/FeasibilityStudio.tsx` (modify) | Call the history hook; reset and back-chevron wiring |
| `lib/haptics.ts` (create) | Named haptic vocabulary + capability detection |
| `lib/haptics.test.ts` (create) | Haptics unit tests |
| `components/ui/Button.tsx` (modify) | Fire a haptic on press |
| `components/studio/mobile/journey/EarnStep.tsx` (modify) | Fire the reveal haptic on the money landing |
| `components/studio/mobile/journey/MobileJourney.tsx` (modify) | Directional transition on a stable node; overscroll containment |
| `components/studio/mobile/journey/MobileJourney.test.tsx` (modify) | Transition + wrapper-stability tests |
| `e2e/feasibility-studio.spec.ts` (modify) | Back-navigation E2E |

---

### Task 1: Touch chrome

Removes the tap-highlight flash and stops pull-to-refresh from reaching the browser. Pure CSS, no JS, no hydration surface.

**Files:**
- Modify: `app/globals.css` (append after the existing `.lf-stagger` block, which ends at line 424)

**Interfaces:**
- Consumes: nothing
- Produces: CSS class `.lf-journey-surface` — applied by Task 6 to the journey scroller

- [ ] **Step 1: Append the touch-chrome block to `app/globals.css`**

```css
/* ── Installed-app touch chrome ────────────────────────────────
   The TWA runs this same CSS with no browser UI around it, so web
   defaults that are invisible in a tab read as "web page" in the app.
   Scoped to the mobile journey; desktop is untouched. */

/* Chrome paints a translucent box on every tap. In a standalone app
   that flash is the loudest remaining "this is a website" tell. */
a,
button,
[role="button"],
input,
select,
textarea,
summary {
  -webkit-tap-highlight-color: transparent;
}

/* Journey chrome must not long-press-select like a document. Content
   stays selectable on purpose — users copy addresses, money figures,
   and APNs, and taking that away would be a real regression. */
.lf-journey-surface nav,
.lf-journey-surface button,
.lf-journey-surface .lf-kicker {
  -webkit-user-select: none;
  user-select: none;
}

/* Contain overscroll so Chrome's pull-to-refresh cannot fire inside the
   TWA. Journey position lives in React state, so a reload would drop the
   user back to Find and lose the study. */
.lf-journey-surface {
  overscroll-behavior-y: contain;
}
```

- [ ] **Step 2: Verify the stylesheet still compiles**

Run: `npm run build`
Expected: build succeeds. (Tailwind 4 parses `app/globals.css` at build time; a malformed rule fails here.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(mobile): add installed-app touch chrome"
```

---

### Task 2: The journey history hook

The load-bearing piece. Mirrors journey position into session history so the Android back gesture steps backward instead of exiting.

**Files:**
- Create: `lib/use-journey-history.ts`
- Test: `lib/use-journey-history.test.ts`

**Interfaces:**
- Consumes: `MobileJourneyStep` from `@/lib/mobile-journey`
- Produces:
  - `useJourneyHistory(step: MobileJourneyStep, onRestore: (step: MobileJourneyStep) => void): { reset: () => void }`
  - `JOURNEY_STEP_STATE_KEY: "lfJourneyStep"`

- [ ] **Step 1: Write the failing tests**

Create `lib/use-journey-history.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJourneyHistory, JOURNEY_STEP_STATE_KEY } from "./use-journey-history";
import type { MobileJourneyStep } from "./mobile-journey";

function popTo(step: MobileJourneyStep | null) {
  const event = new PopStateEvent("popstate", {
    state: step ? { [JOURNEY_STEP_STATE_KEY]: step } : null,
  });
  window.dispatchEvent(event);
}

describe("useJourneyHistory", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/studio");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces rather than pushes on the first sync, so the journey adds no entry at launch", () => {
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");

    renderHook(() => useJourneyHistory("find", vi.fn()));

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("pushes one entry per forward move without changing the URL", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, vi.fn()),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );

    rerender({ step: "earn" });

    expect(push).toHaveBeenCalledTimes(1);
    const [state, , url] = push.mock.calls[0];
    expect(state).toMatchObject({ [JOURNEY_STEP_STATE_KEY]: "earn" });
    // Privacy rule (e2e/hero.spec.ts:61): a guest's address must never
    // reach the URL or history. Entries reuse the current URL exactly.
    expect(url).toBe(window.location.href);
  });

  it("restores the step carried by a popstate event", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "shape" });

    act(() => popTo("earn"));

    expect(onRestore).toHaveBeenCalledWith("earn");
  });

  it("does not push a new entry for a step arriving from popstate", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "shape" });

    const push = vi.spyOn(window.history, "pushState");
    act(() => popTo("earn"));
    // The consumer reacts to onRestore by setting state, which re-renders.
    rerender({ step: "earn" });

    expect(push).not.toHaveBeenCalled();
  });

  it("ignores a popstate entry with no journey state", () => {
    // CertificatePanel.tsx:135 calls replaceState and can drop our key.
    // A missing key must never be interpreted as a step change.
    const onRestore = vi.fn();
    renderHook(() => useJourneyHistory("shape", onRestore));

    act(() => popTo(null));

    expect(onRestore).not.toHaveBeenCalled();
  });

  it("reset() replaces in place so back after a reset does not resurrect a stale step", () => {
    const { result, rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, vi.fn()),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "act" });

    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    act(() => result.current.reset());
    rerender({ step: "find" });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/use-journey-history.test.ts`
Expected: FAIL — `Failed to resolve import "./use-journey-history"`.

- [ ] **Step 3: Write the implementation**

Create `lib/use-journey-history.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MobileJourneyStep } from "@/lib/mobile-journey";

/**
 * Key under which the journey step rides in `history.state`. Namespaced so it
 * never collides with Next.js router state sharing the same entry.
 */
export const JOURNEY_STEP_STATE_KEY = "lfJourneyStep";

interface JourneyHistoryState {
  [JOURNEY_STEP_STATE_KEY]?: MobileJourneyStep;
}

/** What {@link useJourneyHistory} hands back to the caller. */
export interface JourneyHistoryControls {
  /**
   * Collapse the journey's history back to the current entry. Call from a
   * "start over" reset: without it, the back gesture would return to a step
   * whose underlying parcel state no longer exists.
   */
  reset: () => void;
}

/**
 * Mirror the mobile journey's position into session history.
 *
 * The TWA runs in `display: standalone` with no browser chrome, so the Android
 * back gesture goes straight to the browsing context: without a history entry
 * per reveal, a user three steps deep who swipes back leaves the app and loses
 * the whole study.
 *
 * Entries carry the step in `history.state` and **reuse the current URL**.
 * Encoding the step in the URL is the obvious approach and would break the
 * privacy rule asserted by `e2e/hero.spec.ts:61` — a guest's typed address
 * must never reach the URL or history.
 *
 * Syncing happens in an effect rather than at the ~13 `setJourneyStep` call
 * sites: one of them runs during render (`FeasibilityStudio.tsx:301`), where
 * a `pushState` would be a side effect in the render phase.
 */
export function useJourneyHistory(
  step: MobileJourneyStep,
  onRestore: (step: MobileJourneyStep) => void,
): JourneyHistoryControls {
  // The step history already reflects. `null` means "nothing written yet".
  const syncedRef = useRef<MobileJourneyStep | null>(null);
  // Set while applying a popstate, so the resulting render does not push the
  // step we just travelled back to as if it were a new forward move.
  const restoringRef = useRef(false);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (syncedRef.current === step) return;

    if (restoringRef.current) {
      restoringRef.current = false;
      syncedRef.current = step;
      return;
    }

    // Spread the existing state so a co-resident writer's keys survive.
    const next: JourneyHistoryState = { ...window.history.state, [JOURNEY_STEP_STATE_KEY]: step };
    if (syncedRef.current === null) {
      // First sync stamps the entry the app launched on — pushing here would
      // make the first back press a no-op instead of leaving the app.
      window.history.replaceState(next, "", window.location.href);
    } else {
      window.history.pushState(next, "", window.location.href);
    }
    syncedRef.current = step;
  }, [step]);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const state = event.state as JourneyHistoryState | null;
      const restored = state?.[JOURNEY_STEP_STATE_KEY];
      // No key means the entry is not ours — `CertificatePanel.tsx:135`
      // calls replaceState and can drop it. Never guess a step from a
      // stateless entry; leaving the journey put is the safe fallback.
      if (!restored) return;
      restoringRef.current = true;
      syncedRef.current = restored;
      onRestoreRef.current(restored);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    const next: JourneyHistoryState = {
      ...window.history.state,
      [JOURNEY_STEP_STATE_KEY]: "find",
    };
    window.history.replaceState(next, "", window.location.href);
    // Mark "find" as already synced so the reset render does not push it.
    syncedRef.current = "find";
  }, []);

  return { reset };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/use-journey-history.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/use-journey-history.ts lib/use-journey-history.test.ts
git commit -m "feat(mobile): mirror journey position into session history"
```

---

### Task 3: Wire history into the studio

Makes the back gesture work end to end. After this task both state-destroying bugs from the spec are fixed.

**Files:**
- Modify: `components/FeasibilityStudio.tsx` (declaration near line 291; `resetScenario` at 375–388; `onBack` at 725)
- Modify: `e2e/feasibility-studio.spec.ts` (append a mobile back-navigation test)

**Interfaces:**
- Consumes: `useJourneyHistory` from Task 2
- Produces: nothing new for later tasks

- [ ] **Step 1: Add the import**

In `components/FeasibilityStudio.tsx`, alongside the existing `@/lib/mobile-journey` import near line 69:

```typescript
import { useJourneyHistory } from "@/lib/use-journey-history";
```

- [ ] **Step 2: Call the hook after the `journeyStep` declaration**

Insert directly after the `const [journeyStep, setJourneyStep] = useState<MobileJourneyStep>(...)` block (ends line 293):

```typescript
  // Session-history mirror so the Android back gesture steps back through the
  // journey instead of exiting the TWA. All ~13 setJourneyStep call sites stay
  // untouched — the hook observes the resulting state instead.
  const journeyHistory = useJourneyHistory(journeyStep, setJourneyStep);
```

- [ ] **Step 3: Collapse history on reset**

In `resetScenario` (line 375), directly after `setJourneyStep("find");`:

```typescript
    journeyHistory.reset();
```

- [ ] **Step 4: Drive the back chevron through history**

Replace the `onBack` prop at line 725:

```tsx
          onBack={previousStep ? () => window.history.back() : undefined}
```

Rationale to keep in mind while editing: the chevron previously set state directly, which would leave a stale forward entry behind and desync the hardware back gesture from the in-app one. Routing both through history keeps a single source of truth.

- [ ] **Step 5: Add the E2E test**

Append to `e2e/feasibility-studio.spec.ts`:

```typescript
test("back navigation steps through the journey instead of leaving the study", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The five-reveal journey is the mobile layout only");

  await page.goto("/studio");
  await page.getByRole("button", { name: /Seattle/i }).click();
  await page.getByRole("button", { name: /Reveal my backyard/i }).click();
  await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();

  await page.getByRole("button", { name: /Shape your ADU/i }).click();
  await expect(page.getByRole("heading", { name: /Shape/i })).toBeVisible();

  await page.goBack();

  // The study survives: we land on the previous reveal, still inside the app.
  await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();
});
```

- [ ] **Step 6: Run the unit and E2E suites**

Run: `npm run test`
Expected: PASS, including the existing `FeasibilityStudio.test.tsx` suite.

Run: `npm run test:e2e -- feasibility-studio`
Expected: PASS, including the new back-navigation test.

- [ ] **Step 7: Commit**

```bash
git add components/FeasibilityStudio.tsx e2e/feasibility-studio.spec.ts
git commit -m "fix(mobile): keep the Android back gesture inside the journey"
```

---

### Task 4: The haptics module

**Files:**
- Create: `lib/haptics.ts`
- Test: `lib/haptics.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `HapticEvent = "tap" | "commit" | "reveal"`
  - `HAPTIC_PATTERNS: Record<HapticEvent, number | number[]>`
  - `canVibrate(): boolean`
  - `haptic(event: HapticEvent): void`

> **Owner input wanted — the pattern map is the product's tactile personality.**
> The values below are the spec's stated defaults and are implementable as
> written; treat them as a starting point to tune on-device, not as settled.
> Decision 3(a) is resolved here as "reduced-motion silences haptics" — flipping
> it means deleting one condition in `haptic()`.

- [ ] **Step 1: Write the failing tests**

Create `lib/haptics.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { canVibrate, haptic, HAPTIC_PATTERNS } from "./haptics";

function stubVibrate(fn: ((pattern: number | number[]) => boolean) | undefined) {
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: fn,
  });
}

function stubReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: reduce,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe("haptics", () => {
  afterEach(() => {
    stubVibrate(undefined);
    vi.restoreAllMocks();
  });

  it("reports no capability where navigator.vibrate is absent (iOS)", () => {
    stubVibrate(undefined);
    expect(canVibrate()).toBe(false);
  });

  it("reports capability where navigator.vibrate exists (Android Chrome)", () => {
    stubVibrate(vi.fn(() => true));
    expect(canVibrate()).toBe(true);
  });

  it("no-ops silently without capability rather than throwing", () => {
    stubVibrate(undefined);
    stubReducedMotion(false);
    expect(() => haptic("commit")).not.toThrow();
  });

  it("fires the pattern registered for the event", () => {
    const vibrate = vi.fn(() => true);
    stubVibrate(vibrate);
    stubReducedMotion(false);

    haptic("commit");

    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.commit);
  });

  it("stays silent when the user prefers reduced motion", () => {
    const vibrate = vi.fn(() => true);
    stubVibrate(vibrate);
    stubReducedMotion(true);

    haptic("commit");

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("defines a pattern for every event in the vocabulary", () => {
    const events: Array<keyof typeof HAPTIC_PATTERNS> = ["tap", "commit", "reveal"];
    for (const event of events) {
      expect(HAPTIC_PATTERNS[event]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/haptics.test.ts`
Expected: FAIL — `Failed to resolve import "./haptics"`.

- [ ] **Step 3: Write the implementation**

Create `lib/haptics.ts`:

```typescript
"use client";

/**
 * Haptic feedback for the installed Android app.
 *
 * `navigator.vibrate` is Android/Chrome only — iOS Safari and iOS PWAs do not
 * implement it, so every call is a silent no-op there. Haptics are a
 * progressive enhancement: never gate behavior, feedback, or state on them.
 *
 * Call sites name intent (`haptic("commit")`) rather than durations so the
 * physical vocabulary stays tunable in one place.
 */

/** The tactile vocabulary. Every member needs a pattern in HAPTIC_PATTERNS. */
export type HapticEvent =
  /** A light tick under an ordinary primary control. */
  | "tap"
  /** The action that pays — commit CTAs. */
  | "commit"
  /** The money landing on the Earn reveal: the journey's peak moment. */
  | "reveal";

/**
 * Vibration patterns in milliseconds, following the `navigator.vibrate`
 * contract: a bare number is one buzz; an array alternates
 * vibrate/pause/vibrate.
 *
 * Keep these short and few. Over-vibration is the fastest way to make haptics
 * feel cheap, and `ActStep.tsx:32` already commits the product to restraint —
 * "a settle, not a confetti cannon".
 */
export const HAPTIC_PATTERNS: Record<HapticEvent, number | number[]> = {
  tap: 10,
  commit: [14, 44, 22],
  reveal: [0, 26, 70, 18],
};

/** Whether the current browser exposes the Vibration API at all. */
export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fire the haptic registered for `event`, if the platform supports it and the
 * user has not asked for reduced motion.
 *
 * There is no `prefers-reduced-haptics` query. Reduced-motion is the closest
 * available signal and is honored here as the conservative default; if the
 * product decides haptics should survive it, delete the condition below.
 */
export function haptic(event: HapticEvent): void {
  if (!canVibrate() || prefersReducedMotion()) return;
  navigator.vibrate(HAPTIC_PATTERNS[event]);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/haptics.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/haptics.ts lib/haptics.test.ts
git commit -m "feat(mobile): add the haptic vocabulary module"
```

---

### Task 5: Fire haptics at the two call sites

Per the spec's default vocabulary: primary/commit CTA presses, and the money reveal. Step advance is deliberately *not* separate — it is caused by the CTA press that already fired.

**Files:**
- Modify: `components/ui/Button.tsx`
- Modify: `components/studio/mobile/journey/EarnStep.tsx`

**Interfaces:**
- Consumes: `haptic`, `HapticEvent` from Task 4
- Produces: nothing new

- [ ] **Step 1: Fire on press in `Button.tsx`**

Add the import:

```typescript
import { haptic } from "@/lib/haptics";
```

Then replace the `onClick` handling. The component currently spreads `...props` straight onto the element; destructure `onClick` out of the props and wrap it:

```tsx
      onClick={(event) => {
        // Only the two weightiest intents buzz. Secondary and ghost stay
        // silent — buzzing every control is what makes haptics feel cheap.
        if (variant === "commit") {
          haptic("commit");
        } else if (variant === "primary") {
          haptic("tap");
        }
        onClick?.(event);
      }}
```

Add `onClick` to the destructured parameter list beside `disabled`, `type`, `className`, so it is no longer part of the `...props` spread.

- [ ] **Step 2: Fire on the money reveal in `EarnStep.tsx`**

Add the imports:

```typescript
import { useEffect } from "react";
import { haptic } from "@/lib/haptics";
```

Inside `EarnStep`, before the `return`:

```typescript
  // The journey's peak moment: the figure landing gets its own haptic, fired
  // once per mount rather than on every rent recalculation.
  useEffect(() => {
    haptic("reveal");
  }, []);
```

- [ ] **Step 3: Run the affected suites**

Run: `npm run test`
Expected: PASS. `test/setup.ts` leaves `navigator.vibrate` undefined in jsdom, so `haptic()` no-ops and existing button/step tests are unaffected — that no-op path is exactly what Task 4's third test pins.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/studio/mobile/journey/EarnStep.tsx
git commit -m "feat(mobile): fire haptics on commit CTAs and the money reveal"
```

---

### Task 6: Directional step transitions

**Files:**
- Modify: `components/studio/mobile/journey/MobileJourney.tsx`
- Test: `components/studio/mobile/journey/MobileJourney.test.tsx`

**Interfaces:**
- Consumes: `.lf-journey-surface` from Task 1; `DerivedJourneyStep` from `@/lib/mobile-journey`
- Produces: nothing new

- [ ] **Step 1: Write the failing tests**

Append to `MobileJourney.test.tsx` (keep the existing skip-link test):

```tsx
  it("keeps one stable wrapper node across step changes", () => {
    // ShapeStep carries the WebGL scene (FeasibilityStudio.tsx:648). If this
    // wrapper is ever keyed by step, React remounts the subtree and rebuilds
    // the GL context twice per session. This test is that regression guard.
    const steps = (current: string) =>
      ["find", "earn", "shape"].map((id) => ({
        id,
        label: id,
        state: id === current ? "current" : "done",
      })) as never;

    const { rerender, container } = render(
      <MobileJourney header={<header />} steps={steps("find")} onStepSelect={vi.fn()}>
        <p>Step content</p>
      </MobileJourney>,
    );
    const before = container.querySelector("[data-journey-surface]");

    rerender(
      <MobileJourney header={<header />} steps={steps("shape")} onStepSelect={vi.fn()}>
        <p>Step content</p>
      </MobileJourney>,
    );
    const after = container.querySelector("[data-journey-surface]");

    expect(before).not.toBeNull();
    expect(after).toBe(before);
  });

  it("animates forward and backward moves in opposite directions", () => {
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });

    const steps = (current: string) =>
      ["find", "earn", "shape"].map((id) => ({
        id,
        label: id,
        state: id === current ? "current" : "done",
      })) as never;

    const { rerender } = render(
      <MobileJourney header={<header />} steps={steps("find")} onStepSelect={vi.fn()}>
        <p>Step content</p>
      </MobileJourney>,
    );

    // No animation on first paint — there is no previous step to move from.
    expect(animate).not.toHaveBeenCalled();

    rerender(
      <MobileJourney header={<header />} steps={steps("shape")} onStepSelect={vi.fn()}>
        <p>Step content</p>
      </MobileJourney>,
    );
    const forward = animate.mock.calls[0][0] as Keyframe[];

    rerender(
      <MobileJourney header={<header />} steps={steps("find")} onStepSelect={vi.fn()}>
        <p>Step content</p>
      </MobileJourney>,
    );
    const backward = animate.mock.calls[1][0] as Keyframe[];

    expect(forward[0].transform).toBe("translateX(12px)");
    expect(backward[0].transform).toBe("translateX(-12px)");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/studio/mobile/journey/MobileJourney.test.tsx`
Expected: FAIL — no `[data-journey-surface]` node, and `animate` never called.

- [ ] **Step 3: Write the implementation**

Replace `components/studio/mobile/journey/MobileJourney.tsx` in full:

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { DerivedJourneyStep, MobileJourneyStep } from "@/lib/mobile-journey";
import JourneyRail from "./JourneyRail";

/** Travel distance for a reveal transition — a settle, not a carousel swipe. */
const TRAVEL_PX = 12;

/**
 * `useLayoutEffect` warns when React renders on the server. The animation only
 * ever runs client-side, but the hook must still be called unconditionally.
 */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Props for {@link MobileJourney}. */
export interface MobileJourneyProps {
  /** The mobile header bar. */
  header: ReactNode;
  /** The five reveals with derived lifecycle states. */
  steps: DerivedJourneyStep[];
  /** Navigate back one step; omitted on the first step. */
  onBack?: () => void;
  /** Jump to a previously completed step. */
  onStepSelect: (id: MobileJourneyStep) => void;
  /** The active step's full-screen content. */
  children: ReactNode;
}

/**
 * Mobile five-reveal journey shell (issue #130): a pinned header and compact
 * progress rail over one full-screen step at a time. Replaces the old
 * StepProgress + bottom-sheet composition — each reveal owns the whole screen
 * with a single primary action, and the step content scrolls on its own.
 *
 * The scrolling surface is deliberately **not** keyed by step. `ShapeStep`
 * receives the WebGL scene as a prop (`FeasibilityStudio.tsx:648`), so a keyed
 * remount would tear down and rebuild the GL context on every entry to and
 * exit from Shape. Transitions therefore replay imperatively on a stable node.
 */
export default function MobileJourney({
  header,
  steps,
  onBack,
  onStepSelect,
  children,
}: MobileJourneyProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const previousIndexRef = useRef<number | null>(null);
  const activeIndex = steps.findIndex((step) => step.state === "current");

  useIsomorphicLayoutEffect(() => {
    const node = surfaceRef.current;
    const previous = previousIndexRef.current;
    previousIndexRef.current = activeIndex;

    if (!node || previous === null || previous === activeIndex || activeIndex < 0) return;
    if (typeof node.animate !== "function") return;
    // The global reduced-motion kill switch (app/globals.css:378) forces
    // `animation-duration: 0.01ms !important`, but that governs CSS animations
    // only — WAAPI is a separate stack and ignores it. Check explicitly, or
    // reduced-motion users get the full slide.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const from = activeIndex > previous ? TRAVEL_PX : -TRAVEL_PX;
    node.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 200, easing: "ease-out" },
    );
  }, [activeIndex]);

  return (
    <div
      data-testid="mobile-journey"
      className="lf-journey-surface flex h-dvh flex-col overflow-hidden bg-lf-sand"
    >
      <div className="relative z-(--z-index-nav) shrink-0">{header}</div>
      <div className="relative z-(--z-index-header) shrink-0">
        <JourneyRail steps={steps} onBack={onBack} onStepSelect={onStepSelect} />
      </div>
      <main
        ref={surfaceRef}
        data-journey-surface=""
        id="main-content"
        tabIndex={-1}
        className="lf-journey-surface min-h-0 flex-1 overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/studio/mobile/journey/MobileJourney.test.tsx`
Expected: PASS, 3 tests (the original skip-link test plus the two new ones).

- [ ] **Step 5: Run the full release gate**

Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
Expected: all four pass.

- [ ] **Step 6: Commit**

```bash
git add components/studio/mobile/journey/MobileJourney.tsx components/studio/mobile/journey/MobileJourney.test.tsx
git commit -m "feat(mobile): add directional reveal transitions"
```

---

### Task 7: On-device verification

**Not automatable.** `navigator.vibrate` is fire-and-forget with no observable result, and pull-to-refresh cannot be driven from Playwright. This task exists so neither is mistaken for covered.

**Files:** none

- [ ] **Step 1: Build and install the TWA on a physical Android device**

Follow `docs/store-deployment-readiness.md` §2. An emulator is not sufficient — emulators do not vibrate.

- [ ] **Step 2: Walk the journey and confirm each behavior**

| Check | Expected |
|---|---|
| Advance Find → Earn → Shape, then press the system back gesture | Returns to Earn. The app does **not** close and the study survives. |
| Press back repeatedly to Find, then once more | The app closes — correct for the first screen. |
| Swipe down at the top of any reveal | Nothing reloads. No pull-to-refresh spinner. |
| Tap any primary or commit CTA | A short buzz. No translucent highlight box on tap. |
| Arrive on the Earn reveal | A distinct softer double-pulse as the figure lands. |
| Tap secondary buttons (Save scenario, Share link) | Silent. |
| Enable system-wide reduced motion, repeat | No buzz, no slide, journey still fully usable. |
| Long-press a money figure or address | Text selects — content stays copyable. |
| Long-press the rail or a button label | No selection. |

- [ ] **Step 3: Record the result**

Note the outcome in `docs/release-checklist.md` under the mobile section, including the device model and Android version tested. If any haptic feels wrong, tune `HAPTIC_PATTERNS` in `lib/haptics.ts` and re-verify — that map is meant to be adjusted from device feel, not from theory.

- [ ] **Step 4: Commit**

```bash
git add docs/release-checklist.md
git commit -m "docs(mobile): record on-device native-feel verification"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Back button exits the app (problem 1) | 2, 3 |
| Pull-to-refresh wipes journey (problem 2) | 1, 6 (`.lf-journey-surface` on the scroller) |
| No haptics (problem 3) | 4, 5 |
| Tap-highlight flash (problem 4) | 1 |
| No step transition (problem 5) | 6 |
| Same-URL history entries (privacy rule) | 2, Step 1 test + Step 3 comment |
| `CertificatePanel` `replaceState` collision | 2, Step 1 test 5 + Step 3 handler |
| `overscroll-behavior-y: contain`, scoped | 1, 6 |
| Decision 3(a) reduced-motion silences haptics | 4 |
| Decision 3(b) vocabulary defaults | 4, 5 |
| WAAPI on a stable node, no key remount | 6 (with an explicit regression guard test) |
| WAAPI ignores the CSS reduced-motion kill switch | 6, Step 3 |
| Motion values 200ms ease-out, ±12px | 6 |
| `user-select` on chrome but not content | 1 |
| Haptics not automatable — manual gate | 7 |
| Release gate | 6, Step 5 |

No gaps.

**Placeholder scan:** No TBD/TODO. Every code step carries runnable code. Task 4's owner-input note offers tuning on top of working defaults rather than blanks to fill.

**Type consistency:** `HapticEvent` / `HAPTIC_PATTERNS` / `canVibrate` / `haptic` are defined in Task 4 and consumed with matching names in Task 5. `useJourneyHistory` returns `JourneyHistoryControls { reset }` in Task 2 and is consumed as `journeyHistory.reset()` in Task 3. `JOURNEY_STEP_STATE_KEY` is exported in Task 2 and imported by its own test. `.lf-journey-surface` is defined in Task 1 and applied in Task 6. `data-journey-surface` is asserted in Task 6's test and rendered in Task 6's implementation.

## Deferred

Recorded in the spec, deliberately out of scope: `JourneyRail` step labels hidden below 440px, rail tap targets failing 44×44 at that width, and the under-designed `EarnStep` money reveal. The tap-target item is a genuine accessibility defect and should get its own plan.
