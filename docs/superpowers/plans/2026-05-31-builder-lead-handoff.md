> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Builder Lead Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let lot owners submit a consented ADU feasibility snapshot to matched local builders, and let registered builders review those requests from an inbox.

**Architecture:** Add a small marketplace domain layer, Firestore adapter, owner handoff panel, builder dashboard, and Firestore rules for owner/builder access. Keep v1 inbox-only: no emails, quotes, payments, or delivery claims.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Auth, Firestore, Tailwind CSS 4, Vitest, Testing Library, Playwright

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/marketplace-types.ts` | Shared builder, request, contact, and response types |
| Create | `lib/marketplace.ts` | Pure matching, location parsing, validation, and snapshot helpers |
| Create | `lib/marketplace-firestore.ts` | Firestore reads/writes for builders and connection requests |
| Modify | `firestore.rules` | Secure builder profiles, connection requests, and builder responses |
| Create | `components/studio/BuilderLeadPanel.tsx` | Owner consent/contact form for submitting current snapshot |
| Modify | `components/studio/ReportPreview.tsx` | Add `Connect with local builders` action |
| Modify | `components/FeasibilityStudio.tsx` | Wire owner handoff panel to current parcel/config/result |
| Create | `app/builder/page.tsx` | Auth-gated builder dashboard route |
| Create | `components/builder/BuilderDashboard.tsx` | Profile gate plus inbox shell |
| Create | `components/builder/BuilderProfileForm.tsx` | Self-service builder profile form |
| Create | `components/builder/BuilderInbox.tsx` | Request list/detail and response actions |
| Modify | `app/signup/page.tsx` | Route builder signups to `/builder` |
| Modify | `app/login/LoginForm.tsx` | Allow safe redirect to `/builder` |
| Test | `lib/marketplace.test.ts` | Domain behavior tests |
| Test | `components/studio/BuilderLeadPanel.test.tsx` | Owner form tests |
| Test | `components/builder/BuilderDashboard.test.tsx` | Builder dashboard tests |

---

## Task 1: Add Marketplace Domain Types

**Files:**
- Create: `lib/marketplace-types.ts`

- [ ] **Step 1: Create shared marketplace types**

Create `lib/marketplace-types.ts`:

```typescript
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

export interface ServiceArea {
  city: string;
  state: string;
  key: string;
}

export interface BuilderProfile {
  id: string;
  ownerUid: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  licenseNumber: string | null;
  serviceAreas: ServiceArea[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OwnerContact {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}

export interface ConnectionSnapshot {
  parcel: Parcel;
  parcelKey: string;
  parcelAddress: string;
  parcelCity: string;
  parcelState: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  reportText: string;
}

export interface ConnectionRequest {
  id: string;
  ownerUid: string;
  ownerContact: OwnerContact;
  snapshot: ConnectionSnapshot;
  matchedBuilderIds: string[];
  status: "submitted";
  createdAt: string | null;
  updatedAt: string | null;
}

export type BuilderResponseStatus = "new" | "interested" | "not-a-fit";

export interface BuilderResponse {
  builderId: string;
  status: BuilderResponseStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BuilderInboxItem {
  request: ConnectionRequest;
  response: BuilderResponse;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: passes.

---

## Task 2: Add Pure Matching and Snapshot Helpers

**Files:**
- Create: `lib/marketplace.ts`
- Test: `lib/marketplace.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `lib/marketplace.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";
import {
  buildConnectionSnapshot,
  getMatchedBuilders,
  normalizeServiceArea,
  parseParcelCityState,
  validateOwnerContact,
} from "./marketplace";
import type { BuilderProfile } from "./marketplace-types";

const builders: BuilderProfile[] = [
  {
    id: "builder-seattle",
    ownerUid: "builder-seattle",
    companyName: "Seattle ADU Works",
    contactEmail: "team@seattle.example",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "builder-portland",
    ownerUid: "builder-portland",
    companyName: "Portland Homes",
    contactEmail: "team@portland.example",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Portland", state: "OR", key: "portland-or" }],
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "inactive-seattle",
    ownerUid: "inactive-seattle",
    companyName: "Inactive Builder",
    contactEmail: "inactive@example.com",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    active: false,
    createdAt: null,
    updatedAt: null,
  },
];

describe("marketplace domain helpers", () => {
  it("normalizes service areas to city-state keys", () => {
    expect(normalizeServiceArea(" Seattle ", "wa")).toEqual({
      city: "Seattle",
      state: "WA",
      key: "seattle-wa",
    });
  });

  it("parses parcel city/state while ignoring zip codes", () => {
    expect(parseParcelCityState("Seattle, WA 98115")).toEqual({
      city: "Seattle",
      state: "WA",
      key: "seattle-wa",
    });
  });

  it("matches only active builders in the parcel service area", () => {
    expect(getMatchedBuilders(builders, "Seattle, WA 98115").map((b) => b.id)).toEqual([
      "builder-seattle",
    ]);
  });

  it("validates minimal owner contact details and consent", () => {
    expect(
      validateOwnerContact({
        name: "Jane Owner",
        email: "jane@example.com",
        phone: "",
        message: "",
        consent: true,
      }),
    ).toEqual({
      ok: true,
      contact: {
        name: "Jane Owner",
        email: "jane@example.com",
        phone: null,
        message: null,
      },
    });
  });

  it("rejects missing consent", () => {
    expect(
      validateOwnerContact({
        name: "Jane Owner",
        email: "jane@example.com",
        phone: "",
        message: "",
        consent: false,
      }),
    ).toEqual({ ok: false, error: "Consent is required before sharing with builders." });
  });

  it("builds an immutable snapshot payload from the current scenario", () => {
    const parcel = parcelPresets[0];
    const result = {
      aduSqft: 600,
      totalFootprint: 1980,
      allowedFootprint: 2000,
      remainingCapacity: 20,
      coveragePercent: 39.6,
      maxCoveragePercent: 40,
      zoningStatus: "Compliant" as const,
      costLow: 220000,
      costHigh: 270000,
      costPerSqftLow: 367,
      costPerSqftHigh: 450,
      monthlyRent: 2050,
      annualNoi: 16605,
      paybackYears: 15.7,
      warnings: [],
    };

    const snapshot = buildConnectionSnapshot({
      parcelKey: "oak-street",
      parcel,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      result,
    });

    expect(snapshot.parcelCity).toBe("Seattle");
    expect(snapshot.parcelState).toBe("WA");
    expect(snapshot.reportText).toContain("LotFoundry - Concept Feasibility Report");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test -- lib/marketplace.test.ts`

Expected: fails because `lib/marketplace.ts` does not exist.

- [ ] **Step 3: Implement domain helpers**

Create `lib/marketplace.ts`:

```typescript
import { buildReportText } from "./report";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";
import type {
  BuilderProfile,
  ConnectionSnapshot,
  OwnerContact,
  ServiceArea,
} from "./marketplace-types";

export interface OwnerContactFormInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export type OwnerContactValidation =
  | { ok: true; contact: OwnerContact }
  | { ok: false; error: string };

export function normalizeServiceArea(city: string, state: string): ServiceArea {
  const normalizedCity = city.trim().replace(/\s+/g, " ");
  const normalizedState = state.trim().slice(0, 2).toUpperCase();
  return {
    city: toTitleCase(normalizedCity),
    state: normalizedState,
    key: `${normalizedCity.toLowerCase()}-${normalizedState.toLowerCase()}`,
  };
}

export function parseParcelCityState(value: string): ServiceArea | null {
  const [cityPart, statePart] = value.split(",");
  if (!cityPart || !statePart) return null;
  const state = statePart.trim().split(/\s+/)[0];
  if (!state) return null;
  return normalizeServiceArea(cityPart, state);
}

export function getMatchedBuilders(
  builders: BuilderProfile[],
  parcelCity: string,
): BuilderProfile[] {
  const area = parseParcelCityState(parcelCity);
  if (!area) return [];
  return builders.filter(
    (builder) =>
      builder.active &&
      builder.serviceAreas.some((serviceArea) => serviceArea.key === area.key),
  );
}

export function validateOwnerContact(
  input: OwnerContactFormInput,
): OwnerContactValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!input.consent) {
    return { ok: false, error: "Consent is required before sharing with builders." };
  }

  return {
    ok: true,
    contact: {
      name,
      email,
      phone: phone || null,
      message: message || null,
    },
  };
}

export function buildConnectionSnapshot(input: {
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
}): ConnectionSnapshot {
  const area = parseParcelCityState(input.parcel.city);
  return {
    parcel: input.parcel,
    parcelKey: input.parcelKey,
    parcelAddress: input.parcel.address,
    parcelCity: area?.city ?? input.parcel.city,
    parcelState: area?.state ?? "",
    config: input.config,
    assumptions: input.assumptions,
    result: input.result,
    reportText: buildReportText({
      parcel: input.parcel,
      config: input.config,
      result: input.result,
    }),
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
```

- [ ] **Step 4: Verify domain tests**

Run: `npm run test -- lib/marketplace.test.ts`

Expected: passes.

---

## Task 3: Add Firestore Marketplace Adapter

**Files:**
- Create: `lib/marketplace-firestore.ts`

- [ ] **Step 1: Implement Firestore functions**

Create `lib/marketplace-firestore.ts`:

```typescript
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  BuilderInboxItem,
  BuilderProfile,
  BuilderResponse,
  BuilderResponseStatus,
  ConnectionRequest,
  ConnectionSnapshot,
  OwnerContact,
  ServiceArea,
} from "./marketplace-types";

const BUILDERS = "builders";
const REQUESTS = "connectionRequests";
const RESPONSES = "builderResponses";

export async function fetchBuilderProfile(uid: string): Promise<BuilderProfile | null> {
  const snap = await getDoc(doc(db, BUILDERS, uid));
  return snap.exists() ? firestoreToBuilderProfile(snap.id, snap.data()) : null;
}

export async function saveBuilderProfile(
  uid: string,
  input: Omit<BuilderProfile, "id" | "ownerUid" | "createdAt" | "updatedAt">,
): Promise<BuilderProfile> {
  const ref = doc(db, BUILDERS, uid);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    ...input,
    ownerUid: uid,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    ...input,
    id: uid,
    ownerUid: uid,
    createdAt: existing.exists() ? timestampToIso(existing.data().createdAt) : null,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchActiveBuilders(): Promise<BuilderProfile[]> {
  const snap = await getDocs(query(collection(db, BUILDERS), where("active", "==", true)));
  return snap.docs.map((item) => firestoreToBuilderProfile(item.id, item.data()));
}

export async function createConnectionRequest(input: {
  ownerUid: string;
  ownerContact: OwnerContact;
  snapshot: ConnectionSnapshot;
  matchedBuilderIds: string[];
}): Promise<string> {
  const requestRef = await addDoc(collection(db, REQUESTS), {
    ownerUid: input.ownerUid,
    ownerContact: input.ownerContact,
    snapshot: input.snapshot,
    matchedBuilderIds: input.matchedBuilderIds,
    status: "submitted",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(db);
  for (const builderId of input.matchedBuilderIds) {
    batch.set(doc(db, REQUESTS, requestRef.id, RESPONSES, builderId), {
      builderId,
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return requestRef.id;
}

export async function fetchBuilderInbox(builderId: string): Promise<BuilderInboxItem[]> {
  const snap = await getDocs(
    query(
      collection(db, REQUESTS),
      where("matchedBuilderIds", "array-contains", builderId),
    ),
  );

  const items = await Promise.all(
    snap.docs.map(async (requestDoc) => {
      const responseSnap = await getDoc(doc(db, REQUESTS, requestDoc.id, RESPONSES, builderId));
      return {
        request: firestoreToConnectionRequest(requestDoc.id, requestDoc.data()),
        response: responseSnap.exists()
          ? firestoreToBuilderResponse(responseSnap.data())
          : { builderId, status: "new" as const, createdAt: null, updatedAt: null },
      };
    }),
  );
  return items.sort((a, b) => {
    const aTime = a.request.createdAt ?? "";
    const bTime = b.request.createdAt ?? "";
    return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
  });
}

export async function updateBuilderResponse(
  requestId: string,
  builderId: string,
  status: Exclude<BuilderResponseStatus, "new">,
): Promise<void> {
  await updateDoc(doc(db, REQUESTS, requestId, RESPONSES, builderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

function firestoreToBuilderProfile(id: string, data: Record<string, unknown>): BuilderProfile {
  return {
    id,
    ownerUid: (data.ownerUid as string) || id,
    companyName: (data.companyName as string) || "",
    contactEmail: (data.contactEmail as string) || "",
    phone: (data.phone as string | null) || null,
    licenseNumber: (data.licenseNumber as string | null) || null,
    serviceAreas: (data.serviceAreas as ServiceArea[]) || [],
    active: Boolean(data.active),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function firestoreToConnectionRequest(
  id: string,
  data: Record<string, unknown>,
): ConnectionRequest {
  return {
    id,
    ownerUid: (data.ownerUid as string) || "",
    ownerContact: data.ownerContact as ConnectionRequest["ownerContact"],
    snapshot: data.snapshot as ConnectionRequest["snapshot"],
    matchedBuilderIds: (data.matchedBuilderIds as string[]) || [],
    status: "submitted",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function firestoreToBuilderResponse(data: Record<string, unknown>): BuilderResponse {
  return {
    builderId: (data.builderId as string) || "",
    status: (data.status as BuilderResponseStatus) || "new",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === "string" ? value : null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: passes.

---

## Task 4: Secure Firestore Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add marketplace helper functions**

Inside `match /databases/{database}/documents`, after `isOwner(userId)`, add:

```javascript
function isSignedIn() {
  return request.auth != null;
}

function isBuilder(builderId) {
  return request.auth != null && request.auth.uid == builderId;
}

function isMatchedBuilder() {
  return request.auth != null && request.auth.uid in resource.data.matchedBuilderIds;
}

function isValidBuilderProfile(builderId) {
  return request.resource.data.keys().hasOnly([
    "ownerUid",
    "companyName",
    "contactEmail",
    "phone",
    "licenseNumber",
    "serviceAreas",
    "active",
    "createdAt",
    "updatedAt"
  ]) &&
  request.resource.data.ownerUid == builderId &&
  request.resource.data.companyName is string &&
  request.resource.data.companyName.size() > 0 &&
  request.resource.data.companyName.size() <= 160 &&
  request.resource.data.contactEmail is string &&
  request.resource.data.contactEmail.size() > 3 &&
  request.resource.data.serviceAreas is list &&
  request.resource.data.serviceAreas.size() > 0 &&
  request.resource.data.serviceAreas.size() <= 25 &&
  request.resource.data.active is bool &&
  (!("phone" in request.resource.data) || request.resource.data.phone == null || request.resource.data.phone is string) &&
  (!("licenseNumber" in request.resource.data) || request.resource.data.licenseNumber == null || request.resource.data.licenseNumber is string);
}

function isValidConnectionRequest() {
  return request.resource.data.keys().hasOnly([
    "ownerUid",
    "ownerContact",
    "snapshot",
    "matchedBuilderIds",
    "status",
    "createdAt",
    "updatedAt"
  ]) &&
  request.resource.data.ownerUid == request.auth.uid &&
  request.resource.data.ownerContact is map &&
  request.resource.data.snapshot is map &&
  request.resource.data.matchedBuilderIds is list &&
  request.resource.data.matchedBuilderIds.size() > 0 &&
  request.resource.data.matchedBuilderIds.size() <= 25 &&
  request.resource.data.status == "submitted";
}

function isValidBuilderResponse(builderId) {
  return request.resource.data.keys().hasOnly([
    "builderId",
    "status",
    "createdAt",
    "updatedAt"
  ]) &&
  request.resource.data.builderId == builderId &&
  request.resource.data.status in ["new", "interested", "not-a-fit"];
}
```

- [ ] **Step 2: Add top-level marketplace matches**

After the existing `match /users/{userId}` block, add:

```javascript
match /builders/{builderId} {
  allow read: if isSignedIn();
  allow create, update: if isBuilder(builderId) && isValidBuilderProfile(builderId);
  allow delete: if false;
}

match /connectionRequests/{requestId} {
  allow read: if isSignedIn() && (
    resource.data.ownerUid == request.auth.uid ||
    request.auth.uid in resource.data.matchedBuilderIds
  );
  allow create: if isSignedIn() && isValidConnectionRequest();
  allow update, delete: if false;

  match /builderResponses/{builderId} {
    allow read: if isSignedIn() && (
      get(/databases/$(database)/documents/connectionRequests/$(requestId)).data.ownerUid == request.auth.uid ||
      request.auth.uid == builderId
    );
    allow create: if isSignedIn() &&
      get(/databases/$(database)/documents/connectionRequests/$(requestId)).data.ownerUid == request.auth.uid &&
      builderId in get(/databases/$(database)/documents/connectionRequests/$(requestId)).data.matchedBuilderIds &&
      isValidBuilderResponse(builderId) &&
      request.resource.data.status == "new";
    allow update: if isBuilder(builderId) &&
      request.auth.uid in get(/databases/$(database)/documents/connectionRequests/$(requestId)).data.matchedBuilderIds &&
      isValidBuilderResponse(builderId);
    allow delete: if false;
  }
}
```

- [ ] **Step 3: Verify rule syntax with Firebase emulator command**

Run: `npx firebase emulators:exec --only firestore "npm run test -- lib/marketplace.test.ts"`

Expected: emulator starts, rules load successfully, tests pass.

---

## Task 5: Build Owner Handoff Panel

**Files:**
- Create: `components/studio/BuilderLeadPanel.tsx`
- Test: `components/studio/BuilderLeadPanel.test.tsx`

- [ ] **Step 1: Create component test**

Create `components/studio/BuilderLeadPanel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";
import BuilderLeadPanel from "./BuilderLeadPanel";

const result = {
  aduSqft: 600,
  totalFootprint: 1980,
  allowedFootprint: 2000,
  remainingCapacity: 20,
  coveragePercent: 39.6,
  maxCoveragePercent: 40,
  zoningStatus: "Compliant" as const,
  costLow: 220000,
  costHigh: 270000,
  costPerSqftLow: 367,
  costPerSqftHigh: 450,
  monthlyRent: 2050,
  annualNoi: 16605,
  paybackYears: 15.7,
  warnings: [],
};

describe("BuilderLeadPanel", () => {
  it("requires consent before submit", async () => {
    const submit = vi.fn();
    render(
      <BuilderLeadPanel
        open
        userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        onClose={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Consent is required/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits validated contact and snapshot", async () => {
    const submit = vi.fn().mockResolvedValue({ matchedCount: 1 });
    render(
      <BuilderLeadPanel
        open
        userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        onClose={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    expect(await screen.findByText(/Sent to 1 local builder/i)).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        contact: expect.objectContaining({ email: "jane@example.com" }),
        snapshot: expect.objectContaining({ parcelCity: "Seattle" }),
      }),
    );
  });
});
```

- [ ] **Step 2: Implement owner panel**

Create `components/studio/BuilderLeadPanel.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { buildConnectionSnapshot, validateOwnerContact } from "@/lib/marketplace";
import type { ADUConfig, FeasibilityResult, FinancialAssumptions } from "@/lib/feasibility";
import type { Parcel } from "@/lib/parcel-types";
import type { ConnectionSnapshot, OwnerContact } from "@/lib/marketplace-types";

export interface BuilderLeadSubmitInput {
  contact: OwnerContact;
  snapshot: ConnectionSnapshot;
}

export default function BuilderLeadPanel({
  open,
  userDefaults,
  parcelKey,
  parcel,
  config,
  assumptions,
  result,
  onClose,
  onSubmit,
}: {
  open: boolean;
  userDefaults: { name: string; email: string };
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  onClose: () => void;
  onSubmit: (input: BuilderLeadSubmitInput) => Promise<{ matchedCount: number }>;
}) {
  const [name, setName] = useState(userDefaults.name);
  const [email, setEmail] = useState(userDefaults.email);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const validation = validateOwnerContact({ name, email, phone, message, consent });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const snapshot = buildConnectionSnapshot({
      parcelKey,
      parcel,
      config,
      assumptions,
      result,
    });

    startTransition(async () => {
      try {
        const submitted = await onSubmit({ contact: validation.contact, snapshot });
        setSuccess(
          submitted.matchedCount === 1
            ? "Sent to 1 local builder."
            : `Sent to ${submitted.matchedCount} local builders.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not submit this snapshot.");
      }
    });
  }

  return (
    <section
      aria-labelledby="builder-lead-heading"
      className="border-t border-lf-hairline bg-lf-card px-6 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="builder-lead-heading" className="font-display text-xl font-black text-lf-espresso">
            Connect with local builders
          </h2>
          <p className="mt-1 text-sm leading-6 text-lf-muted">
            Share this address and feasibility snapshot with registered builders that serve this area.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close builder connection form">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        {error && <div role="alert" className="md:col-span-2 text-sm text-lf-brick">{error}</div>}
        {success && <div className="md:col-span-2 text-sm font-semibold text-lf-forest">{success}</div>}
        <label className="text-sm font-medium text-lf-espresso">
          Name
          <input className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-lf-espresso">
          Email
          <input className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-lf-espresso">
          Phone optional
          <input className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-lf-espresso md:col-span-2">
          Message optional
          <textarea className="mt-1 min-h-20 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label className="flex gap-2 text-sm leading-6 text-lf-muted md:col-span-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to share my contact details, property address, and ADU snapshot with matched local builders.
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-md bg-lf-mahogany px-4 text-sm font-semibold text-lf-sand disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit snapshot"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Verify component test**

Run: `npm run test -- components/studio/BuilderLeadPanel.test.tsx`

Expected: passes.

---

## Task 6: Wire Owner Submission Into Studio

**Files:**
- Modify: `components/studio/ReportPreview.tsx`
- Modify: `components/FeasibilityStudio.tsx`

- [ ] **Step 1: Add report preview action props**

In `components/studio/ReportPreview.tsx`, extend `ReportPreviewProps`:

```typescript
onConnectBuilders?: () => void;
```

Add `onConnectBuilders` to the component destructuring.

Inside the `Share or Export` button grid, after the share button, render:

```tsx
{onConnectBuilders && (
  <button
    type="button"
    onClick={onConnectBuilders}
    className="col-span-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-lf-mahogany text-xs font-semibold text-lf-sand-2 transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
  >
    <Hammer size={14} />
    Connect with local builders
  </button>
)}
```

Add `Hammer` to the lucide import.

- [ ] **Step 2: Wire studio state and submission handler**

In `components/FeasibilityStudio.tsx`:

Add imports:

```typescript
import BuilderLeadPanel, { type BuilderLeadSubmitInput } from "./studio/BuilderLeadPanel";
import { fetchActiveBuilders, createConnectionRequest } from "@/lib/marketplace-firestore";
import { getMatchedBuilders } from "@/lib/marketplace";
```

Add state:

```typescript
const [builderLeadOpen, setBuilderLeadOpen] = useState(false);
```

Add handler:

```typescript
async function handleBuilderLeadSubmit(input: BuilderLeadSubmitInput) {
  if (!user) {
    throw new Error("Sign in before connecting with builders.");
  }
  const builders = await fetchActiveBuilders();
  const matchedBuilders = getMatchedBuilders(builders, input.snapshot.parcelCity + ", " + input.snapshot.parcelState);
  if (matchedBuilders.length === 0) {
    throw new Error("No local builders are registered for this area yet.");
  }
  await createConnectionRequest({
    ownerUid: user.uid,
    ownerContact: input.contact,
    snapshot: input.snapshot,
    matchedBuilderIds: matchedBuilders.map((builder) => builder.id),
  });
  return { matchedCount: matchedBuilders.length };
}
```

When rendering `ReportPreview`, pass:

```tsx
onConnectBuilders={() => setBuilderLeadOpen(true)}
```

Below `ReportPreview`, render:

```tsx
<BuilderLeadPanel
  open={builderLeadOpen}
  userDefaults={{
    name: user?.displayName || "",
    email: user?.email || "",
  }}
  parcelKey={parcelId}
  parcel={activeParcel}
  config={config}
  assumptions={assumptions}
  result={result}
  onClose={() => setBuilderLeadOpen(false)}
  onSubmit={handleBuilderLeadSubmit}
/>
```

- [ ] **Step 3: Verify existing studio tests**

Run: `npm run test -- components/studio/FeasibilityStudio.test.tsx components/studio/BuilderLeadPanel.test.tsx`

Expected: passes after adding Firestore function mocks if needed.

---

## Task 7: Build Builder Dashboard

**Files:**
- Create: `app/builder/page.tsx`
- Create: `components/builder/BuilderDashboard.tsx`
- Create: `components/builder/BuilderProfileForm.tsx`
- Create: `components/builder/BuilderInbox.tsx`
- Test: `components/builder/BuilderDashboard.test.tsx`

- [ ] **Step 1: Create dashboard route**

Create `app/builder/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuilderDashboard from "@/components/builder/BuilderDashboard";
import { useAuth } from "@/lib/auth-context";

export default function BuilderPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/builder");
    if (!loading && user && profile && profile.role !== "builder") router.replace("/studio");
  }, [loading, profile, router, user]);

  if (loading || !user || !profile || profile.role !== "builder") {
    return (
      <div className="flex h-screen items-center justify-center bg-lf-sand">
        <div className="text-center">
          <div className="text-2xl font-display font-black text-lf-mahogany">LotFoundry</div>
          <p className="mt-2 text-sm text-lf-muted">Loading builder dashboard...</p>
        </div>
      </div>
    );
  }

  return <BuilderDashboard uid={user.uid} email={profile.email} displayName={profile.displayName} />;
}
```

- [ ] **Step 2: Create dashboard shell**

Create `components/builder/BuilderDashboard.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  fetchBuilderInbox,
  fetchBuilderProfile,
  saveBuilderProfile,
  updateBuilderResponse,
} from "@/lib/marketplace-firestore";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";
import BuilderProfileForm from "./BuilderProfileForm";
import BuilderInbox from "./BuilderInbox";

export default function BuilderDashboard({
  uid,
  email,
  displayName,
}: {
  uid: string;
  email: string;
  displayName: string | null;
}) {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [items, setItems] = useState<BuilderInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loadedProfile = await fetchBuilderProfile(uid);
      const loadedItems = loadedProfile ? await fetchBuilderInbox(uid) : [];
      if (!cancelled) {
        setProfile(loadedProfile);
        setItems(loadedItems);
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) return <main className="min-h-dvh bg-lf-sand p-6">Loading...</main>;

  async function handleSaveProfile(input: Parameters<typeof saveBuilderProfile>[1]) {
    const saved = await saveBuilderProfile(uid, input);
    setProfile(saved);
    setItems(await fetchBuilderInbox(uid));
  }

  async function handleRespond(requestId: string, status: "interested" | "not-a-fit") {
    await updateBuilderResponse(requestId, uid, status);
    setItems((current) =>
      current.map((item) =>
        item.request.id === requestId
          ? { ...item, response: { ...item.response, status } }
          : item,
      ),
    );
  }

  return (
    <main className="min-h-dvh bg-lf-sand p-4 text-lf-espresso lg:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-black">Builder dashboard</h1>
        <p className="mt-2 text-sm text-lf-muted">
          Review consented ADU feasibility snapshots matched to your service area.
        </p>
        {!profile ? (
          <BuilderProfileForm
            defaults={{ companyName: displayName || "", contactEmail: email }}
            onSave={handleSaveProfile}
          />
        ) : (
          <BuilderInbox profile={profile} items={items} onRespond={handleRespond} />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create profile form**

Create `components/builder/BuilderProfileForm.tsx` with inputs for company name, contact email, phone, license number, service areas, and active toggle. Convert comma-separated service areas with:

```typescript
const serviceAreas = serviceAreaText
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    const parts = value.split(/\s+/);
    const state = parts.at(-1) ?? "";
    const city = parts.slice(0, -1).join(" ");
    return normalizeServiceArea(city, state);
  });
```

The submit button text is `Save builder profile`; validation error text for an empty service area is `Add at least one service area like Seattle WA.`

- [ ] **Step 4: Create inbox component**

Create `components/builder/BuilderInbox.tsx` with these visible labels:

```typescript
export default function BuilderInbox({
  profile,
  items,
  onRespond,
}: {
  profile: BuilderProfile;
  items: BuilderInboxItem[];
  onRespond: (requestId: string, status: "interested" | "not-a-fit") => Promise<void>;
}) {
  // Render "No matched snapshots yet." when items is empty.
  // Render one card per item with address, ADU size, build range, rent, zoning status.
  // Render buttons: "Interested" and "Not a fit".
}
```

Use existing design tokens and compact operational layout; do not build a marketing page.

- [ ] **Step 5: Add dashboard component tests**

Create `components/builder/BuilderDashboard.test.tsx` mocking `@/lib/marketplace-firestore`. Cover:

```typescript
it("shows the builder profile form when no profile exists", async () => {});
it("shows matched requests when a profile exists", async () => {});
it("updates a request response to interested", async () => {});
```

- [ ] **Step 6: Verify builder tests**

Run: `npm run test -- components/builder/BuilderDashboard.test.tsx`

Expected: passes.

---

## Task 8: Route Builder Auth Flows Correctly

**Files:**
- Modify: `app/signup/page.tsx`
- Modify: `app/login/LoginForm.tsx`

- [ ] **Step 1: Send builder signups to dashboard**

In `app/signup/page.tsx`, change the post-signup route:

```typescript
await signUp(email, password, displayName, role);
router.push(role === "builder" ? "/builder" : "/studio");
```

In the `useEffect`, use `profile?.role` when available:

```typescript
const { signUp, signInWithGoogle, user, profile } = useAuth();

useEffect(() => {
  if (user && profile) {
    router.replace(profile.role === "builder" ? "/builder" : "/studio");
  }
}, [profile, router, user]);
```

- [ ] **Step 2: Permit `/builder` safe redirects**

In `app/login/LoginForm.tsx`, update `safeRedirectPath`:

```typescript
if (!["/studio", "/builder"].includes(parsed.pathname)) {
  return "/studio";
}
```

- [ ] **Step 3: Verify auth flow typecheck**

Run: `npx tsc --noEmit`

Expected: passes.

---

## Task 9: Final Verification

**Files:**
- Existing files changed in prior tasks

- [ ] **Step 1: Run full local verification**

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run focused browser verification**

Run:

```powershell
npm run dev
```

Open `http://localhost:3000/studio` and verify:

- Report preview contains `Connect with local builders`.
- Submission without consent shows the consent error.
- A signed-in builder can reach `/builder`.
- Builder dashboard shows profile form before the inbox.
- No UI text promises emails, quotes, guaranteed responses, payouts, or automatic delivery.

- [ ] **Step 3: Check worktree scope**

Run:

```powershell
git status --short
```

Expected changed scope:

- Marketplace domain files.
- Marketplace Firestore adapter.
- Builder dashboard files.
- Studio handoff files.
- `firestore.rules`.
- Targeted tests.

Do not stage or revert pre-existing unrelated changes such as `.firebase/hosting.ZGlzdA.cache`, `next-env.d.ts`, `conductor/`, or unrelated docs unless the user explicitly asks.
