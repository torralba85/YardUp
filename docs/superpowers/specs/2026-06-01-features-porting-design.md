# Design Spec: Porting Inspiration Gallery and Local Permit Guide

This document specifies the design and implementation details for porting two high-value features from the legacy ADU Advisor mobile application to the LotFoundry Next.js web application: the **Local Permit Guide** and the **Inspiration Gallery**.

---

## 1. Objectives

- **Enhance Homeowner Feasibility Workflow:** Provide contextual local zoning and permitting guides alongside 3D/aerial visualizations.
- **Precedent Integration:** Allow homeowners to browse pre-designed ADU templates and instantly apply them to their custom lot configuration.
- **Maintain Layout Cohesion:** Implement the new views as conditional panel swaps in the desktop application's right-hand inspector panel, keeping the 3D massing model and satellite parcel overlay always visible.

---

## 2. Technical Components

### A. Data Layer

We will introduce two static data modules in the `lib/` directory:

1.  **`lib/regulations-data.ts`**
    -   Stores `RegulationGuide` items for Seattle, Portland, Austin, Los Angeles, San Diego, San Jose, Oakland, Sacramento, Denver, and a fallback "local-review".
    -   Exposes an `inferJurisdiction(address: string): JurisdictionId` utility function that parses the address string to detect the matching city.
2.  **`lib/inspiration-data.ts`**
    -   Stores six `InspirationItem` objects containing preset configurations (footprint, dimensions, roof style, exterior finish), Unsplash image links, budget estimations, and structural summaries.

### B. UI Components

We will create two new components in `components/studio/`:

1.  **`PermitGuidePanel.tsx`**
    -   Displays the inferred city name and ADU starter guide text.
    -   Renders a permit complexity badge (Green = Low Risk, Amber = Moderate Risk, Red = Local Review).
    -   Renders an interactive checkbox list for homeowners to track their planning steps.
    -   Highlights potential setbacks or site blockers in a red warning card.
    -   Provides reference links to local planning portals.
2.  **`InspirationGalleryPanel.tsx`**
    -   Displays the ADU design precedents in a scrollable card stack.
    -   Each card displays design specifications (square footage, length, width, roof, finish) and an image.
    -   Includes an **"Apply to Studio"** button that sends the configuration back to the parent and transitions back to the 3D studio.

### C. State Integration

We will update:
-   **`components/studio/AppShell.tsx`**: Add `guide` and `inspiration` to the navigation options.
-   **`components/FeasibilityStudio.tsx`**: Wire conditional rendering on `activeNav` state to swap the right inspector panel for either the `PermitGuidePanel` or the `InspirationGalleryPanel`.

---

## 3. Detailed Data Models

```typescript
export type RoofStyle = "shed" | "gable" | "flat";
export type ExteriorFinish = "cedar" | "lap" | "stucco" | "board";

export interface InspirationItem {
  id: string;
  title: string;
  style: string;
  sqft: number;
  width: number;
  length: number;
  roof: RoofStyle;
  finish: ExteriorFinish;
  imageUrl: string;
  tags: string[];
  summary: string;
  budgetBand: string;
}

export interface Citation {
  label: string;
  url: string;
}

export interface RegulationGuide {
  jurisdiction: string;
  title: string;
  summary: string;
  permitSteps: string[];
  blockers: string[];
  verifiedAt: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
}
```

---

## 4. Verification Plan

-   **Unit Tests:** Add test suites verifying the address parsing logic in `inferJurisdiction()` and verifying that clicking "Apply" on an inspiration card calls `onApply` with the correct config values.
-   **E2E Tests:** Add a Playwright smoke test that clicks the "Permit Guide" and "Inspiration Gallery" sidebar tabs, asserts that the right-side panel updates, and checks that applying an inspiration card returns the view to the 3D studio.
-   **TypeScript & Compilation:** Ensure `npx tsc --noEmit` and `npm run build` pass with zero errors.
