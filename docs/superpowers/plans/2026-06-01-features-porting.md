# Features Porting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Inspiration Gallery and Local Permit Guide from the legacy Expo mobile application to the LotFoundry Next.js web application.

**Architecture:** We will create two static data layers (`regulations-data.ts` and `inspiration-data.ts`) and two new UI panel components (`PermitGuidePanel.tsx` and `InspirationGalleryPanel.tsx`). We will then update the application shell navigation and conditionally render the panels in the Feasibility Studio, keeping the 3D visualizer active.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, Lucide Icons, Vitest, Playwright.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/regulations-data.ts` | Static regulations guides and jurisdiction inference |
| Create | `lib/regulations-data.test.ts` | Unit tests for jurisdiction inference |
| Create | `lib/inspiration-data.ts` | Static inspiration card items and templates |
| Create | `lib/inspiration-data.test.ts` | Unit tests for inspiration data values |
| Create | `components/studio/PermitGuidePanel.tsx` | UI card lists showing permit risk, checklist, and citations |
| Create | `components/studio/PermitGuidePanel.test.tsx` | Unit tests for checklist state and risk display |
| Create | `components/studio/InspirationGalleryPanel.tsx` | Scrollable ADU template cards with "Apply to Studio" callback |
| Create | `components/studio/InspirationGalleryPanel.test.tsx` | Unit tests for applying inspiration parameters |
| Modify | `components/studio/AppShell.tsx` | Add "Permit Guide" and "Inspiration Gallery" to navigation |
| Modify | `components/FeasibilityStudio.tsx` | Conditionally render the right panel based on navigation state |
| Modify | `e2e/feasibility-studio.spec.ts` | Add E2E tests for tab navigation and template application |

---

## Task 1: Add Regulations Data Layer

**Files:**
- Create: `lib/regulations-data.ts`
- Create: `lib/regulations-data.test.ts`

- [ ] **Step 1: Write the unit test first**

Create `lib/regulations-data.test.ts` to test address parsing and jurisdiction resolution:
```typescript
import { describe, expect, it } from "vitest";
import { inferJurisdiction, regulationGuides } from "./regulations-data";

describe("regulations data layers", () => {
  it("resolves specific cities correctly", () => {
    expect(inferJurisdiction("123 Oak St, Denver, CO 80202")).toBe("denver");
    expect(inferJurisdiction("812 Linden Ave, Portland, OR")).toBe("corner-lot");
    expect(inferJurisdiction("44 Mesa Ct, Austin, TX")).toBe("compact-lot");
    expect(inferJurisdiction("123 Cherry St, Oakland, CA")).toBe("oakland");
  });

  it("falls back to local-review for unsupported cities", () => {
    expect(inferJurisdiction("1200 Pine St, Boston, MA")).toBe("local-review");
  });

  it("checks regulation details structure", () => {
    const guide = regulationGuides["denver"];
    expect(guide.title).toContain("Denver");
    expect(guide.permitSteps.length).toBeGreaterThan(0);
    expect(guide.citations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run:
```powershell
npm run test
```
Expected: Fail since the module does not exist.

- [ ] **Step 3: Write the regulations data layer**

Create `lib/regulations-data.ts`:
```typescript
export type JurisdictionId =
  | "oak-street"      // Seattle (preset mapping)
  | "corner-lot"      // Portland (preset mapping)
  | "compact-lot"     // Austin (preset mapping)
  | "los-angeles"
  | "san-diego"
  | "san-jose"
  | "oakland"
  | "sacramento"
  | "denver"
  | "local-review";

export interface Citation {
  label: string;
  url: string;
}

export interface RegulationGuide {
  jurisdiction: JurisdictionId;
  title: string;
  summary: string;
  permitSteps: string[];
  blockers: string[];
  verifiedAt: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
}

export const regulationGuides: Record<JurisdictionId, RegulationGuide> = {
  "oak-street": {
    jurisdiction: "oak-street",
    title: "Seattle ADU Starter Guide",
    summary: "Seattle Community Planning and Development rules permit detached accessory dwelling units (DADUs) in residential zones where lot coverage allows.",
    permitSteps: [
      "Confirm lot size is at least 3,200 sf for detached ADUs.",
      "Verify setbacks: ADUs must be at least 5 feet from side and rear property lines.",
      "Limit maximum ADU size to 1,000 sf.",
      "Review utility connection expectations for separate plumbing.",
    ],
    blockers: [
      "Historic landmark districts or steep slope overlays.",
      "Utility easement conflicts along rear property lines.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Seattle DADU Portal", url: "https://www.seattle.gov/sdci" }
    ],
  },
  "corner-lot": {
    jurisdiction: "corner-lot",
    title: "Portland ADU Starter Guide",
    summary: "Portland rules allow up to two ADUs per lot. Setbacks, building height, and design matches are reviewed by Portland Bureau of Development Services.",
    permitSteps: [
      "Determine if the ADU will be attached, detached, or a basement conversion.",
      "Confirm detached ADU matches the style of the main house if exceeding 15 feet in height.",
      "Submit complete architectural and site boundary layouts to BDS.",
    ],
    blockers: [
      "Design overlays in historic conservation zones.",
      "Tree preservation rules limiting footprint placement.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Portland BDS ADU Guide", url: "https://www.portland.gov/bds" }
    ],
  },
  "compact-lot": {
    jurisdiction: "compact-lot",
    title: "Austin ADU Starter Guide",
    summary: "Austin zoning laws permit secondary dwelling units (ADUs) on residential lots meeting lot size and impervious cover standards.",
    permitSteps: [
      "Ensure lot size is at least 5,750 sf for R-1 lots (unless small-lot rules apply).",
      "Check maximum building coverage (40%) and impervious cover (45%) limits.",
      "Verify 10-foot separation from the main dwelling structure.",
    ],
    blockers: [
      "Protected heritage trees (19 inches or greater in diameter).",
      "McMansion ordinance height limit compliance.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Austin Planning Department", url: "https://www.austintexas.gov/planning" }
    ],
  },
  "los-angeles": {
    jurisdiction: "los-angeles",
    title: "Los Angeles ADU Starter Guide",
    summary: "LADBS processes ADUs under statewide California exemptions. Standards allow for streamlined approvals.",
    permitSteps: [
      "Verify single-family or multi-family parcel designation.",
      "Check eligibility for detached ADU (up to 1,200 sf) or attached ADU (up to 50% of main house size).",
      "Verify minimum 4-foot side and rear setbacks.",
    ],
    blockers: [
      "Very High Fire Hazard Severity Zones requiring special construction materials.",
      "Hillside grading or coastal development review overlays.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "LADBS ADU Portal", url: "https://dbs.lacity.gov/adu" }
    ],
  },
  "san-diego": {
    jurisdiction: "san-diego",
    title: "San Diego ADU Starter Guide",
    summary: "San Diego publishes ADU resources through Planning and Development Services, focusing on zoning incentives.",
    permitSteps: [
      "Identify transit priority areas for parking requirement exemptions.",
      "Confirm if building under San Diego preapproved standard plans.",
      "Submit architectural, structural, and energy compliance documents.",
    ],
    blockers: [
      "Coastal overlay zones requiring CA Coastal Commission review.",
      "Historic overlays requiring planning approvals.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "San Diego ADU Toolkit", url: "https://www.sandiego.gov/planning" }
    ],
  },
  "san-jose": {
    jurisdiction: "san-jose",
    title: "San Jose ADU Starter Guide",
    summary: "San Jose utilizes the ADU Universal Checklist to streamline review and preapproved builder configurations.",
    permitSteps: [
      "Cross-check lot with the ADU Universal Checklist.",
      "Verify maximum detached ADU size limits (up to 1,000 sf).",
      "Prepare plans for planning division submission.",
    ],
    blockers: [
      "Condominium conversion rules or rental restrictions.",
      "Utility metering conflicts.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "San Jose ADU Portal", url: "https://www.sanjoseca.gov" }
    ],
  },
  oakland: {
    jurisdiction: "oakland",
    title: "Oakland ADU Starter Guide",
    summary: "Oakland reviews ADUs based on single-family vs. multi-family structure categories.",
    permitSteps: [
      "Verify lot type (single-family vs. duplex/multi-family).",
      "Confirm setback exemptions (typically 4-foot rear/side).",
      "Prepare site boundary and elevation plans.",
    ],
    blockers: [
      "Rear yard coverage limits or short-term rental bans.",
      "Easement or utility accessibility limitations.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "Oakland Planning Services", url: "https://www.oaklandca.gov" }
    ],
  },
  sacramento: {
    jurisdiction: "sacramento",
    title: "Sacramento ADU Starter Guide",
    summary: "Sacramento hosts preapproved ADU design programs to expedite permitting.",
    permitSteps: [
      "Check if using Sacramento preapproved standard plans.",
      "Verify lot setbacks and utility easement access.",
      "Submit site-specific planning permit application.",
    ],
    blockers: [
      "Historic landmark district reviews.",
      "Utility easement conflicts.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "Sacramento Planning Division", url: "https://www.cityofsacramento.gov" }
    ],
  },
  denver: {
    jurisdiction: "denver",
    title: "Denver ADU Starter Guide",
    summary: "Denver permits ADUs in residential zones that explicitly allow accessory structures.",
    permitSteps: [
      "Check if residential zone contains 'G' suffix (ADU permitted).",
      "Verify 5-foot rear setbacks and 5-foot side setbacks.",
      "Prepare zoning and building permit application files.",
    ],
    blockers: [
      "Zoning code designation does not allow accessory structures.",
      "Utility connection conflicts in alleys.",
    ],
    verifiedAt: "2026-05-25",
    confidence: "high",
    citations: [
      { label: "Denver CPD ADU Guide", url: "https://www.denvergov.org" }
    ],
  },
  "local-review": {
    jurisdiction: "local-review",
    title: "Local Rules Verification Needed",
    summary: "LotFoundry can estimate financials here, but local zoning and permit database details are not linked yet.",
    permitSteps: [
      "Verify permitting guidelines with your local planning department.",
      "Check local setback, coverage, and height limits.",
      "Consult a licensed design professional.",
    ],
    blockers: [
      "Local municipal zoning policies not fully mapped in the system.",
    ],
    verifiedAt: "2026-05-25",
    confidence: "low",
    citations: [],
  },
};

export function inferJurisdiction(address: string): JurisdictionId {
  const normalized = address.toLowerCase();
  if (normalized.includes("seattle") || normalized.includes("oak street")) return "oak-street";
  if (normalized.includes("portland") || normalized.includes("linden")) return "corner-lot";
  if (normalized.includes("austin") || normalized.includes("mesa court")) return "compact-lot";
  if (normalized.includes("los angeles")) return "los-angeles";
  if (normalized.includes("san diego")) return "san-diego";
  if (normalized.includes("san jose")) return "san-jose";
  if (normalized.includes("oakland")) return "oakland";
  if (normalized.includes("sacramento")) return "sacramento";
  if (normalized.includes("denver")) return "denver";
  return "local-review";
}
```

- [ ] **Step 4: Run unit tests and confirm they pass**

Run:
```powershell
npm run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/regulations-data.ts lib/regulations-data.test.ts
git commit -m "feat(data): add regulations data layer and jurisdiction inference"
```

---

## Task 2: Add Inspiration Data Layer

**Files:**
- Create: `lib/inspiration-data.ts`
- Create: `lib/inspiration-data.test.ts`

- [ ] **Step 1: Write the unit test first**

Create `lib/inspiration-data.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { inspirationItems } from "./inspiration-data";

describe("inspiration data layer", () => {
  it("contains all 6 templates", () => {
    expect(inspirationItems.length).toBe(6);
  });

  it("verifies properties are correctly typed", () => {
    const item = inspirationItems[0];
    expect(item.id).toBe("canyon-courtyard");
    expect(item.sqft).toBe(640);
    expect(item.roof).toBe("shed");
    expect(item.finish).toBe("cedar");
  });
});
```

- [ ] **Step 2: Verify test fails**

Run:
```powershell
npm run test
```
Expected: Fail since the module does not exist.

- [ ] **Step 3: Write the inspiration data layer**

Create `lib/inspiration-data.ts`:
```typescript
import type { ExteriorFinish, RoofStyle } from "./feasibility";

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

export const inspirationItems: InspirationItem[] = [
  {
    id: "canyon-courtyard",
    title: "Courtyard Studio with Clerestory Light",
    style: "Warm Modern",
    sqft: 640,
    width: 20,
    length: 32,
    roof: "shed",
    finish: "cedar",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    tags: ["studio", "courtyard", "daylight"],
    summary: "A compact detached layout with a private entry court and high daylight clerestory windows.",
    budgetBand: "$250k - $400k",
  },
  {
    id: "garage-laneway",
    title: "Garage Conversion with Garden Entry",
    style: "California Bungalow",
    sqft: 520,
    width: 20,
    length: 26,
    roof: "flat",
    finish: "board",
    imageUrl: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80",
    tags: ["garage", "conversion", "compact"],
    summary: "A reuse-first concept for homeowners prioritizing speed, budget control, and rental utility.",
    budgetBand: "Under $250k",
  },
  {
    id: "bay-window",
    title: "One-Bedroom with Bay-Facing Lounge",
    style: "Urban Craftsman",
    sqft: 780,
    width: 24,
    length: 32.5,
    roof: "gable",
    finish: "lap",
    imageUrl: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    tags: ["one bedroom", "premium", "work nook"],
    summary: "A larger rental-ready layout with a defined living room, bay windows, and a small work alcove.",
    budgetBand: "Over $400k",
  },
  {
    id: "coastal-adu",
    title: "Coastal Long-Lot ADU",
    style: "Coastal Minimal",
    sqft: 700,
    width: 16,
    length: 44,
    roof: "flat",
    finish: "stucco",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    tags: ["detached", "long lot", "beach style"],
    summary: "A narrow footprint designed to preserve outdoor living space on tighter seaside lots.",
    budgetBand: "$250k - $400k",
  },
  {
    id: "valley-jadu",
    title: "JADU Suite inside Existing Home",
    style: "Simple Contemporary",
    sqft: 400,
    width: 20,
    length: 20,
    roof: "flat",
    finish: "board",
    imageUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
    tags: ["jadu", "conversion", "existing space"],
    summary: "A modest suite conversion for family flexibility with a lower construction footprint.",
    budgetBand: "Under $250k",
  },
  {
    id: "clean-gable",
    title: "Permit-Ready Inspired Cottage",
    style: "Clean Gable",
    sqft: 600,
    width: 20,
    length: 30,
    roof: "gable",
    finish: "lap",
    imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    tags: ["one bedroom", "cottage", "gable"],
    summary: "A straightforward detached concept intended to align with permit-ready plan thinking.",
    budgetBand: "$250k - $400k",
  },
];
```

- [ ] **Step 4: Run unit tests and confirm they pass**

Run:
```powershell
npm run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/inspiration-data.ts lib/inspiration-data.test.ts
git commit -m "feat(data): add inspiration data layer"
```

---

## Task 3: Build PermitGuidePanel Component

**Files:**
- Create: `components/studio/PermitGuidePanel.tsx`
- Create: `components/studio/PermitGuidePanel.test.tsx`

- [ ] **Step 1: Write the unit test first**

Create `components/studio/PermitGuidePanel.test.tsx`:
```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PermitGuidePanel from "./PermitGuidePanel";

describe("PermitGuidePanel component", () => {
  it("renders correct title and checklist items", () => {
    render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);
    expect(screen.getByText(/Denver ADU Starter Guide/i)).toBeInTheDocument();
    
    // Checklist step should render
    expect(screen.getByText(/Check if residential zone contains 'G' suffix/i)).toBeInTheDocument();
  });

  it("handles checkbox toggles locally", () => {
    render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);
    const checkbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run:
```powershell
npm run test
```
Expected: Fail (missing component).

- [ ] **Step 3: Implement PermitGuidePanel**

Create `components/studio/PermitGuidePanel.tsx`:
```typescript
"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ExternalLink, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { inferJurisdiction, regulationGuides } from "@/lib/regulations-data";

export interface PermitGuidePanelProps {
  address: string;
}

export default function PermitGuidePanel({ address }: PermitGuidePanelProps) {
  const jurisdictionId = inferJurisdiction(address);
  const guide = regulationGuides[jurisdictionId];

  // Keep track of check items completed locally
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleToggle = (item: string) => {
    setCheckedItems((current) => ({
      ...current,
      [item]: !current[item],
    }));
  };

  const getRiskDetails = () => {
    switch (guide.confidence) {
      case "high":
        return {
          label: "Verified Regulations (Low Risk)",
          icon: ShieldCheck,
          colorClass: "bg-lf-forest-soft text-lf-forest border-lf-forest/20",
        };
      case "medium":
        return {
          label: "Active Zoning Check (Moderate Risk)",
          icon: ShieldCheck,
          colorClass: "bg-lf-amber-soft text-lf-amber border-lf-amber/20",
        };
      default:
        return {
          label: "Review Required (Unverified Risk)",
          icon: ShieldAlert,
          colorClass: "bg-lf-brick-soft text-lf-brick border-lf-brick/20",
        };
    }
  };

  const risk = getRiskDetails();
  const RiskIcon = risk.icon;

  return (
    <section
      aria-label="Permit guide panel"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-hidden xl:w-[404px] xl:border-l"
    >
      <div className="flex h-full flex-col lg:min-h-0">
        <div className="border-b border-lf-hairline px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-lf-espresso">
            Permit Guide
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Sourced local rules and permit review guides.
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4 lg:min-h-0">
          <div>
            <h3 className="text-lg font-bold text-lf-espresso">{guide.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-lf-muted">{guide.summary}</p>
          </div>

          {/* Risk Level Badge */}
          <div className={`flex items-start gap-2.5 rounded-md border p-3.5 text-xs font-semibold ${risk.colorClass}`}>
            <RiskIcon size={16} className="mt-0.5 shrink-0" />
            <div>
              <div>{risk.label}</div>
              <p className="mt-1 font-normal leading-4 opacity-80">
                Verified at: {guide.verifiedAt} · Confidence: {guide.confidence}
              </p>
            </div>
          </div>

          {/* Permit Steps Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
              Permitting Steps
            </h4>
            <div className="space-y-2.5">
              {guide.permitSteps.map((step, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-lf-hairline bg-lf-sand/20 p-3 hover:bg-lf-sand/40 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[step]}
                    onChange={() => handleToggle(step)}
                    className="mt-0.5 h-4 w-4 accent-lf-clay rounded focus:ring-lf-clay"
                  />
                  <span className={`text-sm leading-relaxed ${checkedItems[step] ? "text-lf-muted line-through" : "text-lf-espresso font-medium"}`}>
                    {step}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Blockers / Warnings */}
          {guide.blockers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
                Potential Blockers
              </h4>
              <div className="rounded-md border border-lf-brick/30 bg-lf-brick-soft p-3.5 text-xs text-lf-brick">
                <div className="flex gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <ul className="list-disc pl-3 space-y-1 font-medium">
                    {guide.blockers.map((blocker, idx) => (
                      <li key={idx}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sourced Citations */}
          {guide.citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
                Local Resources
              </h4>
              <ul className="space-y-2">
                {guide.citations.map((citation, idx) => (
                  <li key={idx}>
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-lf-clay hover:text-lf-mahogany transition"
                    >
                      <BookOpen size={14} />
                      {citation.label}
                      <ExternalLink size={12} className="opacity-70" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run unit tests and confirm they pass**

Run:
```powershell
npm run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/studio/PermitGuidePanel.tsx components/studio/PermitGuidePanel.test.tsx
git commit -m "feat(studio): add PermitGuidePanel component"
```

---

## Task 4: Build InspirationGalleryPanel Component

**Files:**
- Create: `components/studio/InspirationGalleryPanel.tsx`
- Create: `components/studio/InspirationGalleryPanel.test.tsx`

- [ ] **Step 1: Write the unit test first**

Create `components/studio/InspirationGalleryPanel.test.tsx`:
```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InspirationGalleryPanel from "./InspirationGalleryPanel";
import { inspirationItems } from "@/lib/inspiration-data";

describe("InspirationGalleryPanel component", () => {
  it("renders inspiration cards list", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel onApply={onApply} />);
    expect(screen.getByText(/Courtyard Studio with Clerestory Light/i)).toBeInTheDocument();
    expect(screen.getByText(/Garage Conversion with Garden Entry/i)).toBeInTheDocument();
  });

  it("calls onApply when clicking the apply button", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel onApply={onApply} />);
    
    const applyButtons = screen.getAllByRole("button", { name: /Apply to Studio/i });
    fireEvent.click(applyButtons[0]);

    expect(onApply).toHaveBeenCalledWith(inspirationItems[0]);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run:
```powershell
npm run test
```
Expected: Fail (missing component).

- [ ] **Step 3: Implement InspirationGalleryPanel**

Create `components/studio/InspirationGalleryPanel.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { inspirationItems, type InspirationItem } from "@/lib/inspiration-data";

export interface InspirationGalleryPanelProps {
  onApply: (item: InspirationItem) => void;
}

export default function InspirationGalleryPanel({ onApply }: InspirationGalleryPanelProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (item: InspirationItem) => {
    onApply(item);
    setAppliedId(item.id);
    setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <section
      aria-label="Inspiration gallery panel"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-hidden xl:w-[404px] xl:border-l"
    >
      <div className="flex h-full flex-col lg:min-h-0">
        <div className="border-b border-lf-hairline px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-lf-espresso">
            Inspiration Gallery
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Pre-designed ADU precedents. Apply one to your lot.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4 lg:min-h-0">
          {inspirationItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-lf-hairline bg-lf-card overflow-hidden shadow-sm hover:border-lf-clay/35 transition"
            >
              {/* Card Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-40 w-full object-cover"
              />

              <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                  <h3 className="font-display font-semibold text-base text-lf-espresso leading-snug">
                    {item.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-[10px] font-mono font-medium text-lf-muted border border-lf-hairline px-1.5 py-0.5 rounded bg-lf-sand/30">
                      {item.style}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-lf-muted border border-lf-hairline px-1.5 py-0.5 rounded bg-lf-sand/30">
                      {item.sqft} sf ({item.width}'x{item.length}')
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs leading-relaxed text-lf-muted">{item.summary}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-semibold uppercase tracking-wider text-lf-clay bg-lf-taupe-soft px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer and Button */}
                <div className="flex items-center justify-between border-t border-lf-hairline pt-3 mt-1">
                  <span className="text-[11px] font-bold text-lf-muted uppercase tracking-wider font-mono">
                    {item.budgetBand}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
                      appliedId === item.id
                        ? "bg-lf-forest text-lf-sand"
                        : "bg-lf-mahogany text-lf-sand-2 hover:bg-lf-clay"
                    }`}
                  >
                    {appliedId === item.id ? (
                      <>
                        <CheckCircle2 size={13} />
                        Applied ✓
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Apply to Studio
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run unit tests and confirm they pass**

Run:
```powershell
npm run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/studio/InspirationGalleryPanel.tsx components/studio/InspirationGalleryPanel.test.tsx
git commit -m "feat(studio): add InspirationGalleryPanel component"
```

---

## Task 5: Integrate into AppShell Navigation

**Files:**
- Modify: `components/studio/AppShell.tsx`

- [ ] **Step 1: Update navigation items array**

In `components/studio/AppShell.tsx`, replace the `navItems` array import and definition block (lines 3–13) with the new nav list containing "Permit Guide" and "Inspiration Gallery":
```typescript
import { BarChart3, Box, FileText, LogOut, Sparkles, Share2, Trash2 } from "lucide-react";
import type { NavItem } from "./types";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";

export const navItems: NavItem[] = [
  { id: "studio", label: "Feasibility Studio", icon: Box },
  { id: "guide", label: "Permit Guide", icon: FileText },
  { id: "inspiration", label: "Inspiration Gallery", icon: Sparkles },
  { id: "summary", label: "Estimate Summary", icon: BarChart3 },
  { id: "export", label: "Export Preview", icon: Share2 },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/studio/AppShell.tsx
git commit -m "feat(nav): add Permit Guide and Inspiration Gallery to sidebar navigation"
```

---

## Task 6: Wire Conditional Panel Swapping in FeasibilityStudio

**Files:**
- Modify: `components/FeasibilityStudio.tsx`

- [ ] **Step 1: Add new component imports**

In `components/FeasibilityStudio.tsx`, add the data and panel imports (line ~45):
```typescript
import PermitGuidePanel from "./studio/PermitGuidePanel";
import InspirationGalleryPanel from "./studio/InspirationGalleryPanel";
import { configForFootprint } from "@/lib/feasibility";
```

- [ ] **Step 2: Render right panel conditionally based on activeNav**

In `components/FeasibilityStudio.tsx`, replace the `<FeasibilityInspector />` rendering block (lines ~293–305) with the conditional panel swapping logic:
```tsx
        {activeNav === "guide" ? (
          <PermitGuidePanel address={activeParcel.address} />
        ) : activeNav === "inspiration" ? (
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
              setActiveNav("studio");
            }}
          />
        ) : (
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
            saveNotice={saveNotice}
          />
        )}
```

- [ ] **Step 3: Run Vitest tests to ensure no regressions**

Run:
```powershell
npm run test
```
Expected: PASS (all 54 unit tests plus our new 6 unit tests = 60 passed).

- [ ] **Step 4: Commit**

```bash
git add components/FeasibilityStudio.tsx
git commit -m "feat(studio): wire conditional inspector swaps in FeasibilityStudio"
```

---

## Task 7: Add E2E Integration and Smoke Tests

**Files:**
- Modify: `e2e/feasibility-studio.spec.ts`

- [ ] **Step 1: Write integration tests**

In `e2e/feasibility-studio.spec.ts`, append the following E2E tests within the public flow describe block (line ~47):
```typescript
  test("user can navigate to Permit Guide and view local rules", async ({ page }) => {
    await page.goto("/");
    // Navigating via mobile/desktop navigation button
    await page.getByRole("button", { name: /Permit Guide/i }).click();
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeVisible();
    await expect(page.getByText(/Confirm lot size is at least 3,200 sf/i)).toBeVisible();
  });

  test("user can browse Inspiration Gallery and apply a template", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Inspiration Gallery/i }).click();
    await expect(page.getByRole("heading", { name: /Garage Conversion with Garden Entry/i })).toBeVisible();

    // Click Apply on the first inspiration card (Canyon Courtyard)
    const applyButton = page.getByRole("button", { name: /Apply to Studio/i }).first();
    await applyButton.click();

    // Assert that the page redirected back to the studio and updated the active ADU Rent estimate
    await expect(page.getByRole("heading", { name: "Feasibility Studio", level: 2 })).toBeVisible();
    await expect(page.getByText("CEDAR", { exact: true })).toBeVisible();
  });
```

- [ ] **Step 2: Run local Playwright tests**

Run:
```powershell
npm run test:e2e
```
Expected: PASS (all 26 E2E tests).

- [ ] **Step 3: Commit**

```bash
git add e2e/feasibility-studio.spec.ts
git commit -m "test(e2e): add integration tests for Permit Guide and Inspiration Gallery"
```
