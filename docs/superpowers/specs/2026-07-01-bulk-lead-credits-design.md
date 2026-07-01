# Design Spec: Bulk Lead Credits (Approach B)

Status: DRAFT
Date: 2026-07-01
Author: Antigravity

## Goal
Implement a bulk credit monetization system for the builder lead marketplace to reduce lead-unlock friction, increase average order value (AOV), and promote builder retention.

---

## 💾 1. Data Model Extensions

### A. Builder Profile Credit Balance
We extend the `BuilderProfile` document to support a credit count.
- Path: `builderProfiles/{builderId}`
- Fields:
  ```typescript
  credits: number; // Integer count of remaining lead unlocks, defaults to 0.
  ```

### B. Financial & Credit Ledger
We introduce a unified transaction history subcollection under each builder profile to track credit additions and subtractions.
- Path: `builderProfiles/{builderId}/ledger/{transactionId}`
- Schema (`BuilderLedgerEntry`):
  ```typescript
  interface BuilderLedgerEntry {
    id: string; // Deterministic ID to ensure idempotency.
    type: "purchase" | "unlock" | "credit";
    creditsChange: number; // e.g. +5, -1, +1
    amountPaid: number; // Dollar amount (e.g. 175.00, 0.00)
    referenceId: string; // Stripe Session ID or Request ID
    description: string; // e.g., "Purchased 5-Lead Pack"
    createdAt: string; // ISO timestamp
  }
  ```

---

## 💳 2. Stripe Credit Pack Products

We define three products in Stripe:
1. **Single Lead Unlock**: $49.00 (`price_single_49`)
2. **5-Lead Pack**: $175.00 ($35/lead — save 28%) (`price_pack_5`)
3. **10-Lead Pack**: $300.00 ($30/lead — save 38%) (`price_pack_10`)

---

## 🔌 3. Webhook Integration

### A. Stripe Session Checkout Metadata
When creating a Stripe Checkout Session for a credit pack, we attach the following metadata:
```json
{
  "purchaseType": "credit_pack",
  "builderId": "BUILDER_UID",
  "creditsToGrant": "5"
}
```

### B. `/api/stripe/webhook` Handler
Upon receiving `checkout.session.completed` with `purchaseType === "credit_pack"`:
1. Verify the signature against `STRIPE_WEBHOOK_SECRET`.
2. Extract `builderId` and `creditsToGrant` (parsed as integer) from `metadata`.
3. Execute a Firestore transaction:
   - Increment `credits` field in `builderProfiles/{builderId}`.
   - Create a `builderProfiles/{builderId}/ledger/{builderId}_{sessionId}` document tracking the purchase.

---

## 🔌 4. Instant Unlock API

We introduce a secure API route `/api/marketplace/unlock-with-credit` for instant unlocks:
- Method: `POST` (requires builder authentication token).
- Request body: `{ requestId: string }`
- Transaction Logic:
  1. Fetch `builderProfiles/{builderId}`. Verify `credits >= 1`.
  2. Verify that the lead `requestId` exists and matching lists allow this builder to unlock.
  3. Verify that `leadUnlocks/{builderId}_{requestId}` does NOT already exist.
  4. Perform the writes:
     - Decrement `builderProfiles/{builderId}.credits` by 1.
     - Create the unlock grant in `leadUnlocks/{builderId}_{requestId}`.
     - Create a ledger entry under `builderProfiles/{builderId}/ledger/{builderId}_{requestId}_use` of type `"unlock"` with `creditsChange: -1`.
  5. Return success and new credit balance.

---

## 🎨 5. UI Upgrades

### A. Espresso Money Band Credit Display
- Display credit balance on the top espresso bar:
  `CREDIT BALANCE: X LEADS` (styled in tracked IBM Plex Mono, warning-gold if 0, success-green if > 0).

### B. Lead Card Unlock CTAs
- **If `credits > 0`**:
  - Button text: `"Unlock with 1 Credit"` (forest green).
  - Triggers an inline confirm modal: *"Confirm using 1 credit? (Remaining balance: X → X-1)"*.
  - On confirm, calls the instant unlock API and stamps the card `UNLOCKED` in-place.
- **If `credits === 0`**:
  - Keep `"Unlock Lead $49"` (Stripe checkout flow).
  - Add subtext link: *"Buy lead credits to unlock instantly for $30/lead."*

### C. Right Rail Credit Shop
- Render a Credit Shop module in the right sidebar under active service areas.
- Allows builders to select 5-lead or 10-lead packs and redirects them directly to the Stripe session page.
