# GreatBuildz referral partnership

**Status:** Built behind a flag. Not live. Launch waits on the signed pilot agreement and the coordinated test.
**Terms:** GreatBuildz's email of 2026-11-09 (summarized below). The written pilot agreement governs once signed;
the draft sent to Jon on 2026-11-12 sets the consent design (Exhibit A), the relay times and the consent-record
retention described here.
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
- **Screening:** GreatBuildz suggested $100K as an optional ADU budget filter. LotFoundry offers the option
  when the top of the Studio's $25k build band reaches it; this estimate is not a confirmed homeowner budget.
- **Fee:** 1% of the signed contract price on construction contracts, and on design contracts that move forward.
  Excludes permit and government fees and taxes; change orders adjust it.
- **Attribution:** 12 months from the intro. A homeowner GreatBuildz talked to about the same project in the 90
  days before the intro doesn't count; earliest source wins; GreatBuildz flags duplicates.
- **Payment:** in installments as GreatBuildz is paid, within 30 days after month end. Paid by GreatBuildz Inc.
  to VeriShare LLC from the shared sheet; no invoice; W-9 before the first payment. For cancellations or
  nonpayment, fees apply only to what GreatBuildz receives. Jon will confirm contract price in writing on request.
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
so consent always names whoever receives the details. GreatBuildz gets two boxes (pilot agreement Exhibit A):

- **Required** (`partnerConsentText`): lists what is sent, lets a GreatBuildz advisor contact the homeowner by
  phone or email, says GreatBuildz shares the project only with contractors or architects the homeowner agrees
  to be matched with and reports status and contract price back, links the GreatBuildz privacy policy and terms,
  discloses the referral fee, and says LotFoundry doesn't screen anyone.
- **Optional** (`partnerSmsConsentText`): calls and texts from GreatBuildz Inc., including automated, at the
  number given. Shown only once a phone number is typed, never required, and cleared on a network switch like
  the required box. It names GreatBuildz only: contractors and architects get no consent from our form, so
  GreatBuildz collects any it needs after the intake call.

The intro email's "Texts and automated calls" line tells GreatBuildz which case applies. LotFoundry copy never
calls the network "screened" or "vetted".

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
   error, the row stays `queued` and ops sends the same email by hand (same recipients, same subject). Each
   queued referral logs `[partner-referral] LFR-XXXXXXXX queued for manual handoff` at error severity; search
   Cloud Logging for it. The Studio tells the homeowner the request was received, not that it was sent.

A second submit for the same homeowner, partner and address returns the existing referral (`duplicate: true`)
and sends nothing, including when the existing row is `queued` or `closed_lost`. A new project at the same
address goes to Jon by email. The Studio words each outcome: a sent referral says the homeowner is copied; a
queued one shows a pending introduction; a duplicate says it was already sent or already received.

Before enabling referrals, designate a support@ operator to check queued rows each business day and after
reported delivery failures. Inspect the Resend delivery record before a manual send (a timeout can leave
acceptance uncertain), use the existing LFR number, and record the handoff outcome. Resubmitting the form is
not a retry mechanism.

In the Studio, consent counts only for the network it was given for. If the choice collapses after the box
was ticked (a guest signs in, or the builder check finds no LotFoundry builders), the box clears and the form
says the project now goes to GreatBuildz.

**Sent to GreatBuildz:** name, email, optional phone and message, exact address, city, county, state, ZIP, lot
size, existing building footprint (when confirmed), reported zoning, fire hazard zone, backyard home size,
dimensions, roof, finish, modeled bedrooms, build-cost band ($25k bands), zoning screen, whether the homeowner
opted in to texts, and the LFR number.
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
| `consent` | `{ version, text, smsConsent, smsText, phone, acceptedAt, retainUntil }`. Kept after account deletion until `retainUntil` (four years, agreement § 9.4). |
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

**Sheet security and retention** (agreement § 7.2): named @greatbuildz.com and @lotfoundry.net accounts with 2FA
only, link sharing off, no downloads to unmanaged devices. GreatBuildz clears a row's last name within 90 days
after the 12-month window ends (no contract) or after the final fee installment (contract).

**Account deletion and export:** `/api/account/delete` strips `ownerUid` and `handoff` but keeps the referral
number, partner, county, size, status and the `consent` record. `/api/account/export` includes the homeowner's
referrals. **Consent records:** nothing purges them automatically yet; once a row's `consent.retainUntil` has
passed, ops removes `consent.phone` (or the whole consent block) by hand.

**Stop-contact and deletion relay** (agreement § 8.2): a request either company receives goes to the other by
email, quoting the LFR number, within **2 business days** to stop calls, texts or emails and **5 business days**
for anything else. GreatBuildz's addresses are jon@greatbuildz.com and team@mail.greatbuildz.com; ours is
support@lotfoundry.net. GreatBuildz clears the homeowner from the sheet.

## Test setup

**Test identity:** "Andrew Test (LotFoundry)", `support+gbtest@lotfoundry.net`, (419) 669-6663 (the business
line), on a residential Los Angeles County lot where the Studio shows "Los Angeles" and an estimate of $100K or
more. Put "Test referral, please don't schedule a consultation" in the message.

1. **Dry run (internal):** use an access-restricted nonproduction deployment with a separate test Firebase
   project/ledger. Keep the production flag unset. Set `GREATBUILDZ_REFERRAL_EMAIL=support+gbteam@lotfoundry.net`
   and `GREATBUILDZ_REFERRAL_CC=support+gbjon@lotfoundry.net`, and build the test deployment with the flag on.
   Submit as the test identity. Check the consent receipt, LFR number, and ledger status `sent`. In Gmail's
   "Show original", check From support@, To the team alias, Cc the Jon alias and homeowner, and no Reply-To.
   Simulate a provider failure in the test environment: the row must stay `queued` and the Studio must say
   the introduction is pending, without claiming the homeowner was copied. A repeat submit must reuse the
   LFR number without sending again. Mark the successful test row `closed_lost` with note "internal dry run".
2. **Coordinated test with GreatBuildz:** agree a time and test contact with Jon. In the restricted test
   deployment, set `GREATBUILDZ_REFERRAL_EMAIL=team@mail.greatbuildz.com` and
   `GREATBUILDZ_REFERRAL_CC=jon@greatbuildz.com`, then redeploy. Use a different test account or property from
   the internal dry run, or a separate test ledger; changing a row to `closed_lost` does not remove duplicate
   suppression. Verify homeowner receipt, the team's reply-all reaching support@, advisor routing, the LFR
   row on the shared sheet, and a sample status/fee reconciliation. Record `introduced` and mark it as a test
   on both sides.
3. **Start the pilot clock:** record the agreed start and review dates with Jon (two months from the coordinated
   test under this runbook). Enable the production build only after approvals and both tests pass, with the
   confirmed team/Jon destinations. Verify the live deployment and retain the flag-off redeploy as rollback.

## Go-live checklist

- [ ] Pilot agreement signed by GreatBuildz Inc. and VeriShare LLC, after counsel review.
- [ ] Counsel reviews `partnerConsentText`, `partnerSmsConsentText`, `/privacy` Sections 1, 5 and 6 and
      `/terms` Section 7, and the four-year consent-record retention.
- [ ] GreatBuildz confirms that the two-box consent works for its texting platform (agreement § 9.3), and that
      it is OK being named in the Studio and on `/privacy` and `/terms`.
- [ ] Play Console: submit the Data safety update in `docs/play-declarations.md` (design summary now shared) and
      Publish it on launch day. No new Android build is needed.
- [ ] W-9 for VeriShare LLC to GreatBuildz before the first payment.
- [x] Wire `GREATBUILDZ_REFERRAL_EMAIL` and `GREATBUILDZ_REFERRAL_CC` into the Functions environment and
      `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` into the deploy build in `.github/workflows/ci.yml`.
- [ ] Configure repository variables: `GREATBUILDZ_REFERRAL_EMAIL=team@mail.greatbuildz.com` and
      `GREATBUILDZ_REFERRAL_CC=jon@greatbuildz.com`. Leave `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` unset until launch.
      Verify the existing runtime `RESEND_API_KEY` binding and sender delivery in the controlled test.
- [ ] Confirm shared-sheet access and name the operator for queued handoffs and coordinated deletion requests.
- [ ] Merge on launch day; re-date the legal version (2026-11-10) and `PARTNER_REFERRAL_CONSENT_VERSION`
      (2026-11-12) to that day. The legal bump asks signed-in users to accept again.
      Rules and app deploy together.
- [ ] Dry run, then the coordinated test, as above.

**Rollback:** unset `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` and redeploy. The option disappears and the API returns
404. Existing ledger rows are untouched. The named legal clauses stay until a new legal version removes them.
