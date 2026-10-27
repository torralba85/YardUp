# GreatBuildz referral partnership

**Status:** Built behind a flag, awaiting Jona's approval. Not live.
**Decided:** 2026-10-27. LotFoundry and GreatBuildz agreed a referral partnership.
Homeowners choose between the LotFoundry builder network and GreatBuildz.
**Code:** `lib/partner-referrals.ts`, `lib/server/partner-referrals.ts`,
`app/api/partners/referral/route.ts`, `components/studio/BuilderLeadPanel.tsx`
**Legal:** `/privacy` Sections 1, 2, 5, 6 and `/terms` Section 6, both dated October 27, 2026.

## What the homeowner sees

The Studio's "Connect with local builders" panel (desktop and mobile share
`BuilderLeadPanel`) shows a **Builder network** choice when all of these hold:

1. `NEXT_PUBLIC_GREATBUILDZ_REFERRAL=true` was set at build time.
2. The parcel resolved to a county in GreatBuildz coverage: Los Angeles or
   Ventura, CA (`GREATBUILDZ.counties`). Preset and estimated lots never qualify.

Choices are **LotFoundry builders** (the default, the existing paid-unlock
marketplace) and **GreatBuildz**. Each choice has its own explanation and its
own consent sentence. Switching networks clears the consent box, so consent
always names whoever receives the details. Outside coverage, or with the flag
off, the panel is unchanged.

The GreatBuildz consent text (`partnerConsentText`) says what is sent, that
GreatBuildz handles it under its own privacy policy, and that LotFoundry may
receive a referral fee that does not change what the homeowner pays.

## Handoff

`POST /api/partners/referral` (signed-in only, 5 per account per hour, 404
while the flag is off):

1. Re-validates the body from known fields only, re-checks the consent version
   and the county coverage (`validatePartnerReferralRequest`).
2. Creates the ledger row **before** anything leaves LotFoundry, with the
   consent text and version the homeowner accepted.
3. Emails the referral through Resend to `GREATBUILDZ_REFERRAL_EMAIL`, with
   `Reply-To` set to the homeowner and the referral number in the subject and
   `X-Entity-Ref-ID` header. Idempotency key: `partner-referral/<referralId>`.
4. Records the delivery outcome. Without `RESEND_API_KEY` or
   `GREATBUILDZ_REFERRAL_EMAIL`, or on a provider error, the row stays
   `queued` and ops hands it off by hand.

A second submit for the same homeowner, partner and address returns the
existing referral (`duplicate: true`) and sends nothing.

**Sent to GreatBuildz:** name, email, optional phone and message, exact
address, city, county, state, ZIP, lot size, backyard home size, dimensions,
roof, finish, build-cost band ($25k bands, the same rounding builders see),
zoning screen, and the `LFR-XXXXXXXX` referral number.
**Never sent:** exact cost and rent figures, the certificate, photos, saved
scenarios, account ids, payment data, analytics.

If GreatBuildz later offers an intake API, replace `dispatchPartnerReferral`.
The ledger, consent and statuses stay the same.

## Internal tracking: `partnerReferrals`

Server-only collection. `firestore.rules` denies every client read and write;
only the Admin SDK touches it. The doc id is a hash of uid, partner and
address, so it cannot be guessed and does not repeat.

| Field | Meaning |
|---|---|
| `referralId` | `LFR-XXXXXXXX`. Both companies quote it in reports and invoices. |
| `partnerId` | `greatbuildz` |
| `ownerUid` | Homeowner account. Removed on account deletion. |
| `status` | See lifecycle below. |
| `handoff` | Exactly what was sent. Removed on account deletion. |
| `consent` | `{ version, text, acceptedAt }` |
| `delivery` | `{ channel: "email", outcome, resendId?, error?, attemptedAt }` |
| `attribution` | `{ source, state, county, aduSqft }`. Kept for fee reconciliation. |
| `history` | `[{ status, at, note? }]`, append-only. |
| `ownerDeleted` | `true` after the homeowner deleted their account. |

**Status lifecycle** (`PartnerReferralStatus`):
`queued` → `sent` (set by the API) → `introduced` → `engaged` → `contracted`,
or `closed_lost` at any point after `sent`. Ops sets the later statuses from
GreatBuildz's reports, appending to `history` with a note naming the report.

**Reconciliation (monthly):** export `partnerReferrals` where
`partnerId == "greatbuildz"`, match GreatBuildz's report by `referralId`,
update statuses, then invoice against the rows in `contracted` (or whatever
stage the agreement pays on). Analytics event `partner_referral_submitted` is
directional only; the ledger is the source of truth.

**Account deletion and export:** `/api/account/delete` strips `ownerUid` and
`handoff` but keeps the referral number, partner, county, size and status.
`/api/account/export` includes the homeowner's referrals. GreatBuildz's copy is
GreatBuildz's to delete; the privacy policy says so.

## Go-live checklist (needs Jona's approval)

- [ ] Jona approves the homeowner copy in `BuilderLeadPanel` and the consent
      text in `partnerConsentText`.
- [ ] Counsel reviews `/privacy` Section 5 (Partner Referrals) and `/terms`
      Section 6 (Partner Referral Networks), especially the referral-fee
      disclosure and the consumer-directed-disclosure basis under CCPA.
- [ ] GreatBuildz confirms: intake address, coverage (Los Angeles and Ventura
      counties), that the homeowner service is free, "screened contractors"
      wording, its privacy policy URL, and the report format with `LFR-` ids.
- [ ] Decide whether the referral-fee basis (per referral, per introduction,
      per contract) changes the status that triggers an invoice.
- [ ] Decide whether to bump `CURRENT_LEGAL_CONSENT` in `lib/legal-consent.ts`
      (and the matching literals in `firestore.rules`) so members re-accept the
      updated terms. Not done in this change: each referral already carries its
      own consent receipt. If bumped, deploy rules and app together.
- [ ] Apply `docs/partners/greatbuildz-ci-env.patch` to `.github/workflows/ci.yml`
      (`git apply docs/partners/greatbuildz-ci-env.patch`, then delete the
      patch). It passes the two repository variables below into the deploy
      build. It ships as a patch because the agent token cannot edit workflows.
- [ ] Set repository variable `GREATBUILDZ_REFERRAL_EMAIL`, send one test
      referral with a disposable account, confirm GreatBuildz received it.
- [ ] Set repository variable `NEXT_PUBLIC_GREATBUILDZ_REFERRAL=true` and run a
      forced production deploy (the flag is inlined at build time).
- [ ] Deploy Firestore rules (`npm run deploy:rules`, or the full deploy).

**Rollback:** unset `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` and redeploy. The option
disappears and the API returns 404. Existing ledger rows are untouched.
