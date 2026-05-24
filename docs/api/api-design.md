# ADU Advisor API Design

Updated: 2026-05-19

This document defines the resource-oriented API contract for the ADU Advisor planner and maps it to the current Firebase callable backend. The mobile app still works offline first; cloud APIs are optional accelerators for regulation refreshes, design concepts, public-record search, and quote packets.

## Resource Model

Core resources:

- `Project`: homeowner-owned ADU study with address, inferred jurisdiction, lot facts, estimate inputs, site photo state, and current workflow status.
- `ParcelSummary`: jurisdiction-specific starter lot profile with zoning, buildable area, setbacks, constraints, source label, and verification date.
- `AduModel`: catalog model with footprint dimensions, construction method, style compatibility, budget band, fit notes, and family/accessibility features.
- `DesignConcept`: generated concept output derived from a project, selected model, style, placement, fit signals, and optional site photo context.
- `DesignFitEvaluation`: computed planner result for buildable area, setbacks, lot coverage, access, and utilities.
- `RegulationGuide`: source-cited jurisdiction guide with summary, permit steps, blockers, confidence, and citations.
- `PropertyRecord`: public-record search result or fallback verification note, scoped to a project.
- `QuoteRequest`: builder outreach event with quote packet items and delivery status.

Relationships:

- A `Project` has one active `ParcelSummary` by jurisdiction.
- A `Project` can have many `DesignConcepts`, `PropertyRecords`, and `QuoteRequests`.
- A `DesignConcept` references planner preferences rather than storing private site media.
- `AduModel` and `RegulationGuide` are seeded/static by default but can be refreshed from backend data later.

## Current Callable Contract

The deployed backend currently exposes Firebase callable functions:

- `getRegulationGuide({ jurisdiction })`
- `generateDesignConcept({ project, inspiration?, preferences? })`
- `searchPropertyHistory({ address, projectId })`
- `submitQuoteRequest({ projectId, contractorId, packetItems })`

Callable requests use Firebase's envelope shape:

```json
{ "data": { "...": "operation payload" } }
```

Callable responses use:

```json
{ "result": { "...": "operation result" } }
```

Firebase callable errors use:

```json
{
  "error": {
    "status": "INVALID_ARGUMENT",
    "message": "Invalid request payload.",
    "details": {}
  }
}
```

## Future REST Shape

If ADU Advisor graduates from Firebase callable-only APIs, use resource-oriented REST under `/v1`:

- `GET /v1/regulation-guides/{jurisdiction}`
- `POST /v1/projects`
- `GET /v1/projects/{projectId}`
- `PATCH /v1/projects/{projectId}`
- `POST /v1/projects/{projectId}/planner/evaluations`
- `POST /v1/projects/{projectId}/design-concepts`
- `GET /v1/projects/{projectId}/design-concepts?limit=20&cursor=...`
- `POST /v1/projects/{projectId}/property-record-searches`
- `GET /v1/projects/{projectId}/property-records?limit=20&cursor=...`
- `POST /v1/projects/{projectId}/quote-requests`

Collection endpoints must use cursor pagination with `data` plus `pagination.nextCursor`. Query filters should be lowercase camelCase to match the TypeScript domain model.

## Authentication And Privacy

- Firebase Auth bearer tokens should be accepted when user-scoped Firestore writes are needed.
- Read-only fallback calls may allow anonymous use while rate-limited.
- Exact addresses should be sent only when the user initiates cloud-backed actions such as property history search or regulation refresh.
- OpenAI prompts must omit exact address text and unnecessary personal identifiers.
- Site photo binaries are not part of the current API; only `hasSitePhoto` and local `sitePhotoUri` state exist client-side.

## Error Catalog

Use machine-readable codes even when Firebase wraps them:

- `VALIDATION_ERROR`: invalid payload shape, unsupported enum, or out-of-range planner value.
- `AUTHENTICATION_ERROR`: missing or invalid Firebase ID token when required.
- `AUTHORIZATION_ERROR`: authenticated user cannot access the requested project.
- `RESOURCE_NOT_FOUND`: requested project, guide, model, or contractor does not exist.
- `PROVIDER_UNAVAILABLE`: external municipal, OpenAI, or property-data provider is unavailable.
- `RATE_LIMIT_EXCEEDED`: client exceeded anonymous or authenticated request limits.
- `INTERNAL_SERVER_ERROR`: unexpected backend failure.

## Versioning

- Callable functions are currently unversioned for MVP simplicity.
- REST APIs should launch as `/v1`.
- Additive response fields are non-breaking.
- Removing fields, changing enum values, or changing validation bounds requires `/v2` or a deprecation window.
- Include `verifiedAt` or `updatedAt` on sourced data so clients can communicate staleness.
