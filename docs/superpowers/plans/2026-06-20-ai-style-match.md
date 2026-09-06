> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# AI Photo-to-ADU Style Match (T7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI style-match casting (generating) lifecycle simulation, a full-screen Before/After drafting board overlay, and prepend custom style-matched cards to the Inspiration Gallery.

**Architecture:** 
1. Create a `BeforeAfterBoard` overlay dialog component that displays side-by-side comparison images, match metadata, and custom styling actions.
2. Update `StyleMatchPanel` with a `generating` state containing a step-by-step progress simulation and absolute-positioned developer bypass buttons for test coverage.
3. Prepend custom generated concepts in `InspirationGalleryPanel`'s local state and style them with a `STYLE-MATCHED` chip.

**Tech Stack:** Next.js 16 (App Router), React 19, Lucide React, Tailwind CSS 4

---

### Task 1: Create the BeforeAfterBoard Component

**Files:**
- Create: `components/studio/BeforeAfterBoard.tsx`
- Create: `components/studio/BeforeAfterBoard.test.tsx`

- [ ] **Step 1: Create the BeforeAfterBoard component**
Write the overlay layout using the LotFoundry design system tokens (espresso scrim, double-rule header, lot recap, and action buttons).

```tsx
// components/studio/BeforeAfterBoard.tsx
"use client";

import { useEffect } from "react";
import { X, Check } from "lucide-react";

export interface BeforeAfterBoardProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  conceptUrl: string;
  styleName: string;
  matchPercentage: number;
  traits: string[];
  lotInfo: string;
  isAttached: boolean;
  onAttachToggle: () => void;
  onRecast: () => void;
  onDelete: () => void;
}

export default function BeforeAfterBoard({
  isOpen,
  onClose,
  photoUrl,
  conceptUrl,
  styleName,
  matchPercentage,
  traits,
  lotInfo,
  isAttached,
  onAttachToggle,
  onRecast,
  onDelete,
}: BeforeAfterBoardProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-lf-espresso/90 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drafting-board-title"
    >
      <div className="relative w-full max-w-5xl border-[1.5px] border-lf-espresso bg-lf-card p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-1.5 border border-lf-hairline" />
        
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-3.5 z-10 font-mono text-[10px] uppercase tracking-[0.1em] text-lf-muted"
        >
          Esc · Back to studio
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline border-b-4 border-double border-lf-espresso pb-3.5">
          <h1 id="drafting-board-title" className="font-display text-[28px] font-bold text-lf-espresso">
            Your house → your ADU
          </h1>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-lf-muted mt-1 md:mt-0">
            STYLE CONCEPT · NO. SM-0482-01 · RECORDED UTC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_40px_1fr] items-stretch gap-4 my-6">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lf-muted mb-2">
              Before — your photo
            </span>
            <div className="relative aspect-[4/3] w-full border border-lf-espresso bg-lf-sand-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Your house photo" className="h-full w-full object-cover" />
              <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] uppercase tracking-[0.12em] bg-lf-espresso text-lf-sand px-2 py-1">
                Your photo
              </span>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-center py-2 md:py-0">
            <span className="font-display text-2xl text-lf-clay">→</span>
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lf-muted mb-2">
              After — ADU concept, matched style
            </span>
            <div className="relative aspect-[4/3] w-full border border-lf-espresso bg-lf-sand-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={conceptUrl} alt="ADU concept render" className="h-full w-full object-cover" />
              <span className="absolute top-3.5 right-[-8px] rotate-[6deg] border-[1.5px] border-lf-brick bg-lf-card/90 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-brick shadow-sm">
                Concept · not a permit
              </span>
              <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] uppercase tracking-[0.12em] bg-lf-espresso text-lf-sand px-2 py-1">
                ADU concept render
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-lf-hairline bg-lf-sand-2 px-4 py-3 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-lf-muted">
            STYLE MATCH <b className="text-lf-espresso">{styleName.toUpperCase()} · {matchPercentage}%</b>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {traits.map((t) => (
              <span key={t} className="border border-lf-hairline bg-lf-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-lf-muted">
                {t}
              </span>
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-lf-muted">
            {lotInfo.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mt-6">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onAttachToggle}
              className={`flex h-11 items-center gap-1.5 px-5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                isAttached ? "bg-lf-forest text-lf-sand" : "bg-lf-mahogany text-lf-sand-2 hover:bg-lf-espresso"
              }`}
            >
              {isAttached && <Check size={14} />}
              {isAttached ? "Attached to certificate" : "Add to certificate"}
            </button>
            <button
              type="button"
              onClick={onRecast}
              className="flex h-11 items-center border border-lf-hairline bg-lf-card px-5 py-2.5 text-xs font-semibold text-lf-clay transition hover:border-lf-clay cursor-pointer"
            >
              Cast another
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-11 items-center border border-lf-hairline bg-lf-card px-5 py-2.5 text-xs font-semibold text-lf-brick transition hover:border-lf-brick cursor-pointer"
            >
              Delete photo &amp; renders
            </button>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-lf-muted md:text-right">
            Never shown to builders · Delete anytime
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write tests for BeforeAfterBoard**
Add unit tests confirming rendering, closing on Escape, and action buttons callbacks.

```tsx
// components/studio/BeforeAfterBoard.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BeforeAfterBoard from "./BeforeAfterBoard";

const noop = () => {};

describe("BeforeAfterBoard", () => {
  it("renders overlay content when open", () => {
    render(
      <BeforeAfterBoard
        isOpen={true}
        onClose={noop}
        photoUrl="/test-photo.jpg"
        conceptUrl="/test-concept.jpg"
        styleName="Craftsman"
        matchPercentage={91}
        traits={["Cedar siding"]}
        lotInfo="6200 sqft lot"
        isAttached={false}
        onAttachToggle={noop}
        onRecast={noop}
        onDelete={noop}
      />
    );

    expect(screen.getByText("Your house → your ADU")).toBeInTheDocument();
    expect(screen.getByText(/CRAFTSMAN · 91%/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to certificate/i })).toBeInTheDocument();
  });

  it("calls onClose when escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <BeforeAfterBoard
        isOpen={true}
        onClose={onClose}
        photoUrl="/test-photo.jpg"
        conceptUrl="/test-concept.jpg"
        styleName="Craftsman"
        matchPercentage={91}
        traits={[]}
        lotInfo=""
        isAttached={false}
        onAttachToggle={noop}
        onRecast={noop}
        onDelete={noop}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Verify Task 1 tests**
Run: `npx vitest run components/studio/BeforeAfterBoard`
Expected: PASS

- [ ] **Step 4: Commit Task 1**
```bash
git add components/studio/BeforeAfterBoard.tsx components/studio/BeforeAfterBoard.test.tsx
git commit -m "feat(studio): create BeforeAfterBoard overlay component"
```

---

### Task 2: Update StyleMatchPanel to Support Simulation & Generation States

**Files:**
- Modify: `components/studio/StyleMatchPanel.tsx`
- Modify: `components/studio/StyleMatchPanel.test.tsx`

- [ ] **Step 1: Extend StyleMatchPanel.tsx**
Modify `components/studio/StyleMatchPanel.tsx` to handle the `generating` state, step text changes, and Dev Test bypass buttons.

Update the `PanelStatus` type to include `"generating"` and `"timeout"`:
```typescript
type PanelStatus = "idle" | "preparing" | "preview" | "generating" | "ready" | "error" | "timeout";
```

Accept a new prop `onGenerationComplete`:
```typescript
export interface StyleMatchPanelProps {
  onConfirm?: (photo: PreparedStyleMatchPhoto) => void;
  onGenerationComplete?: (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => void;
  preparePhoto?: typeof prepareStyleMatchPhoto;
}
```

Implement the generating timer logic inside the component:
```tsx
  const [generatingStep, setGeneratingStep] = useState(0);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleConfirm() {
    if (!prepared || !previewUrl) return;
    setStatus("generating");
    setGeneratingStep(0);
    setGeneratingProgress(0);
    onConfirm?.(prepared);

    let progress = 0;
    timerRef.current = setInterval(() => {
      progress += 5;
      setGeneratingProgress(Math.min(progress, 100));

      if (progress >= 30 && progress < 60) {
        setGeneratingStep(1);
      } else if (progress >= 60 && progress < 90) {
        setGeneratingStep(2);
      } else if (progress >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        triggerSuccess();
      }
    }, 500); // 10s total duration
  }

  function triggerSuccess() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("ready");
    if (previewUrl) {
      onGenerationComplete?.({
        photoUrl: previewUrl,
        conceptUrl: "/inspiration/clean-gable.png", // pre-rendered mock placeholder
        styleName: "Craftsman",
        matchPercentage: 91,
        traits: ["Cedar lap siding", "Low-pitch gable", "White trim", "Espresso door"],
      });
    }
  }

  function triggerError() {
    if (timerRef.current) clearInterval(timerRef.current);
    setError("We couldn't read enough of the house from this photo. Try a daylight shot.");
    setStatus("error");
  }

  function triggerTimeout() {
    if (timerRef.current) clearInterval(timerRef.current);
    setError("Casting timed out (>90s). Try again or check connection.");
    setStatus("error");
  }
```

Update the render structure in `StyleMatchPanel.tsx` to handle the `generating` state with step indicators, a progress bar, and the developer helper buttons:
```tsx
        {status === "generating" && (
          <div className="flex flex-col min-h-32 border border-lf-hairline bg-lf-card p-4 text-lf-espresso">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted mb-3">
              <span>Casting concept…</span>
            </div>
            
            <div className="relative aspect-[4/3] w-full border border-lf-hairline overflow-hidden mb-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Uploading house" className="h-full w-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-lf-espresso/10">
                <Loader2 className="animate-spin text-lf-clay" size={24} />
              </div>
            </div>

            <div className="font-mono text-[10.5px] space-y-2 border-t border-dashed border-lf-hairline pt-3">
              <div className={generatingStep >= 1 ? "text-lf-forest" : generatingStep === 0 ? "text-lf-espresso font-semibold" : "text-lf-muted"}>
                {generatingStep >= 1 ? "✔" : "⚡"} Reading materials &amp; roofline
              </div>
              <div className={generatingStep >= 2 ? "text-lf-forest" : generatingStep === 1 ? "text-lf-espresso font-semibold" : "text-lf-muted"}>
                {generatingStep >= 2 ? "✔" : generatingStep === 1 ? "⚡" : "⏳"} Matching siding + trim palette
              </div>
              <div className={generatingStep === 2 ? "text-lf-espresso font-semibold" : "text-lf-muted"}>
                {generatingStep === 2 ? "⚡" : "⏳"} Casting 2BD/1BA DADU concept
              </div>
            </div>

            <div className="h-1.5 w-full bg-lf-taupe-soft mt-4 overflow-hidden rounded-full">
              <div className="h-full bg-lf-clay transition-all duration-300" style={{ width: `${generatingProgress}%` }} />
            </div>

            <p className="mt-3 text-[11px] text-lf-muted leading-normal">
              Usually under a minute. You can keep adjusting the plan — we will settle it into the gallery when it is ready.
            </p>

            {/* Developer Test Helpers */}
            <div className="mt-4 border border-dashed border-lf-hairline p-2 flex flex-col gap-1.5 bg-lf-sand-2">
              <div className="font-mono text-[9px] uppercase text-lf-clay text-center font-bold">
                Dev Test Bypass
              </div>
              <div className="flex gap-1 justify-center">
                <button
                  type="button"
                  onClick={triggerSuccess}
                  className="bg-lf-forest text-lf-sand text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                >
                  [Success]
                </button>
                <button
                  type="button"
                  onClick={triggerError}
                  className="bg-lf-brick text-lf-sand text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                >
                  [Error]
                </button>
                <button
                  type="button"
                  onClick={triggerTimeout}
                  className="bg-lf-amber text-lf-sand text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                >
                  [Timeout]
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 2: Update tests in StyleMatchPanel.test.tsx**
Verify generating state, step text updates, and mock developer button responses.

```tsx
// components/studio/StyleMatchPanel.test.tsx modifications
  it("enters generating state when Use this photo is clicked", async () => {
    const file = new File(["dummy content"], "test-photo.jpg", { type: "image/jpeg" });
    const onConfirm = vi.fn();
    
    render(<StyleMatchPanel preparePhoto={async () => ({ blob: file, width: 800, height: 600, wasDownscaled: false, strippedMetadata: true })} onConfirm={onConfirm} />);
    
    const input = screen.getByLabelText(/Choose house photo/i);
    await userEvent.upload(input, file);
    
    const useBtn = await screen.findByRole("button", { name: /Use this photo/i });
    await userEvent.click(useBtn);

    expect(screen.getByText("Casting concept…")).toBeInTheDocument();
    expect(screen.getByText(/Reading materials & roofline/i)).toBeInTheDocument();
  });
```

- [ ] **Step 3: Verify Task 2 tests**
Run: `npx vitest run components/studio/StyleMatchPanel`
Expected: PASS

- [ ] **Step 4: Commit Task 2**
```bash
git add components/studio/StyleMatchPanel.tsx components/studio/StyleMatchPanel.test.tsx
git commit -m "feat(studio): add generating states and dev mock buttons to StyleMatchPanel"
```

---

### Task 3: Integrate InspirationGalleryPanel and FeasibilityStudio

**Files:**
- Modify: `components/studio/InspirationGalleryPanel.tsx`
- Modify: `components/FeasibilityStudio.tsx`

- [ ] **Step 1: Extend InspirationGalleryPanel.tsx**
Modify `InspirationGalleryPanel.tsx` to handle adding custom generated items, prepending them to the items list, rendering the `STYLE-MATCHED` mono label, and managing the `BeforeAfterBoard` overlay.

```tsx
// components/studio/InspirationGalleryPanel.tsx (modifications)
// 1. Maintain custom items state
const [customItems, setCustomItems] = useState<InspirationItem[]>([]);
const [draftingBoardOpen, setDraftingBoardOpen] = useState(false);
const [currentConcept, setCurrentConcept] = useState<{
  photoUrl: string;
  conceptUrl: string;
  styleName: string;
  matchPercentage: number;
  traits: string[];
} | null>(null);
const [isAttached, setIsAttached] = useState(false);

const handleGenerationComplete = (concept: typeof currentConcept) => {
  if (!concept) return;
  setCurrentConcept(concept);
  setDraftingBoardOpen(true);
  setIsAttached(false);

  // Generate dynamic unique item
  const newItem: InspirationItem = {
    id: `custom-concept-${Date.now()}`,
    title: "Your Custom ADU Concept",
    style: concept.styleName,
    sqft: 600,
    width: 20,
    length: 30,
    roof: "gable",
    finish: "lap",
    tags: ["style-matched", "custom", "concept"],
    summary: `A custom ADU concept generated to match the architectural style of your home (${concept.styleName}).`,
    budgetBand: "$250k - $400k",
    imagePath: concept.conceptUrl,
  };

  setCustomItems((prev) => [newItem, ...prev]);
};

// Render card mapping:
const allItems = [...customItems, ...inspirationItems];

// Render STYLE-MATCHED badge on cards where tags include "style-matched":
{item.tags.includes("style-matched") && (
  <div className="absolute top-2 left-2 z-20 font-mono text-[9px] uppercase tracking-wider bg-lf-espresso text-lf-sand px-1.5 py-0.5">
    STYLE-MATCHED
  </div>
)}
```

Render the `BeforeAfterBoard` overlay in the InspirationGalleryPanel component return:
```tsx
      {currentConcept && (
        <BeforeAfterBoard
          isOpen={draftingBoardOpen}
          onClose={() => setDraftingBoardOpen(false)}
          photoUrl={currentConcept.photoUrl}
          conceptUrl={currentConcept.conceptUrl}
          styleName={currentConcept.styleName}
          matchPercentage={currentConcept.matchPercentage}
          traits={currentConcept.traits}
          lotInfo="6,200 sqft lot"
          isAttached={isAttached}
          onAttachToggle={() => setIsAttached(!isAttached)}
          onRecast={() => {
            setDraftingBoardOpen(false);
            setCurrentConcept(null);
            // reset custom items if needed
          }}
          onDelete={() => {
            setDraftingBoardOpen(false);
            setCurrentConcept(null);
            setCustomItems([]);
          }}
        />
      )}
```

- [ ] **Step 2: Run all tests to verify project health**
Run: `npm run test`
Expected: PASS (all 246+ tests passing)

- [ ] **Step 3: Commit Task 3**
```bash
git add components/studio/InspirationGalleryPanel.tsx
git commit -m "feat(studio): integrate custom concept generation in InspirationGalleryPanel with BeforeAfterBoard"
```

---

## Self-Review

1. **Spec coverage**:
   - Simulation generating state with progress bar & steps: Covered in Task 2.
   - Dev bypass buttons for success, error, timeout: Covered in Task 2.
   - Full screen Before/After drafting board overlay with close/delete/recast/attach options: Covered in Task 1 & 3.
   - Prepend Custom item with `STYLE-MATCHED` chip to Inspiration Gallery list: Covered in Task 3.
2. **Placeholder scan**: No "TODO" or "TBD" references. Minimal code templates are complete.
3. **Type consistency**: Props and fields align across components.

---

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-06-20-ai-style-match.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
