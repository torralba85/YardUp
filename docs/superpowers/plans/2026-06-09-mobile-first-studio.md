# Mobile-First Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give phone users a guided first-run wizard (address → ADU size → results teaser) that lands in a full-screen-scene studio with a draggable bottom sheet, while desktop keeps the existing dashboard unchanged.

**Architecture:** `FeasibilityStudio` stays the single state orchestrator and gains a viewport split at Tailwind's `lg` (1024px) breakpoint — it renders the existing `AppShell` desktop tree OR a new `MobileStudio` tree (never both; `ParcelScene` is a WebGL canvas and double-mounting doubles GPU memory). The wizard is a mobile-only overlay that writes estimated parcel data into the existing `ParcelProvider`; signing up upgrades it to live Regrid data via the existing `searchParcel`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Vaul (bottom sheet), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-09-mobile-first-studio-design.md`

---

## Codebase context (read this first)

- `components/FeasibilityStudio.tsx` — orchestrator. Holds `parcelId`, `config`, `assumptions`, scenario save/load, report/builder-lead modals. Renders `AppShell` → scene + (inspector | panels) + `MetricsSummary`.
- `lib/parcel-context.tsx` — `ParcelProvider` with `parcelMode: "preset" | "live"`, `searchParcel(lat, lng, address?)` (auth-gated server-side), `resetToPreset(preset)`.
- `lib/feasibility.ts` — pure engine. `parcelPresets` (ids: `oak-street` Seattle / `corner-lot` Portland / `compact-lot` Austin), `footprintOptions`, `configForFootprint`, `calculateFeasibility`, `defaultAduConfig`, `defaultFinancialAssumptions`, `finishLabels`, `formatCurrency`, `formatCompactCurrency`. When a parcel has no `expectedRent`, `calculateFeasibility` falls back to a lot-size rent heuristic — estimated parcels rely on this.
- `components/studio/AddressSearch.tsx` — Places autocomplete; `onSelect({lat, lng, formattedAddress})`, `onSubmitText(query)` fallback.
- `components/auth/AuthModal.tsx` — `{ isOpen, onClose }`, uses `useAuth()`.
- Tests: Vitest + jsdom, globals on, setup at `test/setup.ts`, alias `@` → repo root. Mock pattern: `vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.authState }))` (see `app/studio/page.test.tsx`).
- Playwright: `e2e/`, projects `desktop-chromium` (1440×900) and `mobile-chromium` (390×844). Both projects run every spec — guard with `test.skip(({ viewport }) => ...)`.
- Lint is `--max-warnings=0`. The codebase pattern for intentional set-state-in-effect is an explicit `/* eslint-disable react-hooks/set-state-in-effect */` block (see `FeasibilityStudio.tsx:132`).

**Verification commands (every task ends green):**

```bash
npm run test        # Vitest
npx tsc --noEmit    # types
npm run lint        # zero warnings
```

---

### Task 1: Add Vaul dependency

**Files:**
- Modify: `package.json`

- [x] **Step 1: Install vaul**

```bash
npm install vaul
```

Expected: `vaul` appears in `package.json` dependencies (^1.x). Vaul is the Radix-based drawer with snap-point support; it supports React 19.

- [x] **Step 2: Verify the project still builds types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(mobile): add vaul bottom-sheet dependency"
```

---

### Task 2: `useMediaQuery` hook

**Files:**
- Create: `lib/use-media-query.ts`
- Test: `lib/use-media-query.test.ts`

`useSyncExternalStore`-based so the server snapshot is deterministic: during SSR/hydration it returns `serverDefault` (we pass `true` = desktop, preserving today's server HTML), then re-renders with the real `matchMedia` result after hydration. That switch unmounts the desktop tree before the mobile one mounts — no double WebGL canvas, no hydration mismatch.

- [x] **Step 1: Write the failing test**

```ts
// lib/use-media-query.test.ts
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./use-media-query";

type Listener = () => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initialMatches,
    media: "",
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    setMatches(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the current matchMedia result", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)", false));
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)", true));
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/use-media-query.test.ts`
Expected: FAIL — `Cannot find module './use-media-query'`

- [x] **Step 3: Write the implementation**

```ts
// lib/use-media-query.ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. `serverDefault` is what SSR and the first
 * hydration pass report — pass `true` for desktop-first queries so server
 * HTML stays the desktop tree; the client corrects itself right after
 * hydration without a mismatch error.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/use-media-query.test.ts`
Expected: 2 passed.

- [x] **Step 5: Commit**

```bash
git add lib/use-media-query.ts lib/use-media-query.test.ts
git commit -m "feat(mobile): add useMediaQuery hook for viewport tree split"
```

---

### Task 3: Estimated-parcel builder

**Files:**
- Create: `lib/estimated-parcel.ts`
- Test: `lib/estimated-parcel.test.ts`

Anonymous wizard users get a parcel built from the nearest demo preset by state (WA → `oak-street`, OR → `corner-lot`, TX → `compact-lot`, anything else → `oak-street`), re-addressed to their geocoded location. It deliberately has **no** `expectedRent`, so `calculateFeasibility` uses its lot-size rent heuristic.

- [x] **Step 1: Write the failing test**

```ts
// lib/estimated-parcel.test.ts
import { describe, expect, it } from "vitest";
import { buildEstimatedParcel, extractStateAbbrev } from "./estimated-parcel";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";

describe("extractStateAbbrev", () => {
  it("finds the state in a Google formatted address", () => {
    expect(extractStateAbbrev("123 Maple St, Seattle, WA 98115, USA")).toBe("WA");
    expect(extractStateAbbrev("44 Mesa Ct, Austin, TX 78704, USA")).toBe("TX");
  });

  it("returns null when no state token exists", () => {
    expect(extractStateAbbrev("somewhere unknowable")).toBeNull();
  });
});

describe("buildEstimatedParcel", () => {
  const input = { lat: 47.68, lng: -122.3, formattedAddress: "123 Maple St, Seattle, WA 98115, USA" };

  it("uses the matching state preset's lot dimensions", () => {
    const parcel = buildEstimatedParcel(input);
    const base = parcelPresets.find((p) => p.id === "oak-street")!;
    expect(parcel.basePresetId).toBe("oak-street");
    expect(parcel.lotArea).toBe(base.lotArea);
    expect(parcel.setbacks).toEqual(base.setbacks);
    expect(parcel.source).toBe("estimated");
    expect(parcel.lat).toBe(47.68);
  });

  it("keeps the user's street address and city", () => {
    const parcel = buildEstimatedParcel(input);
    expect(parcel.address).toBe("123 Maple St");
    expect(parcel.city).toContain("Seattle");
  });

  it("falls back to the Seattle preset for unknown states", () => {
    const parcel = buildEstimatedParcel({ lat: 1, lng: 2, formattedAddress: "9 Elm St, Denver, CO 80202, USA" });
    expect(parcel.basePresetId).toBe("oak-street");
  });

  it("feeds calculateFeasibility via the rent heuristic (no expectedRent)", () => {
    const parcel = buildEstimatedParcel(input);
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    expect(result.monthlyRent).toBeGreaterThan(0);
    expect("expectedRent" in parcel).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/estimated-parcel.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Write the implementation**

```ts
// lib/estimated-parcel.ts
import { parcelPresets } from "./feasibility";
import type { Parcel } from "./parcel-types";

/**
 * A parcel for anonymous wizard users: the nearest demo preset's lot
 * dimensions re-addressed to the user's geocoded location. Carries no
 * expectedRent so calculateFeasibility's lot-size heuristic applies.
 * Upgraded to LiveParcelData after sign-up via searchParcel(lat, lng).
 */
export interface EstimatedParcel extends Parcel {
  lat: number;
  lng: number;
  basePresetId: string;
  source: "estimated";
}

const STATE_PRESET_MAP: Record<string, string> = {
  WA: "oak-street",
  OR: "corner-lot",
  TX: "compact-lot",
};

/** Pull a two-letter state code out of a Google formatted address. */
export function extractStateAbbrev(formattedAddress: string): string | null {
  const match = formattedAddress.match(/,\s*([A-Z]{2})(?:\s+\d{5})?(?:,|$)/);
  return match ? match[1] : null;
}

export function buildEstimatedParcel(input: {
  lat: number;
  lng: number;
  formattedAddress: string;
}): EstimatedParcel {
  const state = extractStateAbbrev(input.formattedAddress);
  const presetId = (state && STATE_PRESET_MAP[state]) || parcelPresets[0].id;
  const base = parcelPresets.find((p) => p.id === presetId) ?? parcelPresets[0];
  const [street, ...rest] = input.formattedAddress.split(",");

  return {
    address: street.trim() || input.formattedAddress,
    city: rest.join(",").trim() || base.city,
    lotArea: base.lotArea,
    lotWidth: base.lotWidth,
    lotLength: base.lotLength,
    existingHouseSqft: base.existingHouseSqft,
    maxLotCoveragePercent: base.maxLotCoveragePercent,
    setbacks: { ...base.setbacks },
    lat: input.lat,
    lng: input.lng,
    basePresetId: base.id,
    source: "estimated",
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/estimated-parcel.test.ts`
Expected: 6 passed. (If `extractStateAbbrev` misses the `", WA 98115,"` form, fix the regex, not the test.)

- [x] **Step 5: Commit**

```bash
git add lib/estimated-parcel.ts lib/estimated-parcel.test.ts
git commit -m "feat(mobile): add estimated parcel builder for anonymous wizard"
```

---

### Task 4: `estimated` parcel mode in ParcelProvider

**Files:**
- Modify: `lib/parcel-context.tsx`
- Test: `lib/parcel-context.test.tsx` (new)

- [x] **Step 1: Write the failing test**

```tsx
// lib/parcel-context.test.tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("./auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

import { ParcelProvider, useParcel } from "./parcel-context";
import { parcelPresets } from "./feasibility";
import { buildEstimatedParcel } from "./estimated-parcel";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ParcelProvider initialPreset={parcelPresets[0]}>{children}</ParcelProvider>
);

describe("ParcelProvider estimated mode", () => {
  it("starts in preset mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    expect(result.current.parcelMode).toBe("preset");
  });

  it("setEstimatedParcel switches to estimated mode with the estimated parcel", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 47.68,
      lng: -122.3,
      formattedAddress: "123 Maple St, Seattle, WA 98115, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));

    expect(result.current.parcelMode).toBe("estimated");
    expect(result.current.parcel.address).toBe("123 Maple St");
    expect(result.current.parcelError).toBeNull();
  });

  it("resetToPreset clears estimated mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 1,
      lng: 2,
      formattedAddress: "9 Elm St, Denver, CO 80202, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));
    act(() => result.current.resetToPreset(parcelPresets[0]));

    expect(result.current.parcelMode).toBe("preset");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parcel-context.test.tsx`
Expected: FAIL — `setEstimatedParcel` does not exist / type error.

- [x] **Step 3: Extend the context**

In `lib/parcel-context.tsx`:

```ts
// import block — add:
import type { EstimatedParcel } from "./estimated-parcel";

// change:
export type ParcelMode = "preset" | "estimated" | "live";
export type AnyParcel = LiveParcelData | ParcelPreset | EstimatedParcel;

// ParcelContextValue — add member:
  /** Apply an anonymous estimated parcel (wizard flow) — switches to estimated mode. */
  setEstimatedParcel: (estimated: EstimatedParcel) => void;
```

In `ParcelProvider`, add alongside `restoreLiveParcel`:

```ts
  const setEstimatedParcel = useCallback((estimated: EstimatedParcel) => {
    setParcel(estimated);
    setParcelMode("estimated");
    setParcelError(null);
  }, []);
```

…and add `setEstimatedParcel` to the provider `value={{ ... }}` object.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/parcel-context.test.tsx && npx tsc --noEmit`
Expected: 3 passed; no type errors. (`FeasibilityStudio.tsx` still compiles because `parcelMode === "live"` checks remain valid against the widened union.)

- [x] **Step 5: Commit**

```bash
git add lib/parcel-context.tsx lib/parcel-context.test.tsx
git commit -m "feat(mobile): add estimated parcel mode to ParcelProvider"
```

---

### Task 5: Wizard state module

**Files:**
- Create: `lib/wizard-state.ts`
- Test: `lib/wizard-state.test.ts`

Pure logic for step order and the show-once rule. The show decision is computed **on mount, before** `FeasibilityStudio`'s URL-write effect appends scenario params, so `hasUrlScenario` reflects an actually-shared link.

- [x] **Step 1: Write the failing test**

```ts
// lib/wizard-state.test.ts
import { describe, expect, it } from "vitest";
import { WIZARD_SEEN_KEY, markWizardSeen, nextStep, shouldShowWizard } from "./wizard-state";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("nextStep", () => {
  it("advances address → size → results and stays at results", () => {
    expect(nextStep("address")).toBe("size");
    expect(nextStep("size")).toBe("results");
    expect(nextStep("results")).toBe("results");
  });
});

describe("shouldShowWizard", () => {
  it("shows for a fresh visitor with a clean URL", () => {
    expect(shouldShowWizard({ hasUrlScenario: false, storage: fakeStorage() })).toBe(true);
  });

  it("hides when a scenario URL is being opened", () => {
    expect(shouldShowWizard({ hasUrlScenario: true, storage: fakeStorage() })).toBe(false);
  });

  it("hides after the wizard was seen", () => {
    const storage = fakeStorage({ [WIZARD_SEEN_KEY]: "1" });
    expect(shouldShowWizard({ hasUrlScenario: false, storage })).toBe(false);
  });

  it("hides (fails closed) when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
    };
    expect(shouldShowWizard({ hasUrlScenario: false, storage })).toBe(false);
  });
});

describe("markWizardSeen", () => {
  it("persists the seen flag", () => {
    const storage = fakeStorage();
    markWizardSeen(storage);
    expect(storage.getItem(WIZARD_SEEN_KEY)).toBe("1");
  });

  it("swallows storage errors", () => {
    expect(() =>
      markWizardSeen({
        setItem: () => {
          throw new Error("denied");
        },
      }),
    ).not.toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/wizard-state.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Write the implementation**

```ts
// lib/wizard-state.ts

/** First-run wizard steps, in order. */
export type WizardStep = "address" | "size" | "results";

export const WIZARD_SEEN_KEY = "lf-wizard-seen";

const ORDER: WizardStep[] = ["address", "size", "results"];

export function nextStep(step: WizardStep): WizardStep {
  const index = ORDER.indexOf(step);
  return ORDER[Math.min(index + 1, ORDER.length - 1)];
}

interface ShowWizardInput {
  hasUrlScenario: boolean;
  storage: Pick<Storage, "getItem">;
}

/**
 * Show the wizard only to fresh visitors opening a clean URL. Fails closed
 * (no wizard) if storage is unavailable — a broken first-run overlay is
 * worse than no overlay.
 */
export function shouldShowWizard({ hasUrlScenario, storage }: ShowWizardInput): boolean {
  if (hasUrlScenario) return false;
  try {
    return storage.getItem(WIZARD_SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markWizardSeen(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(WIZARD_SEEN_KEY, "1");
  } catch {
    // Private-mode storage denial — the wizard may show again next visit.
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/wizard-state.test.ts`
Expected: 7 passed.

- [x] **Step 5: Commit**

```bash
git add lib/wizard-state.ts lib/wizard-state.test.ts
git commit -m "feat(mobile): add wizard step and show-once logic"
```

---

### Task 6: Open `/studio` to guests

**Files:**
- Modify: `app/studio/page.tsx`
- Modify: `app/studio/page.test.tsx`

Per the spec amendment: the page-level login redirect goes away; guests get the demo/estimated studio. Live parcel data stays auth-gated server-side (`/api/parcel` already enforces this).

- [x] **Step 1: Update the test to the new contract**

Replace the body of `app/studio/page.test.tsx`'s describe block (keep the existing mocks and imports):

```tsx
describe("StudioPage", () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.authState.loading = false;
    mocks.authState.user = null;
  });

  it("renders the studio for guests without redirecting", () => {
    render(<StudioPage />);

    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows the loading splash while auth state resolves", () => {
    mocks.authState.loading = true;

    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    expect(screen.getByText("Loading studio...")).toBeInTheDocument();
  });

  it("renders the studio for signed-in users", () => {
    mocks.authState.user = { uid: "user-1" };

    render(<StudioPage />);

    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
  });
});
```

Remove the now-unused `waitFor` import if ESLint flags it.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/studio/page.test.tsx`
Expected: FAIL — guests are currently redirected, mock never renders.

- [x] **Step 3: Rewrite the page**

```tsx
// app/studio/page.tsx
"use client";

import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";

export default function StudioPage() {
  const { loading } = useAuth();

  // Wait for auth to resolve so saved scenarios and live-parcel access are
  // known before first render; guests proceed to the demo/estimated studio.
  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-lf-sand">
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-lf-mahogany">
            LotFoundry
          </div>
          <p className="mt-2 text-sm text-lf-muted">Loading studio...</p>
        </div>
      </div>
    );
  }

  return <FeasibilityStudio />;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/studio/page.test.tsx && npm run lint`
Expected: 3 passed; lint clean (the `useRouter`/`useEffect` imports are gone).

- [x] **Step 5: Commit**

```bash
git add app/studio/page.tsx app/studio/page.test.tsx
git commit -m "feat(studio): open studio page to guests for wizard funnel"
```

---

### Task 7: `StudioSheet` bottom sheet

**Files:**
- Create: `components/studio/mobile/StudioSheet.tsx`
- Test: `components/studio/mobile/StudioSheet.test.tsx`

Vaul drawer, always open, non-modal (the scene stays interactive at peek), three snap points. Content scrolls only at full snap. A chevron button cycles snaps so E2E and keyboard users don't depend on drag gestures.

- [x] **Step 1: Write the failing test**

```tsx
// components/studio/mobile/StudioSheet.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import StudioSheet, { FULL_SNAP, HALF_SNAP, PEEK_SNAP } from "./StudioSheet";

beforeAll(() => {
  // Vaul touches these browser APIs that jsdom lacks.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    });
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("StudioSheet", () => {
  it("renders peek, controls and sections content", () => {
    render(
      <StudioSheet
        snap={PEEK_SNAP}
        onSnapChange={() => {}}
        peek={<div>peek-metrics</div>}
        controls={<div>config-controls</div>}
        sections={<div>deep-sections</div>}
      />,
    );

    expect(screen.getByText("peek-metrics")).toBeInTheDocument();
    expect(screen.getByText("config-controls")).toBeInTheDocument();
    expect(screen.getByText("deep-sections")).toBeInTheDocument();
  });

  it("expand button advances peek → half → full, then collapses back to peek", async () => {
    const user = userEvent.setup();
    const onSnapChange = vi.fn();
    const { rerender } = render(
      <StudioSheet snap={PEEK_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );

    await user.click(screen.getByRole("button", { name: /expand panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(HALF_SNAP);

    rerender(
      <StudioSheet snap={HALF_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );
    await user.click(screen.getByRole("button", { name: /expand panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(FULL_SNAP);

    rerender(
      <StudioSheet snap={FULL_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );
    await user.click(screen.getByRole("button", { name: /collapse panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(PEEK_SNAP);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/studio/mobile/StudioSheet.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Write the implementation**

```tsx
// components/studio/mobile/StudioSheet.tsx
"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "vaul";

export const PEEK_SNAP = "148px";
export const HALF_SNAP = 0.5;
export const FULL_SNAP = 0.96;

export type SheetSnap = number | string;

export interface StudioSheetProps {
  snap: SheetSnap | null;
  onSnapChange: (snap: SheetSnap | null) => void;
  /** Always-visible strip: headline metrics + config chips. */
  peek: ReactNode;
  /** Visible from half snap: ADU configuration controls. */
  controls: ReactNode;
  /** Scrollable at full snap: summary, permits, inspiration, export. */
  sections: ReactNode;
}

export default function StudioSheet({ snap, onSnapChange, peek, controls, sections }: StudioSheetProps) {
  const isFull = snap === FULL_SNAP;
  const isPeek = snap === PEEK_SNAP || snap === null;

  function cycleSnap() {
    if (isPeek) onSnapChange(HALF_SNAP);
    else if (snap === HALF_SNAP) onSnapChange(FULL_SNAP);
    else onSnapChange(PEEK_SNAP);
  }

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={[PEEK_SNAP, HALF_SNAP, FULL_SNAP]}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-testid="studio-sheet"
          aria-label="Feasibility controls"
          className="fixed bottom-0 left-0 right-0 z-40 flex h-[96dvh] flex-col rounded-t-2xl border-t border-lf-hairline bg-lf-card shadow-[0_-8px_28px_rgba(38,19,7,0.3)] outline-none"
        >
          <Drawer.Title className="sr-only">Feasibility controls</Drawer.Title>
          <div className="relative shrink-0 pt-2">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-lf-taupe/40" />
            <button
              type="button"
              aria-label={isFull ? "Collapse panel" : "Expand panel"}
              onClick={cycleSnap}
              className="absolute right-3 top-1 flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-lf-espresso"
            >
              {isFull ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
          <div className="shrink-0 px-4 pb-2 pt-1">{peek}</div>
          <div className={`min-h-0 flex-1 px-4 pb-8 ${isFull ? "overflow-y-auto" : "overflow-hidden"}`}>
            <div className="flex flex-col gap-6">
              {controls}
              {sections}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/studio/mobile/StudioSheet.test.tsx`
Expected: 2 passed. If Vaul throws on a missing jsdom API, stub that API in the test's `beforeAll` (same pattern as ResizeObserver) — do not mock Vaul itself.

- [x] **Step 5: Commit**

```bash
git add components/studio/mobile/StudioSheet.tsx components/studio/mobile/StudioSheet.test.tsx
git commit -m "feat(mobile): add vaul-based studio bottom sheet"
```

---

### Task 8: `MobileHeader` and `PeekMetrics`

**Files:**
- Create: `components/studio/mobile/MobileHeader.tsx`
- Create: `components/studio/mobile/PeekMetrics.tsx`
- Test: `components/studio/mobile/PeekMetrics.test.tsx`

Two small presentational pieces. `PeekMetrics` is the sheet's always-visible strip: rent / build range / payback, config chips, an "estimated" badge, and the live-fetch error + retry affordance from the spec.

- [x] **Step 1: Write the failing PeekMetrics test**

```tsx
// components/studio/mobile/PeekMetrics.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PeekMetrics from "./PeekMetrics";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";

const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions, parcelPresets[0].expectedRent);

describe("PeekMetrics", () => {
  it("shows rent, build range, payback and config chips", () => {
    render(<PeekMetrics result={result} config={defaultAduConfig} estimated={false} />);

    expect(screen.getByText("$2,050")).toBeInTheDocument(); // oak-street conservative rent
    expect(screen.getByText(`${result.paybackYears} yrs`)).toBeInTheDocument();
    expect(screen.getByText("600 ft²")).toBeInTheDocument();
    expect(screen.getByText("Cedar")).toBeInTheDocument();
    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
  });

  it("shows the estimated badge in estimated mode", () => {
    render(<PeekMetrics result={result} config={defaultAduConfig} estimated />);
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
  });

  it("surfaces a live-data error with a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <PeekMetrics
        result={result}
        config={defaultAduConfig}
        estimated
        parcelError="Live parcel lookup failed."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Live parcel lookup failed.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/studio/mobile/PeekMetrics.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Write PeekMetrics**

```tsx
// components/studio/mobile/PeekMetrics.tsx
import { finishLabels, formatCompactCurrency, formatCurrency, type ADUConfig } from "@/lib/feasibility";
import type { FeasibilityResult } from "@/components/studio/types";

export interface PeekMetricsProps {
  result: FeasibilityResult;
  config: ADUConfig;
  estimated: boolean;
  parcelError?: string | null;
  onRetry?: () => void;
}

export default function PeekMetrics({ result, config, estimated, parcelError, onRetry }: PeekMetricsProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Rent / mo" value={formatCurrency(result.monthlyRent)} />
        <Metric
          label="Build"
          value={`${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`}
        />
        <Metric label="Payback" value={`${result.paybackYears} yrs`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip>{config.footprint} ft²</Chip>
        <Chip>{finishLabels[config.finish]}</Chip>
        {estimated && (
          <span className="rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-espresso">
            estimated
          </span>
        )}
      </div>
      {parcelError && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-lf-clay/40 bg-lf-clay/10 px-2.5 py-1.5 text-xs text-lf-espresso">
          <span>{parcelError}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 shrink-0 px-2 font-semibold text-lf-clay underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-lf-hairline bg-white/60 px-2.5 py-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-lf-taupe">{label}</p>
      <p className="font-display text-base font-semibold tabular-nums text-lf-espresso">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-lf-hairline bg-white/60 px-2 py-0.5 text-[11px] text-lf-espresso">
      {children}
    </span>
  );
}
```

- [x] **Step 4: Write MobileHeader (presentational, covered by E2E + MobileStudio render)**

```tsx
// components/studio/mobile/MobileHeader.tsx
"use client";

import { useState } from "react";
import { RotateCcw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";

export interface MobileHeaderProps {
  address: string;
  estimated: boolean;
  onReset: () => void;
}

export default function MobileHeader({ address, estimated, onReset }: MobileHeaderProps) {
  const { user, profile, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const initial = (profile?.displayName || profile?.email || "U").slice(0, 1).toUpperCase();

  return (
    <header className="flex items-center gap-2 border-b border-white/10 bg-lf-mahogany px-3 py-2 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/lotfoundry-lockup-horizontal-inverse.svg" alt="LotFoundry" className="h-6 w-auto" />
      <span className="min-w-0 flex-1 truncate rounded-full bg-white/10 px-2.5 py-1 text-xs text-lf-sand">
        {address}
        {estimated && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-lf-amber">est.</span>}
      </span>
      <button
        type="button"
        aria-label="Reset scenario"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-white"
      >
        <RotateCcw size={17} />
      </button>
      {user ? (
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => void logout()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-lf-clay text-sm font-bold text-white"
        >
          {initial}
        </button>
      ) : (
        <button
          type="button"
          aria-label="Sign in"
          onClick={() => setAuthOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-white"
        >
          <UserRound size={18} />
        </button>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
```

Note: check `lib/auth-context.tsx` for the exact `logout` member name before using it (`AppShell.tsx` destructures `{ user, profile, logout }` — mirror that).

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/studio/mobile/PeekMetrics.test.tsx && npx tsc --noEmit`
Expected: 3 passed; no type errors.

- [x] **Step 6: Commit**

```bash
git add components/studio/mobile/PeekMetrics.tsx components/studio/mobile/PeekMetrics.test.tsx components/studio/mobile/MobileHeader.tsx
git commit -m "feat(mobile): add mobile header and peek metrics strip"
```

---

### Task 9: `WizardFlow`

**Files:**
- Create: `components/studio/mobile/WizardFlow.tsx`
- Test: `components/studio/mobile/WizardFlow.test.tsx`

The first-run overlay. It reads/writes parcel state via `useParcel` (it renders inside `ParcelProvider`) and signals completion to the parent with an optional config to apply. The results teaser is computed locally with pure engine functions — no parent round-trip.

Behavior contract:
- Step "address": `AddressSearch` select → store result, advance. Free-text submit (no Places key) → inline hint to pick a suggestion or use a demo chip (server geocoding is auth-gated). Demo chip → `resetToPreset(preset)` + `onComplete()`.
- Step "size": three cards (400/600/800 ft² via `configForFootprint`). Continue → advance.
- Step "results": teaser from `calculateFeasibility(buildEstimatedParcel(address), configForFootprint(footprint, defaultAduConfig), defaultFinancialAssumptions)`. Rent shown rounded to $100 with "~"; build/payback/zoning blurred. "Create free account" opens `AuthModal`. When `user` becomes non-null on this step: `setEstimatedParcel(estimated)` → `searchParcel(lat, lng, address)` (live upgrade) → `onComplete(config)`.
- "Skip — explore the demo lot" on every step: from results with an address chosen → `setEstimatedParcel(estimated)` + `onComplete(config)`; otherwise → `resetToPreset(parcelPresets[0])` + `onComplete()`.

- [x] **Step 1: Write the failing test**

```tsx
// components/studio/mobile/WizardFlow.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  authState: { user: null as null | { uid: string; getIdToken: () => Promise<string> }, profile: null, loading: false },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

// AddressSearch loads the Google Maps SDK — replace with a deterministic stub.
vi.mock("@/components/studio/AddressSearch", () => ({
  default: function MockAddressSearch({ onSelect }: { onSelect: (r: { lat: number; lng: number; formattedAddress: string }) => void }) {
    return (
      <button
        type="button"
        onClick={() => onSelect({ lat: 47.68, lng: -122.3, formattedAddress: "123 Maple St, Seattle, WA 98115, USA" })}
      >
        mock-address-select
      </button>
    );
  },
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>mock-auth-modal</div> : null),
}));

import WizardFlow from "./WizardFlow";
import { ParcelProvider } from "@/lib/parcel-context";
import { parcelPresets } from "@/lib/feasibility";

function renderWizard(onComplete = vi.fn()) {
  const view = render(
    <ParcelProvider initialPreset={parcelPresets[0]}>
      <WizardFlow onComplete={onComplete} />
    </ParcelProvider>,
  );
  return { onComplete, ...view };
}

describe("WizardFlow", () => {
  beforeEach(() => {
    mocks.authState.user = null;
  });

  it("starts on the address step with demo chips and skip", () => {
    renderWizard();
    expect(screen.getByText(/could your backyard pay you rent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /seattle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip — explore the demo lot/i })).toBeInTheDocument();
  });

  it("demo chip completes immediately", async () => {
    const user = userEvent.setup();
    const { onComplete } = renderWizard();

    await user.click(screen.getByRole("button", { name: /portland/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("address select advances to the size step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    expect(screen.getByText(/what size adu/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Maple St/)).toBeInTheDocument();
  });

  it("size choice leads to a teaser with rounded rent and a locked unlock CTA", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("button", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));

    expect(screen.getByText(/~\$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create free account/i })).toBeInTheDocument();
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
  });

  it("skip from results completes with the estimated scenario", async () => {
    const user = userEvent.setup();
    const { onComplete } = renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("button", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));
    await user.click(screen.getByRole("button", { name: /skip — explore the demo lot/i }));

    expect(onComplete).toHaveBeenCalledOnce();
    const config = onComplete.mock.calls[0][0];
    expect(config?.footprint).toBe(600);
  });

  it("opens the auth modal from the unlock CTA", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("button", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(screen.getByText("mock-auth-modal")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/studio/mobile/WizardFlow.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Write the implementation**

```tsx
// components/studio/mobile/WizardFlow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useParcel } from "@/lib/parcel-context";
import { buildEstimatedParcel, type EstimatedParcel } from "@/lib/estimated-parcel";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  formatCompactCurrency,
  parcelPresets,
  type ADUConfig,
} from "@/lib/feasibility";
import { nextStep, type WizardStep } from "@/lib/wizard-state";
import AddressSearch, { type AddressSearchResult } from "@/components/studio/AddressSearch";
import { AuthModal } from "@/components/auth/AuthModal";

export interface WizardFlowProps {
  /** Wizard finished (unlock, skip, or demo). Parent hides the wizard and
   * applies the config when one was chosen. */
  onComplete: (config?: ADUConfig) => void;
}

const SIZE_OPTIONS = [
  { footprint: 400, title: "Studio", blurb: "400 ft² · sleeps 1–2" },
  { footprint: 600, title: "1 Bedroom", blurb: "600 ft² · most popular" },
  { footprint: 800, title: "2 Bedroom", blurb: "800 ft² · max rent" },
] as const;

export default function WizardFlow({ onComplete }: WizardFlowProps) {
  const { user } = useAuth();
  const { resetToPreset, setEstimatedParcel, searchParcel } = useParcel();
  const [step, setStep] = useState<WizardStep>("address");
  const [address, setAddress] = useState<AddressSearchResult | null>(null);
  const [footprint, setFootprint] = useState<number>(600);
  const [authOpen, setAuthOpen] = useState(false);
  const [freeTextHint, setFreeTextHint] = useState(false);
  const completedRef = useRef(false);

  const estimated: EstimatedParcel | null = useMemo(
    () => (address ? buildEstimatedParcel(address) : null),
    [address],
  );
  const teaserConfig = useMemo(() => configForFootprint(footprint, defaultAduConfig), [footprint]);
  const teaser = useMemo(
    () => (estimated ? calculateFeasibility(estimated, teaserConfig, defaultFinancialAssumptions) : null),
    [estimated, teaserConfig],
  );

  function complete(config?: ADUConfig) {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(config);
  }

  // Auth unlock: when the user signs in on the results step, apply the
  // estimated parcel immediately, then upgrade to live Regrid data.
  useEffect(() => {
    if (!user || step !== "results" || !estimated) return;
    setAuthOpen(false);
    setEstimatedParcel(estimated);
    void searchParcel(estimated.lat, estimated.lng, estimated.address);
    complete(teaserConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleSkip() {
    if (step === "results" && estimated) {
      setEstimatedParcel(estimated);
      complete(teaserConfig);
      return;
    }
    resetToPreset(parcelPresets[0]);
    complete();
  }

  function handleDemoPreset(presetId: string) {
    const preset = parcelPresets.find((p) => p.id === presetId) ?? parcelPresets[0];
    resetToPreset(preset);
    complete();
  }

  const roundedRent = teaser ? `~$${(Math.round(teaser.monthlyRent / 100) * 100).toLocaleString()}` : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-lf-sand" role="dialog" aria-label="Get started">
      <div className="flex items-center justify-center gap-1.5 pt-5" aria-hidden>
        {(["address", "size", "results"] as WizardStep[]).map((s) => (
          <span key={s} className={`h-1.5 w-1.5 rounded-full ${s === step ? "bg-lf-clay" : "bg-lf-taupe/40"}`} />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6">
        {step === "address" && (
          <section>
            <h1 className="font-display text-3xl font-bold leading-tight text-lf-espresso">
              Could your backyard pay you rent?
            </h1>
            <p className="mt-2 text-sm text-lf-muted">
              Enter your address for an instant ADU feasibility check.
            </p>
            <div className="mt-5">
              <AddressSearch
                onSelect={(result) => {
                  setAddress(result);
                  setStep(nextStep("address"));
                }}
                onSubmitText={() => setFreeTextHint(true)}
                placeholder="Start typing your address…"
              />
              {freeTextHint && (
                <p className="mt-2 text-xs text-lf-clay" role="note">
                  Pick a suggestion from the list, or explore a demo lot below.
                </p>
              )}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
              or explore a demo lot
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {parcelPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDemoPreset(preset.id)}
                  className="min-h-11 rounded-full border border-lf-hairline bg-lf-card px-4 text-sm text-lf-espresso transition hover:border-lf-clay"
                >
                  {preset.city.split(",")[0]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "size" && (
          <section>
            <h1 className="font-display text-3xl font-bold text-lf-espresso">What size ADU?</h1>
            <p className="mt-1 text-sm text-lf-muted">
              {address?.formattedAddress}
              <span className="ml-2 rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                lot: estimated
              </span>
            </p>
            <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="ADU size">
              {SIZE_OPTIONS.map((option) => (
                <button
                  key={option.footprint}
                  type="button"
                  role="radio"
                  aria-checked={footprint === option.footprint}
                  onClick={() => setFootprint(option.footprint)}
                  className={`min-h-16 rounded-xl border-2 bg-lf-card px-4 py-3 text-left transition ${
                    footprint === option.footprint ? "border-lf-clay bg-lf-clay/5" : "border-lf-hairline"
                  }`}
                >
                  <span className="block font-semibold text-lf-espresso">{option.title}</span>
                  <span className="text-sm text-lf-muted">{option.blurb}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(nextStep("size"))}
              className="mt-6 min-h-12 w-full rounded-xl bg-lf-clay font-semibold text-white transition hover:bg-lf-mahogany"
            >
              See my results →
            </button>
          </section>
        )}

        {step === "results" && teaser && (
          <section>
            <h1 className="font-display text-2xl font-bold text-lf-espresso">Your lot looks promising</h1>
            <p className="mt-1 text-sm text-lf-muted">
              {address?.formattedAddress} · {footprint} ft²
              <span className="ml-2 rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                estimated
              </span>
            </p>
            <div className="mt-5 rounded-2xl border border-lf-hairline bg-lf-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">Rent potential</p>
              <p className="font-display text-4xl font-bold tabular-nums text-lf-espresso">
                {roundedRent}
                <span className="text-base font-medium text-lf-muted">/mo</span>
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <BlurredFact label="Build cost" value={`${formatCompactCurrency(teaser.costLow)}-${formatCompactCurrency(teaser.costHigh)}`} />
                <BlurredFact label="Payback" value={`${teaser.paybackYears} yrs`} />
                <BlurredFact label="Zoning" value={teaser.zoningStatus} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-lf-clay/60 bg-lf-card p-4 text-center">
              <p className="font-semibold text-lf-espresso">🔒 Unlock your exact numbers</p>
              <p className="mt-1 text-xs text-lf-muted">Free account · real parcel data for your address</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mt-4 min-h-12 w-full rounded-xl bg-lf-clay font-semibold text-white transition hover:bg-lf-mahogany"
            >
              Create free account
            </button>
          </section>
        )}
      </div>

      <div className="pb-8 pt-4 text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="min-h-11 px-4 text-sm text-lf-muted underline underline-offset-4"
        >
          Skip — explore the demo lot
        </button>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function BlurredFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-lf-muted">{label}</p>
      {/* blur-sm + select-none keeps the layout honest without leaking the value */}
      <p aria-hidden className="select-none font-semibold text-lf-espresso blur-sm">
        {value}
      </p>
    </div>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/studio/mobile/WizardFlow.test.tsx`
Expected: 6 passed.

- [x] **Step 5: Commit**

```bash
git add components/studio/mobile/WizardFlow.tsx components/studio/mobile/WizardFlow.test.tsx
git commit -m "feat(mobile): add first-run wizard with results teaser and auth unlock"
```

---

### Task 10: `MobileStudio` composition

**Files:**
- Create: `components/studio/mobile/MobileStudio.tsx`
- Test: `components/studio/mobile/MobileStudio.test.tsx`

Slot-based composer: owns the sheet snap state, the scene pointer-events rule, tap-to-collapse, and one-time coach marks. It knows nothing about feasibility — parents pass rendered nodes.

- [x] **Step 1: Write the failing test**

```tsx
// components/studio/mobile/MobileStudio.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import MobileStudio, { COACH_SEEN_KEY } from "./MobileStudio";

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    });
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

function renderStudio() {
  return render(
    <MobileStudio
      header={<div>m-header</div>}
      scene={<div>m-scene</div>}
      peek={<div>m-peek</div>}
      controls={<div>m-controls</div>}
      sections={<div>m-sections</div>}
    />,
  );
}

describe("MobileStudio", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all slots", () => {
    renderStudio();
    for (const text of ["m-header", "m-scene", "m-peek", "m-controls", "m-sections"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("shows coach marks on first run and persists dismissal", async () => {
    const user = userEvent.setup();
    renderStudio();

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/drag your adu/i);

    await user.click(screen.getByRole("button", { name: /got it/i }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COACH_SEEN_KEY)).toBe("1");
  });

  it("hides coach marks when already seen", () => {
    window.localStorage.setItem(COACH_SEEN_KEY, "1");
    renderStudio();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/studio/mobile/MobileStudio.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Write the implementation**

```tsx
// components/studio/mobile/MobileStudio.tsx
"use client";

import { useState, type ReactNode } from "react";
import StudioSheet, { PEEK_SNAP, type SheetSnap } from "./StudioSheet";

export const COACH_SEEN_KEY = "lf-coach-seen";

export interface MobileStudioProps {
  header: ReactNode;
  scene: ReactNode;
  peek: ReactNode;
  controls: ReactNode;
  sections: ReactNode;
}

export default function MobileStudio({ header, scene, peek, controls, sections }: MobileStudioProps) {
  const [snap, setSnap] = useState<SheetSnap | null>(PEEK_SNAP);
  const [coachVisible, setCoachVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COACH_SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const expanded = snap !== PEEK_SNAP && snap !== null;

  function dismissCoach() {
    setCoachVisible(false);
    try {
      window.localStorage.setItem(COACH_SEEN_KEY, "1");
    } catch {
      // Storage denied — coach marks may show again next visit.
    }
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-lf-espresso">
      <div className="relative z-30 shrink-0">{header}</div>

      {/* The sheet owns gestures while expanded — freezing scene pointer
          events stops sheet drags from also rotating the camera. */}
      <div className={`relative min-h-[160px] flex-1 ${expanded ? "pointer-events-none" : ""}`}>{scene}</div>

      {expanded && (
        <button
          type="button"
          aria-label="Collapse panel and return to lot view"
          onClick={() => setSnap(PEEK_SNAP)}
          className="absolute inset-x-0 top-12 z-30 h-24 cursor-pointer bg-transparent"
        />
      )}

      {coachVisible && (
        <div
          role="note"
          className="absolute inset-x-4 top-16 z-40 rounded-xl border border-lf-hairline bg-lf-card/95 p-3 text-sm text-lf-espresso shadow-lg"
        >
          <p className="font-semibold">Drag your ADU to place it on the lot.</p>
          <p className="mt-1 text-lf-muted">Swipe the bottom panel up for size, finish and full results.</p>
          <button
            type="button"
            onClick={dismissCoach}
            className="mt-2 min-h-11 rounded-lg bg-lf-clay px-4 text-sm font-semibold text-white"
          >
            Got it
          </button>
        </div>
      )}

      <StudioSheet snap={snap} onSnapChange={setSnap} peek={peek} controls={controls} sections={sections} />
    </div>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/studio/mobile/MobileStudio.test.tsx`
Expected: 3 passed.

- [x] **Step 5: Commit**

```bash
git add components/studio/mobile/MobileStudio.tsx components/studio/mobile/MobileStudio.test.tsx
git commit -m "feat(mobile): add mobile studio composer with sheet and coach marks"
```

---

### Task 11: Wire the viewport split into `FeasibilityStudio`

**Files:**
- Modify: `components/FeasibilityStudio.tsx`

This is the integration task — no new logic, only composition. Work inside `FeasibilityStudioInner`.

- [x] **Step 1: Add imports**

```tsx
import { useMediaQuery } from "@/lib/use-media-query";
import { markWizardSeen, shouldShowWizard } from "@/lib/wizard-state";
import MobileStudio from "./studio/mobile/MobileStudio";
import MobileHeader from "./studio/mobile/MobileHeader";
import PeekMetrics from "./studio/mobile/PeekMetrics";
import WizardFlow from "./studio/mobile/WizardFlow";
```

Also extend the existing `useParcel()` destructuring to pull what mobile needs:

```tsx
const { parcel: liveParcel, parcelMode, parcelError, searchParcel, resetToPreset, restoreLiveParcel } = useParcel();
```

- [x] **Step 2: Fix `activeParcel` for estimated mode**

Replace:

```tsx
const activeParcel = parcelMode === "live" ? liveParcel : presetParcel;
```

with:

```tsx
// Context parcel covers both live (Regrid) and estimated (wizard) modes.
const activeParcel = parcelMode === "preset" ? presetParcel : liveParcel;
```

`expectedRent`, `result`, and the AerialView condition (`parcelMode === "live" && "lat" in activeParcel`) all keep working: estimated parcels have no `expectedRent` (rent heuristic applies) and AerialView still requires live mode. For the 3D scene in estimated mode, render the base preset's geometry:

```tsx
const sceneParcel =
  parcelMode === "estimated" && "basePresetId" in activeParcel
    ? getParcelById(activeParcel.basePresetId)
    : presetParcel;
```

…and pass `sceneParcel` instead of `presetParcel` to `<ParcelScene parcel={...} />`.

- [x] **Step 3: Add the viewport split and wizard state**

```tsx
const isDesktop = useMediaQuery("(min-width: 1024px)", true);
const [wizardOpen, setWizardOpen] = useState(false);

// First-run wizard decision — mount-only, before the URL-write effect adds
// scenario params, mirroring the existing post-hydration URL sync pattern.
/* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(min-width: 1024px)").matches) return; // desktop never sees the wizard
  const hasUrlScenario = window.location.search.length > 1;
  setWizardOpen(shouldShowWizard({ hasUrlScenario, storage: window.localStorage }));
}, []);
/* eslint-enable react-hooks/set-state-in-effect */

function handleWizardComplete(nextConfig?: ADUConfig) {
  if (nextConfig) setConfig(nextConfig);
  markWizardSeen(window.localStorage);
  setWizardOpen(false);
}
```

- [x] **Step 4: Extract the scene node so both trees share it**

Pull the existing scene JSX (the `IncomeLens` + `AerialView`/`ParcelScene` conditional, currently inside the desktop `<section>`) into a variable above the return. Mobile omits `IncomeLens` (PeekMetrics is its mobile equivalent):

```tsx
const sceneNode =
  parcelMode === "live" && "lat" in activeParcel ? (
    <AerialView
      parcel={activeParcel as import("@/lib/parcel-types").LiveParcelData}
      config={config}
      isCompliant={isCompliant}
    />
  ) : (
    <ParcelScene parcel={sceneParcel} config={config} isCompliant={isCompliant} />
  );
```

The desktop `<section>` keeps `<IncomeLens …/>{sceneNode}`.

- [x] **Step 5: Build the mobile tree and branch the return**

The shared modals (`ReportPreview`, `BuilderLeadPanel`) render in both branches with identical props. The mobile branch:

```tsx
if (!isDesktop) {
  return (
    <>
      <MobileStudio
        header={
          <MobileHeader
            address={activeParcel.address}
            estimated={parcelMode === "estimated"}
            onReset={resetScenario}
          />
        }
        scene={<div className="h-full">{sceneNode}</div>}
        peek={
          <PeekMetrics
            result={result}
            config={config}
            estimated={parcelMode === "estimated"}
            parcelError={parcelError}
            onRetry={
              "lat" in activeParcel
                ? () => void searchParcel(activeParcel.lat, activeParcel.lng, activeParcel.address)
                : undefined
            }
          />
        }
        controls={
          <FeasibilityInspector
            parcelId={parcelId}
            config={config}
            assumptions={assumptions}
            result={result}
            onParcelChange={setParcelId}
            onConfigChange={setConfig}
            onAssumptionsChange={setAssumptions}
            onReset={resetScenario}
            onGenerateReport={handleGenerateReport}
            onSaveScenario={handleSaveScenario}
            savingScenario={savingScenario}
            saveNotice={saveNotice}
          />
        }
        sections={
          <>
            <MetricsSummary result={result} />
            <EstimateSummaryPanel
              parcelName={`${activeParcel.address}, ${activeParcel.city}`}
              result={result}
              onGenerateReport={handleGenerateReport}
            />
            <PermitGuidePanel address={activeParcel.address} />
            <InspirationGalleryPanel
              onApply={(item) => {
                const baseConfig = configForFootprint(item.sqft, config);
                setConfig({
                  ...baseConfig,
                  width: item.width,
                  length: item.length,
                  roof: item.roof,
                  finish: item.finish,
                });
              }}
            />
          </>
        }
      />
      {wizardOpen && <WizardFlow onComplete={handleWizardComplete} />}
      {reportOpen && (
        <ReportPreview
          parcelName={`${activeParcel.address}, ${activeParcel.city}`}
          result={result}
          onClose={() => setReportOpen(false)}
          onDownload={downloadReport}
          onExportCsv={exportCsv}
          onShare={handleShareLink}
          onConnectBuilders={() => setBuilderLeadOpen(true)}
          shareNotice={shareNotice}
          autoFocus={reportAutoFocus}
        />
      )}
      <BuilderLeadPanel
        open={builderLeadOpen}
        userDefaults={{ name: user?.displayName || "", email: user?.email || "" }}
        parcelKey={parcelId}
        parcel={activeParcel}
        config={config}
        assumptions={assumptions}
        result={result}
        onClose={() => setBuilderLeadOpen(false)}
        onSubmit={handleBuilderLeadSubmit}
      />
    </>
  );
}

return ( /* existing AppShell desktop tree, unchanged apart from sceneNode */ );
```

If `FeasibilityInspector` or the panels overflow the sheet width, wrap them in `<div className="[&>*]:!w-full">` rather than editing those components — desktop must not change.

- [x] **Step 6: Verify everything**

Run: `npm run test && npx tsc --noEmit && npm run lint && npm run build`
Expected: full unit suite green (the desktop tree and `lib/` engine are untouched — any existing failure means the split leaked), no type errors, zero lint warnings, build succeeds.

- [x] **Step 7: Manual smoke check**

Run: `npm run dev`, open `http://localhost:3000/studio`:
- Desktop window (≥1024px): existing dashboard, no wizard.
- DevTools mobile emulation (390×844), fresh localStorage (`localStorage.clear()` then reload): wizard appears → "Skip — explore the demo lot" → scene + peek sheet with metrics; expand button reveals controls; full snap scrolls to permit guide/inspiration/export.

- [x] **Step 8: Commit**

```bash
git add components/FeasibilityStudio.tsx
git commit -m "feat(mobile): split studio into desktop and mobile trees with first-run wizard"
```

---

### Task 12: E2E coverage

**Files:**
- Create: `e2e/mobile-studio.spec.ts`

The `mobile-chromium` project (390×844) exercises the mobile spec; the `desktop-chromium` project (1440×900) exercises the regression spec. Both projects run every file, so each describe guards on viewport width.

- [x] **Step 1: Write the spec**

```ts
// e2e/mobile-studio.spec.ts
import { expect, test } from "@playwright/test";

test.describe("mobile studio", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "mobile-only suite");

  test("first-run wizard skips into the bottom-sheet studio", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByText(/could your backyard pay you rent/i)).toBeVisible();

    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();

    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    await expect(page.getByText("Rent / mo")).toBeVisible();
    // Coach marks appear once on a fresh profile.
    await expect(page.getByRole("note")).toContainText(/drag your adu/i);
    await page.getByRole("button", { name: /got it/i }).click();
  });

  test("expanding the sheet reveals controls and metrics react to size change", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();
    const note = page.getByRole("note");
    if (await note.isVisible()) {
      await page.getByRole("button", { name: /got it/i }).click();
    }

    const rentBefore = await page.getByTestId("studio-sheet").getByText(/^\$/).first().textContent();

    await page.getByRole("button", { name: /expand panel/i }).click();
    // FeasibilityInspector footprint presets are buttons labeled like "400 sf".
    await page.getByRole("button", { name: /800 sf/i }).click();

    const rentAfter = await page.getByTestId("studio-sheet").getByText(/^\$/).first().textContent();
    expect(rentAfter).not.toBe(rentBefore);
  });

  test("wizard does not reappear after being skipped", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();
    await expect(page.getByTestId("studio-sheet")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
  });
});

test.describe("desktop studio regression", () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1024, "desktop-only suite");

  test("desktop keeps the AppShell layout and never shows the wizard", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Feasibility Studio" })).toBeVisible();
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
    await expect(page.getByTestId("studio-sheet")).not.toBeVisible();
  });
});
```

Adjust the footprint-preset button name in test 2 to whatever `FeasibilityInspector` actually renders (check its footprint control labels — `footprintOptions` uses `"800 sf"`); the assertion strategy stays the same.

- [x] **Step 2: Run the suite**

Run: `npx playwright test e2e/mobile-studio.spec.ts`
Expected: mobile tests pass under `mobile-chromium` and skip under `desktop-chromium`; the regression test does the reverse. Fix selector drift by reading the rendered component, not by weakening assertions.

- [x] **Step 3: Run the whole E2E suite for regressions**

Run: `npm run test:e2e`
Expected: existing specs (`feasibility-studio`, `accessibility`, `hero`, `visual-breakpoints`) still pass. **Watch for:** existing mobile-project specs that asserted the old squeezed-desktop studio layout — if any fail, update those assertions to the new mobile tree (that change is expected and in-scope), and clear the wizard flag first via `await page.addInitScript(() => localStorage.setItem("lf-wizard-seen", "1"))` where a spec needs the studio without the wizard. Visual-breakpoint snapshots that include the studio at mobile widths will need regenerating: `npx playwright test e2e/visual-breakpoints.spec.ts --update-snapshots`.

- [x] **Step 4: Commit**

```bash
git add e2e/mobile-studio.spec.ts
git commit -m "test(e2e): cover mobile wizard funnel, sheet studio, and desktop regression"
```

(Include any updated existing specs/snapshots in this commit.)

---

### Task 13: Final verification

- [x] **Step 1: Full pre-commit gate**

Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
Expected: all green, zero warnings.

- [x] **Step 2: Spec checklist sweep**

Verify each spec requirement is implemented; fix anything missed before closing out:
- Viewport split renders exactly one tree (no hidden second canvas) — check the DOM in both modes.
- Wizard: 3 steps, skip on every step, demo chips, estimated badge, rounded rent + blurred facts, auth unlock → live upgrade.
- Sheet: peek/half/full, metrics pinned, full-state scroll reaches report/export, expand/collapse buttons work without drag.
- Estimated badge + live-fetch error retry visible in the peek strip.
- Reduced motion: Vaul respects `prefers-reduced-motion`; verify the sheet still snaps with animations off (DevTools → Rendering → emulate reduced motion).
- Desktop unchanged: diff check that `AppShell.tsx`, `FeasibilityInspector.tsx`, `MetricsSummary.tsx` and the desktop JSX branch have no behavioral edits.

- [x] **Step 3: Commit any remaining fixes and update the plan checkboxes**

```bash
git add -A
git commit -m "chore(mobile): final verification fixes for mobile-first studio"
```
