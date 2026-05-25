# Supported Markets And Qualified Packets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make YardUp truthful outside seeded jurisdictions and establish a consented, delivered quote-packet event that can support future builder-paid revenue.

**Architecture:** Add an explicit `local-review` coverage state instead of defaulting unknown addresses to Los Angeles, and scope builder profiles through declared jurisdiction coverage. Extend quote delivery with saved-versus-sent and commercial eligibility semantics; delivery and eligibility are set only after a successful authenticated backend write with homeowner consent. Payment collection is intentionally excluded from this plan.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router 6, Zustand, Firebase callable Functions, Zod, TypeScript, Vitest.

---

## File Structure

- `src/domain/types.ts`: shared market, contractor, and quote-delivery types.
- `src/data/regulations.ts`: jurisdiction inference and local-review fallback guidance.
- `src/data/contractors.ts`: explicit declared builder coverage.
- `src/domain/marketplace.ts`: pure matching and delivery-status helpers.
- `src/domain/marketplace.test.ts`: coverage and commercial eligibility unit tests.
- `src/state/appStore.ts` and `src/state/appStore.test.ts`: retryable saved packet persistence and delivered transitions.
- `src/services/advisorServices.ts`: consent-aware callable request.
- `app/(tabs)/index.tsx`, `app/(tabs)/contractors.tsx`, `app/(tabs)/guide.tsx`, `app/wizard/step-1.tsx`, `app/wizard/step-5.tsx`: customer-visible coverage and delivery states.
- `src/components/AuthModal.tsx`: accurate account wording without unsupported sync claims.
- `functions/src/types.ts`, `functions/src/schemas.ts`, `functions/src/lib/regulations.ts`, `functions/src/data/regulations.ts`, `functions/src/lib/quoteRequests.ts`, `functions/src/index.ts`: backend acceptance of local-review and delivered-consent persistence.
- `docs/api/api-design.md`, `docs/api/openapi.yaml`, `docs/release/store-review-notes.md`, `store/metadata/en-US/*.txt`: accurate review and commercial-boundary content.

### Task 1: Define Market Coverage And Matching Semantics

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/regulations.ts`
- Modify: `src/data/contractors.ts`
- Create: `src/domain/marketplace.ts`
- Create: `src/domain/marketplace.test.ts`
- Modify: `src/data/professionalData.test.ts`

- [ ] **Step 1: Write failing coverage and matching tests**

Create tests that assert unknown locations do not become Los Angeles and unverified markets have no declared builder match:

```typescript
import { describe, expect, it } from "vitest";

import { contractorProfiles } from "../data/contractors";
import { inferJurisdiction } from "../data/regulations";
import { getMatchedContractors } from "./marketplace";

describe("marketplace coverage", () => {
  it("uses local review for addresses outside seeded market coverage", () => {
    expect(inferJurisdiction("610 Pearl St, Denver, CO")).toBe("local-review");
    expect(inferJurisdiction("1420 Baxter St, Los Angeles, CA")).toBe("los-angeles");
  });

  it("does not show direct builder matches until the market is covered", () => {
    expect(getMatchedContractors(contractorProfiles, "local-review")).toEqual([]);
    expect(getMatchedContractors(contractorProfiles, "san-diego").map((builder) => builder.id)).toContain("golden-state-modular");
  });
});
```

Run: `npx vitest run src/domain/marketplace.test.ts src/data/professionalData.test.ts`

Expected: FAIL because `local-review`, declared coverage, and matching helpers do not exist.

- [ ] **Step 2: Extend domain types**

Define sourced coverage and quote contract types in `src/domain/types.ts`:

```typescript
export type CoveredJurisdictionId =
  | "los-angeles"
  | "san-diego"
  | "san-jose"
  | "oakland"
  | "sacramento";

export type JurisdictionId = CoveredJurisdictionId | "local-review";

export interface ContractorProfile {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  rating: number;
  reviews: number;
  matchScore: number;
  licenseStatus: "verified" | "pending";
  insuranceStatus: "verified" | "pending";
  serviceArea: string;
  supportedJurisdictions: CoveredJurisdictionId[];
  priceRange: string;
  timelineWeeks: string;
  aduCount: number;
  permitSupport: boolean;
  tags: string[];
  reviewExcerpt: string;
}

export interface QuoteRequest {
  id: string;
  projectId: string;
  contractorId: string;
  status: "saved" | "sent";
  packetItems: string[];
  createdAt: string;
  homeownerConsentAt?: string;
  deliveredAt?: string;
  commercialStatus: "not_eligible" | "eligible_for_builder_fee";
}
```

- [ ] **Step 3: Add honest jurisdiction inference and seeded coverage**

Change `inferJurisdiction()` to return `local-review` unless a known city is named, add `local-review: "Local rules verification needed"` to labels, and include a low-confidence generic `local-review` regulation guide whose copy states no sourced local-rule coverage exists yet.

Add `supportedJurisdictions` arrays to each seeded contractor. Do not claim coverage beyond each service-area string: Apex and EcoStudio cover Los Angeles only; Golden State covers Los Angeles, San Diego, San Jose, and Oakland.

```typescript
"local-review": {
  jurisdiction: "local-review",
  title: "Local rules verification needed",
  summary: "YardUp can model earning potential here, but sourced local permit coverage is not available for this jurisdiction yet. Verify requirements with your city or county before construction decisions.",
  permitSteps: [
    "Identify the city or county permitting authority for this property.",
    "Confirm ADU eligibility, setbacks, utilities, overlays, and fire access locally.",
    "Use the estimate and concept as planning inputs only until local review is complete.",
  ],
  blockers: ["Sourced local zoning and permit guidance is not available in YardUp for this jurisdiction yet."],
  verifiedAt: "2026-05-25",
  confidence: "low",
  citations: [],
}
```

- [ ] **Step 4: Implement pure matching helpers**

Create `src/domain/marketplace.ts`:

```typescript
import type { ContractorProfile, JurisdictionId, QuoteRequest } from "./types";

export function getMatchedContractors(contractors: ContractorProfile[], jurisdiction: JurisdictionId) {
  if (jurisdiction === "local-review") return [];
  return contractors.filter((contractor) => contractor.supportedJurisdictions.includes(jurisdiction));
}

export function isDeliveredQuote(request: QuoteRequest) {
  return request.status === "sent";
}

export function isCommerciallyEligible(request: QuoteRequest) {
  return request.status === "sent" &&
    request.commercialStatus === "eligible_for_builder_fee" &&
    Boolean(request.homeownerConsentAt);
}
```

- [ ] **Step 5: Run targeted tests**

Run: `npx vitest run src/domain/marketplace.test.ts src/data/professionalData.test.ts`

Expected: PASS.

### Task 2: Make Quote Delivery Retryable And Commercially Truthful

**Files:**
- Modify: `src/services/advisorServices.ts`
- Modify: `src/state/appStore.ts`
- Modify: `src/state/appStore.test.ts`

- [ ] **Step 1: Write failing store tests for saved and delivered requests**

Extend `src/state/appStore.test.ts`:

```typescript
it("keeps an undelivered quote packet saved and retryable", async () => {
  mocks.submitQuoteRequest.mockResolvedValue(null);
  const request = await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);
  expect(request.status).toBe("saved");
  expect(request.commercialStatus).toBe("not_eligible");
  expect(mocks.submitQuoteRequest).toHaveBeenCalledTimes(1);

  await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);
  expect(mocks.submitQuoteRequest).toHaveBeenCalledTimes(2);
});

it("stores a delivered consented packet as commercially eligible", async () => {
  mocks.submitQuoteRequest.mockResolvedValue({
    id: "quote-1",
    projectId: starterProject.id,
    contractorId: "apex-adu-builders",
    packetItems: ["ROI model"],
    status: "sent",
    createdAt: "2026-05-25T00:00:00.000Z",
    homeownerConsentAt: "2026-05-25T00:00:00.000Z",
    deliveredAt: "2026-05-25T00:00:00.000Z",
    commercialStatus: "eligible_for_builder_fee",
  });
  const request = await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);
  expect(request.commercialStatus).toBe("eligible_for_builder_fee");
});
```

Run: `npx vitest run src/state/appStore.test.ts`

Expected: FAIL because quote requests are always stored as sent and cannot be retried.

- [ ] **Step 2: Pass homeowner consent to the callable service**

Change the signature and payload in `src/services/advisorServices.ts`:

```typescript
export async function submitQuoteRequest(
  projectId: string,
  contractorId: string,
  packetItems: string[],
  homeownerConsent: true,
): Promise<QuoteRequest | null> {
  const hasSession = await ensureFirebaseSession();
  if (!hasSession) return null;

  return callCloudFunction<
    { projectId: string; contractorId: string; packetItems: string[]; homeownerConsent: true },
    QuoteRequest
  >("submitQuoteRequest", { projectId, contractorId, packetItems, homeownerConsent }).catch(() => null);
}
```

- [ ] **Step 3: Persist saved fallback records and allow delivery retry**

Update the store request signature to `requestQuote(projectId, contractorId, homeownerConsent: true)`. Return an existing request immediately only when its status is `sent`; retry remote delivery for saved records. When remote delivery is unavailable, upsert:

```typescript
{
  id: `quote-${projectId}-${contractorId}`,
  projectId,
  contractorId,
  status: "saved",
  packetItems,
  createdAt: existing?.createdAt ?? now,
  homeownerConsentAt: existing?.homeownerConsentAt ?? now,
  commercialStatus: "not_eligible",
}
```

- [ ] **Step 4: Run store tests**

Run: `npx vitest run src/state/appStore.test.ts`

Expected: PASS.

### Task 3: Enforce Delivery Consent In Firebase Functions

**Files:**
- Modify: `functions/src/types.ts`
- Modify: `functions/src/schemas.ts`
- Modify: `functions/src/data/regulations.ts`
- Modify: `functions/src/lib/regulations.ts`
- Modify: `functions/src/lib/quoteRequests.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/schemas.test.ts`
- Modify: `functions/src/lib/regulations.test.ts`

- [ ] **Step 1: Write failing backend contract tests**

Add:

```typescript
it("accepts local review coverage without claiming a sourced city", () => {
  expect(getRegulationGuideInputSchema.parse({ jurisdiction: "local-review" }).jurisdiction).toBe("local-review");
});

it("requires affirmative homeowner consent for quote delivery", () => {
  expect(() => submitQuoteRequestInputSchema.parse({
    projectId: "p1",
    contractorId: "c1",
    packetItems: ["ROI model"],
  })).toThrow();
  expect(submitQuoteRequestInputSchema.parse({
    projectId: "p1",
    contractorId: "c1",
    packetItems: ["ROI model"],
    homeownerConsent: true,
  }).homeownerConsent).toBe(true);
});
```

Run: `npm --prefix functions test -- src/schemas.test.ts src/lib/regulations.test.ts`

Expected: FAIL because the new jurisdiction and consent input are unsupported.

- [ ] **Step 2: Extend backend types and schemas**

Add `"local-review"` to `JurisdictionId` and to `jurisdictionSchema`. Extend quote input with:

```typescript
homeownerConsent: z.literal(true),
```

Add a low-confidence `local-review` regulation guide that clearly requires local verification and has no invented city-specific parcel information.

- [ ] **Step 3: Persist delivery and commercial eligibility only after server success**

Update `functions/src/lib/quoteRequests.ts` so its payload requires `homeownerConsent: true` and successful stored documents contain:

```typescript
status: "sent",
homeownerConsentAt: now,
deliveredAt: now,
commercialStatus: "eligible_for_builder_fee",
```

Pass `homeownerConsent` through from `functions/src/index.ts` into `saveQuoteRequest`.

- [ ] **Step 4: Run backend tests and typecheck**

Run:

```bash
npm run backend:typecheck
npm run backend:test
```

Expected: PASS.

### Task 4: Render Honest Customer States In The Mobile Flow

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/contractors.tsx`
- Modify: `app/(tabs)/guide.tsx`
- Modify: `app/wizard/step-1.tsx`
- Modify: `app/wizard/step-5.tsx`
- Modify: `src/components/AuthModal.tsx`

- [ ] **Step 1: Scope visible matches through the matching helper**

In the Value and Builders surfaces, derive:

```typescript
const matchedContractors = useMemo(
  () => project ? getMatchedContractors(contractors, project.jurisdiction) : [],
  [contractors, project],
);
const deliveredRequests = projectRequests.filter(isDeliveredQuote);
```

Use `matchedContractors.length` in the revenue and packet surfaces; never show seeded out-of-area profiles as local matches.

- [ ] **Step 2: Add local-review empty and permit states**

For projects whose jurisdiction is `local-review`, show:

```tsx
<Text>Local rules verification needed</Text>
<Text>We can model earning potential now, but sourced permit and builder coverage is not available for this jurisdiction yet.</Text>
```

Do not render a quote-send CTA when no declared builder coverage exists. Permit risk uses amber verification language and the generic low-confidence guide.

- [ ] **Step 3: Add clear homeowner consent and saved/delivered copy**

Near each available builder handoff action render:

```tsx
<Text>No fee to homeowners. By sending, you consent to share this packet with the selected builder. Builders may pay YardUp for qualified introductions.</Text>
```

Change the CTA to `Consent and send packet`, call `requestQuote(project.id, contractorId, true)`, and distinguish statuses:

```tsx
{request?.status === "saved" ? "Saved - retry delivery" : "Packet delivered"}
```

Do not disable retry for `saved` packets.

- [ ] **Step 4: Remove inaccurate cloud-sync promises**

Replace unsupported account claims such as `Your ADU project data is securely synced to the cloud.` with accurate language:

```tsx
Cloud-backed requests use your account when you choose to send them. Project studies remain stored locally by default.
```

- [ ] **Step 5: Verify app typecheck**

Run: `npm run typecheck`

Expected: PASS.

### Task 5: Align Review, API, And Commercial Documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/api/api-design.md`
- Modify: `docs/api/openapi.yaml`
- Modify: `docs/release/store-review-notes.md`
- Modify: `store/metadata/en-US/description.txt`
- Modify: `store/metadata/en-US/review_notes.txt`
- Modify: `store/metadata/en-US/release_notes.txt`

- [ ] **Step 1: Preserve canonical repository guidance**

Keep the newly established statement that the active remote `https://github.com/torralba85/YardUp.git` is the canonical YardUp product repository and must be checked before relying on sibling-repo assumptions.

- [ ] **Step 2: Update API contract**

Document `local-review`, the consent field, and quote statuses:

```yaml
JurisdictionId:
  type: string
  enum: [los-angeles, san-diego, san-jose, oakland, sacramento, local-review]
QuoteRequest:
  properties:
    status:
      type: string
      enum: [saved, sent]
    commercialStatus:
      type: string
      enum: [not_eligible, eligible_for_builder_fee]
SubmitQuoteRequestCallableRequest:
  properties:
    data:
      properties:
        homeownerConsent:
          type: boolean
          const: true
```

- [ ] **Step 3: Update review and store language**

State that any location can start a study, local sourced-rule depth varies, out-of-coverage projects show local verification rather than an incorrect city guide, packet delivery requires homeowner consent and a successful backend send, and no homeowner payment is collected in this release.

- [ ] **Step 4: Check documentation diff**

Run: `git diff --check -- AGENTS.md README.md docs/api docs/release store/metadata`

Expected: no whitespace or patch-format errors.

### Task 6: Validate The Release-Critical Flow

**Files:**
- Verify only; no required edits.

- [ ] **Step 1: Run required repository validation**

Run:

```bash
npm run typecheck
npm test
npm run backend:typecheck
npm run backend:test
npm run release:check
```

Expected: all commands pass.

- [ ] **Step 2: Inspect narrow mobile states in Expo web preview**

Start or reuse `npm run dev`, navigate at a narrow phone width, and verify:

1. A known city project shows only declared local builder matches and sourced permit copy.
2. A Denver or otherwise uncovered project displays `Local rules verification needed`, has no local builder send action, and never labels itself Los Angeles.
3. A cloud-unavailable quote action displays saved/retry language rather than sent or delivered.
4. A successfully delivered request uses explicit consent copy and delivered wording.

- [ ] **Step 3: Review diff for local artifact safety**

Run: `git status --short` and confirm `.env.local`, `firebase/` registration files, generated demo media, and unrelated local configuration are not staged unless separately requested.

Expected: Phase 1 implementation files are the only files selected for any commit.

## Plan Self-Review

- Spec coverage: tasks cover market coverage, scoped matching, truthful packet delivery, homeowner consent, commercial eligibility, UI wording, backend contract, API/store documentation, and verification.
- Placeholder scan: payment collection is intentionally excluded with a concrete reason; there are no unspecified implementation placeholders in the Phase 1 tasks.
- Type consistency: the plan consistently uses `local-review`, `homeownerConsent: true`, `status: "saved" | "sent"`, and `commercialStatus: "not_eligible" | "eligible_for_builder_fee"`.
