# Design Spec: Guided ADU Feasibility Stepper Wizard

## Goal Description
Refine the ADU Advisor user journey into an intuitive, easily-navigated, and visually stunning step-by-step wizard. The stepper hides bottom tabs to maintain a focused progress flow for California homeowners examining ADU feasibility.

## Visual & Theme System
*   **Color Theme:** Modern Architectural / Editorial theme applying soft, warm sand/ivory backgrounds (`#FAF9F6`), strong card surfaces (`#FFFFFF`), deep forest emerald accents (`#2F5D50`), and charcoal text (`#171714`).
*   **Typography:** Editorial serif headers (`Georgia`) coupled with clean uppercase metadata tags (`typography.label`) and readable body text.
*   **Card Styling:** Generous padding, rounded corners (`radii.md`), and soft shadows (`shadows.soft`) to create tactile, premium interface layers.

## Navigation Architecture
To completely hide the bottom tab bar during an active estimate, the wizard screens reside outside the `(tabs)` route directory inside a new `app/wizard` navigation stack.

### Route Map
```
app/
├── (tabs)/
│   ├── _layout.tsx        # Standard bottom tabs layout (hides on wizard routes)
│   ├── index.tsx          # Home page (provides "Start Estimate" navigation to wizard)
│   ├── estimate.tsx       # Standard tab ROI view
│   ├── ideas.tsx          # Standard tab Design view
│   └── contractors.tsx    # Standard tab Build network view
├── wizard/
│   ├── _layout.tsx        # Stack Navigator wrapper containing persistent Stepper Header
│   ├── step-1.tsx         # Step 1: Address Fact Check & Zoning
│   ├── step-2.tsx         # Step 2: ADU Model Selection & Backyard Fit
│   ├── step-3.tsx         # Step 3: Style Direction & AI Concept Design
│   ├── step-4.tsx         # Step 4: ROI Modeling & Financial Assumptions
│   └── step-5.tsx         # Step 5: Builder Network & Quote Packet
└── _layout.tsx            # Global safety provider and store wrapper
```

### Navigational Controls
*   **✕ Close Button:** Displayed in the top right of the Stepper Header. Confirms exit and navigates back to `/(tabs)`.
*   **← Back Button:** Hollow styled control on the bottom left. Performs a `router.back()` or returns to the previous step index.
*   **Next → Button:** Prominent solid emerald button on the bottom right. Triggers form validation, commits state to store, and navigates to the next route (e.g. `router.push('/wizard/step-2')`). Displays "Finish & Close" on Step 5.

## Step-by-Step Flow Specifications

### Step 1: Address & Lot Facts (`app/wizard/step-1.tsx`)
*   **Content:** Renders Address search, lot boundaries overview card, setbacks summary, and zoning guide.
*   **Logic:** Retrieves active project or creates a new one. Pulls `ParcelSummary` and `RegulationGuide` based on the jurisdiction.

### Step 2: Model & Backyard Fit (`app/wizard/step-2.tsx`)
*   **Content:** Interactive lot canvas displaying the primary house and buildable backyard zone. Below, it lists available ADU models (Studio, 1-Bed, etc.) and fit signals.
*   **Interaction:** Nudge pad buttons (Up, Down, Left, Right, Rotate) let the user position the ADU.
*   **Save Logic:** Saves model selection and placement coordinate state via `saveWizardModelAndPlacement`.

### Step 3: Style & AI Concept (`app/wizard/step-3.tsx`)
*   **Content:** Architectural style horizontal rail selector, backyard site photo upload/capture interface, and AI Concept Card.
*   **Interaction:** Clicking "Generate Concept" initiates the backend design generator using the chosen model and placement.
*   **Save Logic:** Saves selected style via `saveWizardStyle`.

### Step 4: ROI Model (`app/wizard/step-4.tsx`)
*   **Content:** High-level metric cards (Value range, ROI, NOI, total cost). Below, the user can adjust numeric assumptions in a scrollable form.
*   **Save Logic:** Persists estimate inputs through the existing `saveEstimate` method.

### Step 5: Match & Package (`app/wizard/step-5.tsx`)
*   **Content:** Displays the generated quote packet payload checklist, lists matched vetted builders with license/insurance badges, and provides the "Request Quote" trigger.
*   **Completion:** The "Finish & Close" button exits the wizard and returns the user to `/(tabs)`.

## Data Model & Local Database Persistence
To share wizard state across screens, we extend the active `Project` record in our local store.

### Data Model Updates
Three optional properties are added to `Project` in [src/domain/types.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/domain/types.ts):
```typescript
export interface Project {
  // ... existing fields ...
  selectedModelId?: string;
  selectedStyleId?: DesignStyleId;
  placement?: DesignPlacement;
}
```

### Store Actions
We add two actions to the Zustand store in [src/state/appStore.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/state/appStore.ts):
1.  `saveWizardModelAndPlacement(projectId: string, modelId: string, placement: DesignPlacement): Promise<void>`
2.  `saveWizardStyle(projectId: string, styleId: DesignStyleId): Promise<void>`

Both actions update the active project state in Zustand and persist the JSON payload to SQLite via the existing `upsertProject` function.
