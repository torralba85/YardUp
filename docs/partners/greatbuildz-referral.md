# GreatBuildz referral partnership

**Status:** Built behind a flag. Not live. Launch waits on the signed pilot agreement and the coordinated test.
**Terms:** GreatBuildz's email of 2026-11-09 (summarized below). The written agreement governs once signed.
**Code:** `lib/partner-referrals.ts`, `lib/server/partner-referrals.ts`,
`app/api/partners/referral/route.ts`, `components/studio/BuilderLeadPanel.tsx`
**Legal:** `/privacy` Sections 5 and 6 and `/terms` Section 7 name GreatBuildz from version 2026-11-10.

Merging this ships the legal version bump and the named clauses even with the flag off, so merge on launch day
and re-date the version to that day if it has moved.

## Pilot terms (GreatBuildz, 2026-11-09)

- **Handoff:** an introduction email to the GreatBuildz team inbox, Jon on Cc, the homeowner copied. Their team
  replies all on first contact, so LotFoundry sees each lead land.
- **Coverage:** all ten counties below, no exclusions inside them. Architecture-only requests are welcome.
  Sacramento is out.
- **Minimum:** a $100K project. The option is offered only when the top of the Studio's $25k build band reaches it.
- **Fee:** 1% of the signed contract price on construction contracts, and on design contracts that move forward.
  Excludes permit and government fees and taxes; change orders adjust it.
- **Attribution:** 12 months from the intro. A homeowner GreatBuildz talked to about the same project in the 90
  days before the intro doesn't count; earliest source wins; GreatBuildz flags duplicates.
- **Payment:** in installments as GreatBuildz is paid, within 30 days after month end. Paid by GreatBuildz Inc.
  to VeriShare LLC from the shared sheet; no invoice; W-9 before the first payment.
- **Tracking:** a GreatBuildz-hosted Google Sheet, one row per LFR number, shared with support@lotfoundry.net.
  Monthly reconciliation.
- **Pilot:** two months from the coordinated test, no volume cap, then a joint review.

## What the homeowner sees

The Studio's "Connect with local builders" panel (desktop and mobile share `BuilderLeadPanel`) offers
GreatBuildz when all of these hold:

1. `NEXT_PUBLIC_GREATBUILDZ_REFERRAL=true` was set at build time.
2. The parcel resolved to a county in GreatBuildz coverage: Los Angeles, Orange, Ventura, San Bernardino,
   Riverside, San Diego, Alameda, Contra Costa, Santa Clara or San Mateo, CA (`GREATBUILDZ.counties`). Preset and
   estimated lots never qualify.
3. The build band's top is at least `GREATBUILDZ.minBuildBandHigh` ($100,000).

Where LotFoundry builders also serve the lot, a **Builder network** choice appears with **LotFoundry builders**
as the default. Where none do, GreatBuildz is the only option and replaces the "No builders are registered"
message. Each network has its own explanation and consent sentence. Switching networks clears the consent box,
so consent always names whoever receives the details. The GreatBuildz consent (`partnerConsentText`) lists what
is sent, covers calls, emails and texts from the advisor and matched contractors or architects, links the
GreatBuildz privacy policy and terms, discloses the referral fee, and says LotFoundry doesn't screen contractors.
LotFoundry copy never calls the network "screened" or "vetted".

## Handoff

`POST /api/partners/referral` (signed-in only, 5 per account per hour, 404 while the flag is off):

1. Re-validates the body from known fields only, and re-checks the consent version, county coverage and the
   $100K minimum (`validatePartnerReferralRequest`).
2. Creates the ledger row **before** anything leaves LotFoundry, with the consent text and version accepted.
3. Emails the introduction through Resend from `support@lotfoundry.net`:
   - **To:** `GREATBUILDZ_REFERRAL_EMAIL` (the team inbox).
   - **Cc:** `GREATBUILDZ_REFERRAL_CC` (Jon) and the homeowner.
   - **No Reply-To**, so the team's reply-all reaches support@ as well as the homeowner and Jon.
   - **Subject:** "Introducing you to GreatBuildz Contractor Matching Service (LFR-XXXXXXXX)".
   - Idempotency key `partner-referral/<referralId>`; `X-Entity-Ref-ID` header.
4. Records the delivery outcome. Without `RESEND_API_KEY` or `GREATBUILDZ_REFERRAL_EMAIL`, or on a provider
   error, the row stays `queued` and ops sends the same email by hand (same recipients, same subject).

A second submit for the same homeowner, partner and address returns the existing referral (`duplicate: true`)
and sends nothing. A new project at the same address goes to Jon by email.

**Sent to GreatBuildz:** name, email, optional phone and message, exact address, city, county, state, ZIP, lot
size, existing building footprint (when confirmed), reported zoning, fire hazard zone, backyard home size,
dimensions, roof, finish, modeled bedrooms, build-cost band ($25k bands), zoning screen, and the LFR number.
**Never sent:** exact cost and rent figures, the certificate, photos, saved scenarios, account ids, payment data,
analytics.

## Internal tracking: `partnerReferrals`

Server-only collection. `firestore.rules` denies every client read and write; only the Admin SDK touches it.
The doc id is a hash of uid, partner and address, so it cannot be guessed and does not repeat.

| Field | Meaning |
|---|---|
| `referralId` | `LFR-XXXXXXXX`. The key on every row of the shared sheet. |
| `partnerId` | `greatbuildz` |
| `ownerUid` | Homeowner account. Removed on account deletion. |
| `status` | See lifecycle below. |
| `handoff` | Exactly what was sent. Removed on account deletion. |
| `consent` | `{ version, text, acceptedAt }` |
| `delivery` | `{ channel: "email", outcome, resendId?, error?, attemptedAt }` |
| `attribution` | `{ source, state, county, aduSqft }`. Kept for fee reconciliation. |
| `history` | `[{ status, at, note? }]`, append-only. |
| `ownerDeleted` | `true` after the homeowner deleted their account. |

**Status lifecycle** (`PartnerReferralStatus`): `queued` → `sent` (set by the API) → `introduced` (team replied
all) → `engaged` (intake call) → `contracted`; or `duplicate` (GreatBuildz had prior contact within 90 days) or
`closed_lost` at any point after `sent`. Ops sets the later statuses from the sheet, appending to `history` with
a note naming the sheet row.

**Shared sheet columns** (GreatBuildz hosts it): LFR number; intro date; county and ZIP; homeowner last name (no
other contact details); status; earlier-contact date if duplicate; contract type (design or construction);
contract signed date; contract price excluding permits, government fees and taxes; change orders; amount
GreatBuildz received that month; fee due (1%); fee paid date; notes.

**Monthly reconciliation:** after each month end, match the sheet to `partnerReferrals` by LFR number, update
statuses, check fee due against amounts received, and record payments (due within 30 days after month end).
Analytics event `partner_referral_submitted` is directional only; the ledger is the source of truth.

**Account deletion and export:** `/api/account/delete` strips `ownerUid` and `handoff` but keeps the referral
number, partner, county, size, status and consent receipt. `/api/account/export` includes the homeowner's
referrals. Deletion requests that reach support@ are forwarded to GreatBuildz with the LFR number so they clear
their copy and the sheet row; GreatBuildz forwards requests it receives the same way.

## Test setup

**Test identity:** "Andrew Test (LotFoundry)", `support+gbtest@lotfoundry.net`, (419) 669-6663 (the business
line), on a residential Los Angeles County lot where the Studio shows "Los Angeles" and an estimate of $100K or
more. Put "Test referral, please don't schedule a consultation" in the message.

1. **Dry run (internal):** set `GREATBUILDZ_REFERRAL_EMAIL=support+gbteam@lotfoundry.net` and
   `GREATBUILDZ_REFERRAL_CC=support+gbjon@lotfoundry.net`, turn the flag on and deploy. Submit as the test
   identity. Check that the Studio shows the LFR number, the `partnerReferrals` row reaches `sent`, and support@
   receives the email with the right subject. In Gmail's "Show original", check From support@, To the team alias,
   Cc the Jon alias and the homeowner, and no Reply-To header. Set that row to `closed_lost` with the note
   "internal dry run".
   The option is visible to real visitors from this deploy on; a real referral in this window lands in support@
   and is forwarded by hand.
2. **Coordinated test with GreatBuildz:** agree a time with Jon. Point the two variables at the GreatBuildz team
   inbox and Jon, redeploy, and submit the same way. Done when the team's reply-all reaches support@, the row
   appears on the shared sheet, and the ledger shows `introduced`. Mark the row as a test on both sides.
3. **Start the pilot clock:** two months from the coordinated test. Put the review on the calendar.

## Go-live checklist

- [ ] Pilot agreement signed by GreatBuildz Inc. and VeriShare LLC, after counsel review.
- [ ] Counsel reviews `partnerConsentText`, `/privacy` Sections 5 and 6 and `/terms` Section 7.
- [ ] GreatBuildz confirms that consent captured in the Studio works for its texting platform, and that it is OK
      being named in the Studio and on `/privacy` and `/terms`.
- [ ] W-9 for VeriShare LLC to GreatBuildz before the first payment.
- [ ] Apply `docs/partners/greatbuildz-ci-env.patch` to `.github/workflows/ci.yml`
      (`git apply docs/partners/greatbuildz-ci-env.patch`, then delete the patch). It passes the repository
      variables `GREATBUILDZ_REFERRAL_EMAIL`, `GREATBUILDZ_REFERRAL_CC` and `NEXT_PUBLIC_GREATBUILDZ_REFERRAL`
      into the deploy build. It ships as a patch because the agent token cannot edit workflows.
- [ ] Merge on launch day; legal version 2026-11-10 (re-dated if later) asks signed-in users to accept again.
      Rules and app deploy together.
- [ ] Dry run, then the coordinated test, as above.

**Rollback:** unset `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` and redeploy. The option disappears and the API returns
404. Existing ledger rows are untouched. The named legal clauses stay until a new legal version removes them.
