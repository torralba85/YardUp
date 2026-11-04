# Paid Builder Studio Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare a verified sample and five reviewed outreach drafts for a $149, three-property builder service, then measure a seven-day sales test once Andrew sends the first approved offer.

**Architecture:** Manual service delivery using the existing Studio and saved-layout flow; no application changes. Private artifacts hold prospect research and property evidence outside the Git repository. Andrew handles sends, order acceptance and final review.

**Tech Stack:** Existing LotFoundry browser UI; Markdown/CSV tracker; PNG captures; HTML-to-PDF presentation; existing Stripe invoicing, subject to account/readiness verification.

**Spec:** `docs/superpowers/specs/2026-11-04-builder-paid-pilot-design.md` (read in full).

## Global Constraints

- "Introductory pilot: $149 total." Three eligible City of San Diego properties; one paid builder at a time.
- "No automated sends, calls, texts, mass mail, purchased lists, ads or new paid tools."
- "No messaging action is authorized by this design alone."
- "Do not take payment until all three are accepted and the service sample/readiness checks pass."
- "Only use figures actually visible in the free Studio."
- "Illustrative ADU concept, not an existing structure. Early planning estimates, not a permit, survey, engineering assessment or builder quote."
- First versions within three business days after payment and complete accepted intake; one consolidated revision/property within seven calendar days, fulfilled within two business days.
- Full refund before preparation starts; undelivered-property allocations $49.67/$49.67/$49.66 thereafter, actual refund actions confirmed by Andrew. Preserve the full spec terms in the written offer.
- No code, deployment, public upload, production grants or changes to existing certificate/agent programs. GreatBuildz and existing prospect exclusions remain held.

## Review Focus

1. A saved URL opens a demo, wrong parcel or wrong pose: fail sample readiness (Task 2).
2. A queue receipt is mistaken for email delivery, or a bearer link is represented as private authentication: record separate delivery/link evidence and correct disclosure (Task 2).
3. A prospect has an earlier message, opt-out or uncertain history: hold it rather than duplicate outreach (Task 3).
4. Summary figures disagree with screenshots, omit exclusions, or expose paid details: fail presentation review (Task 2).
5. An unpaid invoice/test payment or gross amount is counted as customer profit: reconcile payment, refunds, fees and fulfillment separately (Task 5).

## Files and dependencies

Continue in `C:/Users/Andrew/LotFoundry/.worktrees/builder-paid-pilot-20261104`; preserve unrelated worktrees. Only generic plan/spec documents belong in this Git checkout.

Set private artifact root `P = C:/Users/Andrew/LotFoundry/artifacts/builder-paid-pilot-20261104`. Private means local working files, not encrypted storage. Never commit P, property addresses, saved tokens, correspondence or payment IDs. Keep raw source workbooks unchanged.

| File under P | Responsibility |
| --- | --- |
| `README.md`, `readiness.md` | Scope, status, evidence links, blockers and launch decision |
| `offer.md`, `intake.md` | Customer-facing terms and minimal three-property intake |
| `prospects.csv`, `outreach-drafts.md` | Verified firms, contact-history status and five unsent messages |
| `sales-tracker.csv`, `time-log.csv` | Commercial stages and operator time |
| `sample/evidence.md`, `sample/overview.png`, `sample/placement.png` | Permission/parcel provenance and actual Studio images |
| `sample/summary.html`, `sample/summary.pdf` | One-page presentation source and export |
| `payment-readiness.md`, `day-7-review.md` | Account checks and later commercial results |

Tasks 1 and 3 can proceed without the sample address. Task 2 needs permission evidence. Task 4 combines Tasks 1-3; Task 5 requires an actual buyer and authorized sends. A missing dependency must not be represented as a completed check.

### Task 1: Prepare the bounded offer and operating record

**Files:** Create `P/README.md`, `offer.md`, `intake.md`, `readiness.md`, `sales-tracker.csv`, `time-log.csv`.
**Interfaces:** Consumes approved spec. Produces the exact commercial terms and a checklist with `status = pending | pass | fail | blocked`, dated evidence and owner for each gate.

- [ ] Recheck vault project note and latest project log, branch/status and the spec. Record current worktree HEAD and authorization boundaries in README; do not reset or synchronize other worktrees.
- [ ] Create offer.md using the spec's exact $149 scope, delivery/revision/refund terms, service-vs-free-tool explanation and disclosure. Separate certificate purchase from this preparation service.
- [ ] Create intake.md: business contact, three addresses, approximate dimensions/use, confirmation of permission to provide/share the information, intended recipients, and acknowledgement that a holder of the saved link can view the concept. Do not collect homeowner contact or financing details.
- [ ] Create tracker headers: `prospect_id,company,source_url,verified_at,history_status,review_status,sent_at,reply_status,offer_status,invoice_status,payment_status,gross,fees,refunds,net_receipts,delivery_status,revision_status,notes`. Initially no customer/payment rows; do not populate fictitious progress.
- [ ] Create time-log headers: `date,task,prospect_id,property_alias,minutes,category`, category `setup | acquisition | delivery | revision`. Create readiness rows for permission, real parcel, desktop restore, mobile restore, images/PDF, sample labor, payment route, operator schedule and contact-history checks.
- [ ] Review offer against every spec term. Pass only if all amounts/deadlines match and exclusions are legible. No automated product tests for these documents; retain a private review note.

### Task 2: Verify one deliverable end to end

**Files:** Create all `P/sample/*` files; update `readiness.md`, `time-log.csv`.
**Interfaces:** Consumes offer/intake. Produces an inspected real-property sample, a private saved URL and explicit per-check results. This is the prerequisite for describing a sample as ready in outreach.

- [ ] Search only relevant saved project records for explicit permission to demonstrate a real property. Prior use for debugging or a publicly listed address does not establish permission. If none is documented, ask Andrew for an address he owns or has permission to use, including permission to show the sample to prospective builders. Continue Task 3 while waiting.
- [ ] Read current browser/PDF skill instructions and `docs/design/README.md` plus `design-system.md` before rendering assets. Use existing A LOT MORE branding; do not invent a new design system.
- [ ] Load the permissioned address in the live Studio. Record actual jurisdiction, parcel source, existing-building evidence, selected dimensions, pose and warnings in evidence.md. Fail delivery eligibility for a substituted preset, mismatch, missing critical geometry or unresolved collision. Do not assert permit suitability.
- [ ] Save through the normal app to Andrew's verified business inbox only; this plan covers that self-test. Confirm the intended recipient before submission. Record whether email is actually received, queued or failed; independently copy the saved URL. Do not send to prospects/homeowners during testing.
- [ ] Open the URL in signed-out desktop and mobile sessions. Compare address, parcel shape, dimensions and pose to the saved source; confirm free concept is accessible and certificate features remain gated. Record screenshots and actual viewport dimensions. A queued email plus working copy-link can pass link readiness, but not email delivery.
- [ ] Capture overview.png and placement.png from the actual Studio; add the exact disclosure visibly without hiding warnings or altering geometry. Export summary.html to one-page summary.pdf with date, address, dimensions, visible free estimates, basis/exclusions, unresolved issues and link. Omit unavailable figures explicitly.
- [ ] Render and visually inspect the PDF and both images at intended size. Verify every displayed figure against the live evidence, link destination against the tested token and labels against the spec. The URL/address stay in private files, not Git or vault notes.
- [ ] Log sample preparation/review time. Judge the three-hour/three-property labor target including revisions; if unrealistic, report the scope/price issue before selling, without changing it unilaterally. Mark readiness only for checks actually passed.

### Task 3: Verify a first wave of eligible prospects

**Files:** Create `P/prospects.csv`; update tracker and readiness.
**Interfaces:** Consumes original `C:/Users/Andrew/LotFoundry/artifacts/lead-finder-2026-10-26/leads.json`, associated XLSX, vault builder-pipeline page and current CRM/mail history. Produces up to five eligible prospect records with sources and history checks; reserve pool never exceeds 10 total.

- [ ] Read original research and the vault exclusions. Preserve GreatBuildz, Phase 1 five, held-back firms, architects/permit-only firms, incidental-ADU remodelers, marketplaces and own-project developers as excluded.
- [ ] Check each candidate's current own website for dedicated ADU work, City of San Diego service and public business email. Record source URL/date and a specific use case for presentations. Do not guess names/emails or infer service area from headquarters.
- [ ] Read current CRM and relevant sent/draft history using the intended business account. Record `clear | prior_contact | opted_out | unknown`; exclude opt-outs and hold uncertain/duplicate approaches. Tool/account unavailability is `unknown`, not `clear`.
- [ ] Populate prospects.csv with `prospect_id,company,service_evidence_url,contact_source_url,public_email,verified_at,personalization_fact,history_status,eligibility,hold_reason`. Keep copied correspondence out of the tracker.
- [ ] Check all five against exclusions, current sources and history. If fewer than five qualify, deliver the verified subset and explain holds rather than filling with weak/unknown firms.

### Task 4: Assemble the launch pack for manual review

**Files:** Create `P/outreach-drafts.md`, `payment-readiness.md`; update README/readiness.
**Interfaces:** Consumes verified sample, offer and eligible prospect rows. Produces local unsent drafts and an honest launch decision, never a send or invoice charge.

- [ ] Read-only check the connected Stripe business identity, currency and available manual invoicing route. Record verified/not verified without secrets; do not create customers, products, invoices or charges for a hypothetical buyer. If unavailable, mark the gate blocked and propose a specific alternative for review.
- [ ] Write five personalized initial drafts with public facts from Task 3, the done-for-you benefit, exact $149 scope, ready sample link, and question about three suitable properties. Include verified business signature and simple opt-out. Never claim a sample exists until Task 2 passes; incomplete drafts remain labeled held.
- [ ] Write one follow-up per draft, eligible three business days after Andrew's confirmed initial send, with no further follow-up on opt-out/decline. Up to five additional initial drafts require response review, per spec.
- [ ] Validate recipients, price, claims, sample links and dates against evidence. Ensure no language promises exact prefab replicas, professional feasibility, free certificates, leads, sales lift or exclusive access to free Studio.
- [ ] Present sample, offer, exact recipients and messages for Andrew's manual use. Confirm his capacity before any external delivery promise. Record `ready` only when sample, payment route, schedule and contact checks pass. Do not send, publish, create mailbox drafts or grant entitlements without the corresponding instruction.

### Task 5: Run the approved sales test and fulfill a real order

**Files:** Update tracker/time-log/readiness; create `P/orders/<order-alias>/` only after an actual buyer; create `day-7-review.md` when due.
**Interfaces:** Consumes confirmed manual sends and real buyer acceptance. Produces separate payment, fulfillment and margin evidence. This task is future contingent work, not something to mark complete during preparation.

- [ ] Record Andrew's confirmed first send as day zero. Use Pacific business days for follow-up/delivery dates; skip weekends and applicable holidays. Do not schedule future actions or send follow-ups merely because the plan exists.
- [ ] For an interested builder, collect minimal intake and check all three actual properties against the spec's eligibility rules before invoicing. Obtain buyer scope acceptance and Andrew's delivery capacity confirmation; replace rejected addresses before charging.
- [ ] Prepare the $149 service invoice only for the agreed buyer and intended account; have Andrew confirm final recipient/total before any send/finalization. Never automatically charge saved cards or use certificate checkout. If taxes/account configuration alter the approved total, resolve the concrete issue before sending; do not guess tax treatment.
- [ ] Verify genuine customer payment from the ledger, separately from invoice status and analytics. Start the three-business-day clock after payment and complete accepted intake. Exclude owner tests and unpaid invoices from revenue.
- [ ] Produce all three packages using Task 2's checks. Andrew reviews before delivery. Track delivery and one consolidated revision/property; retain seven-calendar-day request/two-business-day completion limits. Apply spec refund allocations only through Andrew-confirmed actions.
- [ ] Review at day seven after first send: verified sends/replies/objections, paid customers, gross receipts, fees, refunds, direct costs, delivery/revision minutes and net receipts. An order sold near day seven may still be awaiting fulfillment; report it separately. Do not call gross receipts profit.
- [ ] Recommend continuing, changing the offer, or stopping based on evidence. No automatic price reduction, ads, new features or marketplace build. No-response results remain inconclusive about demand.

## Plan review and handoff

Self-review completed: spec sections map to Tasks 1-5; all five Review Focus failures have explicit manual acceptance checks. No program interfaces or application tests are invented for this manual pilot. Private artifacts stay out of Git; only this plan and its design approval note are committed. Tasks are intentionally unexecuted at plan handoff.

Recommended execution: **Native**, using `superpowers:executing-plans`; these tasks share a small evidence set and the main risks are inaccurate claims and premature external actions. Subagent-driven execution remains an option if Andrew wants independent task reviews. Under writing-plans, present this plan for review and execution-method selection before implementation.
