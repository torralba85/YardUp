# Builder Lead Handoff Design

## Goal

Add a v1 builders interface that lets lot owners submit a consented ADU feasibility snapshot to registered local builders, and lets matched builders review the snapshot from an inbox and mark whether they are interested.

## Product Decisions

- v1 is a lead handoff workflow, not an open directory, quoting system, payments flow, or full CRM.
- Matching is coverage-based: only active registered builders whose declared service area matches the snapshot city/state receive access.
- Delivery is inbox-only. The app records the request and builder response state, but it does not promise email delivery, quote delivery, or builder response.
- Builder registration is self-service after signup. Builder users complete a company profile with service coverage before receiving requests.
- Owner contact is minimal and consented: owner name, email, optional phone, and optional message.
- Matched builders can see the exact address and snapshot because service fit and feasibility review depend on it.
- If no builders match, the app says no local builders are registered for that area yet and does not create fake matches.

## User Experience

### Owner Flow

In the studio report/export area, add a `Connect with local builders` action. The action requires authentication and opens a compact handoff form that reuses the current parcel, ADU config, financial assumptions, and calculated feasibility result.

The form collects:

- Owner name, defaulting to the profile display name when available.
- Owner email, defaulting to the authenticated email when available.
- Optional phone.
- Optional project message.
- Required consent checkbox stating that matched local builders can see the address, snapshot, and submitted contact details.

Submission outcomes:

- Matching builders found: create one immutable `connectionRequests` document with the snapshot and matched builder IDs, create one response document per matched builder with status `new`, and show a confirmation with the matched count.
- No matching builders: show `No local builders are registered for this area yet.` and do not create a request.
- Firestore/network error: show a retryable error without clearing the form.

### Builder Flow

Builder users get a dashboard route. If their profile is incomplete, they see a profile form before the inbox.

Builder profile fields:

- Company name.
- Contact email.
- Optional phone.
- Optional license number.
- Service cities, entered as comma-separated `City, ST` values.
- Active/inactive toggle.

Builder inbox behavior:

- Show requests where the signed-in builder ID is included in `matchedBuilderIds`.
- Each request card shows parcel city/state, ADU size, estimated build range, monthly rent, zoning status, owner message excerpt, and response status.
- Request detail shows exact address, submitted owner contact, project message, parcel metrics, ADU config, and feasibility metrics.
- Builder can mark a request `Interested` or `Not a fit`.
- `Interested` means the builder may use the submitted contact details outside the app. The app does not claim that the owner has been contacted.

## Data Model

Use top-level collections so builder inbox queries do not require cross-user subcollection scans.

`builders/{builderId}`:

```typescript
interface BuilderProfile {
  ownerUid: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  licenseNumber: string | null;
  serviceAreas: Array<{ city: string; state: string; key: string }>;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`connectionRequests/{requestId}`:

```typescript
interface ConnectionRequest {
  ownerUid: string;
  ownerContact: {
    name: string;
    email: string;
    phone: string | null;
    message: string | null;
  };
  snapshot: {
    parcel: Parcel;
    parcelKey: string;
    parcelAddress: string;
    parcelCity: string;
    parcelState: string;
    config: ADUConfig;
    assumptions: FinancialAssumptions;
    result: FeasibilityResult;
    reportText: string;
  };
  matchedBuilderIds: string[];
  status: "submitted";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`connectionRequests/{requestId}/builderResponses/{builderId}`:

```typescript
interface BuilderResponse {
  builderId: string;
  status: "new" | "interested" | "not-a-fit";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Service-area normalization:

- Parse owner snapshot location from `parcel.city`, which currently contains values like `Seattle, WA 98115`.
- Normalize both snapshot and builder coverage to lowercase `city-state` keys, for example `seattle-wa`.
- Ignore ZIP codes for matching in v1.

## Security

- Owners can create connection requests for themselves and read their own requests.
- Builders can read only requests where their authenticated UID is in `matchedBuilderIds`.
- Builders can write only their own builder profile.
- Builders can write only their own response document under a request they are matched to.
- Builder profile reads are limited to authenticated users so owner-side matching can list active builders client-side in v1.

## Testing

- Unit-test service-area parsing, coverage matching, snapshot payload creation, and invalid contact handling.
- Component-test the owner handoff form states: unauthenticated redirect, validation, no matches, success, and Firestore failure.
- Component-test builder profile gating, inbox rendering, request detail, and response status changes.
- E2E-test the happy path with mocked Firebase modules where practical: owner submits snapshot, builder inbox displays it, builder marks interested.
- Run `npm run lint`, `npm run test`, `npx tsc --noEmit`, and `npm run build` before completion.

## Out of Scope

- Email notifications.
- Builder quotes, scheduling, and messaging.
- Stripe, payouts, referral fees, commissions, or builder pricing tiers.
- Admin moderation.
- Claiming externally seeded builder profiles.
- Public builder directory.
