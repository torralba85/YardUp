# Bulk Lead Credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a bulk credit monetization system for the builder lead marketplace to reduce lead-unlock friction, increase average order value (AOV), and promote builder retention.

**Architecture:** Extend Firestore BuilderProfile with `credits` field, add ledger subcollection, implement Stripe Checkout metadata check in webhook, and write an instant unlock endpoint using credit transactions. Add UI toggles and overlays to use credits for instant unlocks.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4, Firestore Admin, Stripe.

---

### Task 1: Firestore Schema, Types & Security Rules

**Files:**
- Modify: `lib/marketplace-types.ts`
- Modify: `firestore.rules`

- [ ] **Step 1: Extend `BuilderProfile` type in `lib/marketplace-types.ts`**

Add `credits` field and declare the `BuilderLedgerEntry` interface:
```typescript
// Add to lib/marketplace-types.ts
export interface BuilderLedgerEntry {
  id: string;
  builderId: string;
  type: "purchase" | "unlock" | "credit";
  creditsChange: number;
  amountPaid: number;
  referenceId: string;
  description: string;
  createdAt: string;
}
```
Update `BuilderProfile` interface to include:
```typescript
  /** Credit count for instant lead unlocks. */
  credits: number;
```

- [ ] **Step 2: Add ledger subcollection rules to `firestore.rules`**

Add read/write rules for `builderProfiles/{builderId}/ledger/{transactionId}`:
```javascript
    match /builderProfiles/{builderId} {
      allow read: if isAuthenticated() && request.auth.uid == resource.data.ownerUid;
      allow write: if isAuthenticated() && request.auth.uid == request.resource.data.ownerUid;
      
      match /ledger/{transactionId} {
        allow read: if isAuthenticated() && request.auth.uid == builderId;
        allow write: if false; // Only system admin SDK can write transactions
      }
    }
```

- [ ] **Step 3: Commit changes**

```bash
git add lib/marketplace-types.ts firestore.rules
git commit -m "feat(credits): extend types and secure firestore rules for lead credits"
```

---

### Task 2: Stripe Metadata & Webhook Integration

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Check purchaseType and Grant Credits in Webhook Handler**

Modify the webhook handling in `app/api/stripe/webhook/route.ts` to check if `session.metadata.purchaseType === "credit_pack"`:
```typescript
// Inside checkout.session.completed block
if (session.metadata?.purchaseType === "credit_pack") {
  const builderId = session.metadata.builderId;
  const creditsToGrant = parseInt(session.metadata.creditsToGrant, 10);
  const stripeSessionId = session.id;

  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const profileRef = db.doc(`builderProfiles/${builderId}`);
    const profileSnap = await transaction.get(profileRef);
    if (!profileSnap.exists) {
      throw new Error(`Builder profile not found: ${builderId}`);
    }

    const currentCredits = profileSnap.data()?.credits ?? 0;
    transaction.update(profileRef, {
      credits: currentCredits + creditsToGrant,
      updatedAt: new Date().toISOString(),
    });

    const ledgerRef = db.doc(`builderProfiles/${builderId}/ledger/${builderId}_${stripeSessionId}`);
    transaction.set(ledgerRef, {
      id: `${builderId}_${stripeSessionId}`,
      builderId,
      type: "purchase",
      creditsChange: creditsToGrant,
      amountPaid: (session.amount_total ?? 0) / 100,
      referenceId: stripeSessionId,
      description: `Purchased ${creditsToGrant}-Lead Pack`,
      createdAt: new Date().toISOString(),
    });
  });
}
```

- [ ] **Step 2: Commit changes**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat(credits): handle credit pack webhook grants in Stripe route"
```

---

### Task 3: Instant Unlock API Route

**Files:**
- Create: `app/api/lead/unlock-credit/route.ts`

- [ ] **Step 1: Implement the instant credit unlock API**

Implement route checking user auth, verifying credit balance, executing the Firestore write transaction, and returning results.
```typescript
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { verifyIdToken } from "@/lib/server/api-auth"; // Assumes api-auth helper exists

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await verifyIdToken(token);
    const builderId = decoded.uid;

    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const db = getAdminDb();
    const result = await db.runTransaction(async (transaction) => {
      const profileRef = db.doc(`builderProfiles/${builderId}`);
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists) {
        throw new Error("Builder profile not found");
      }

      const credits = profileSnap.data()?.credits ?? 0;
      if (credits < 1) {
        throw new Error("Insufficient credits");
      }

      // Check if unlock already exists
      const unlockRef = db.doc(`leadUnlocks/${builderId}_${requestId}`);
      const unlockSnap = await transaction.get(unlockRef);
      if (unlockSnap.exists) {
        throw new Error("Lead already unlocked");
      }

      // Perform transaction writes
      transaction.update(profileRef, {
        credits: credits - 1,
        updatedAt: new Date().toISOString(),
      });

      transaction.set(unlockRef, {
        builderId,
        requestId,
        status: "granted",
        amount: 0,
        createdAt: new Date().toISOString(),
      });

      const ledgerRef = db.doc(`builderProfiles/${builderId}/ledger/${builderId}_${requestId}_use`);
      transaction.set(ledgerRef, {
        id: `${builderId}_${requestId}_use`,
        builderId,
        type: "unlock",
        creditsChange: -1,
        amountPaid: 0,
        referenceId: requestId,
        description: `Unlocked Lead ${requestId}`,
        createdAt: new Date().toISOString(),
      });

      return { success: true, newCredits: credits - 1 };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add app/api/lead/unlock-credit/route.ts
git commit -m "feat(credits): add post route for instant credit lead unlocks"
```

---

### Task 4: Dashboard UI Credit Indicator & Shop

**Files:**
- Modify: `components/builder/BuilderMoneyBand.tsx`
- Modify: `components/builder/BuilderInbox.tsx`

- [ ] **Step 1: Render Credit Balance in Money Band**

Update `BuilderMoneyBand.tsx` to display credit balance:
```typescript
// Inside BuilderMoneyBand component
<div className="flex flex-col p-4 border-l border-lf-hairline">
  <span className="lf-kicker text-lf-taupe">Lead Credits</span>
  <span className="font-display text-2xl font-semibold text-lf-sand-2 mt-1">
    {metrics.credits ?? 0}
  </span>
</div>
```

- [ ] **Step 2: Render Credit Shop in Right Sidebar**

Add a purchase widget in the dashboard right sidebar of `BuilderInbox.tsx` giving options for 5-lead and 10-lead credit packages, triggering checkout links.

- [ ] **Step 3: Commit changes**

```bash
git add components/builder/BuilderMoneyBand.tsx components/builder/BuilderInbox.tsx
git commit -m "feat(credits): show credit balance in money band and add purchase widget"
```

---

### Task 5: Instant Unlock Integration & Confirmation Flow

**Files:**
- Modify: `components/builder/LeadCard.tsx`
- Modify: `components/builder/BuilderInbox.tsx`

- [ ] **Step 1: Integrate Instant Unlock with Credits**

Add confirmation overlay/prompt when builder clicks `"Unlock with 1 Credit"`. Hook it up to the `/api/lead/unlock-credit` API. Once success is returned, update the local credits balance and reveal the contact details.

- [ ] **Step 2: Commit changes**

```bash
git add components/builder/LeadCard.tsx components/builder/BuilderInbox.tsx
git commit -m "feat(credits): integrate instant unlock using credits with confirmation flow"
```
