# LotFoundry Kickstarter Resubmission Packet

Last updated: 2026-09-08

## Purpose

This document is the source of truth for a Kickstarter resubmission after Trust & Safety declined the previous **“LotFoundry — AI Feasibility Studio for ADUs”** campaign because the story and budget read as funding the operation and expansion of an existing service.

The revised campaign must fund a **new, finite, clearly scoped creative deliverable**. It must not ask backers to pay for LotFoundry’s ongoing hosting, API usage, parcel/rent data subscriptions, recurring zoning research, routine operations, marketplace growth, or general business expenses.

Kickstarter references used for this rewrite:

- [Our Rules](https://www.kickstarter.com/rules/) — projects must create something new; app/software projects must demonstrate a prototype; information must be honest and clearly presented; service-provider and marketplace-centered projects are prohibited; AI use must be disclosed.
- [What are the basics?](https://help.kickstarter.com/hc/en-us/articles/115005028514-What-are-the-basics) — a Kickstarter project is finite work with a clear goal.
- [How to set the right funding goal](https://help.kickstarter.com/hc/en-us/articles/115005134293-How-to-set-the-right-funding-goal-for-your-Kickstarter-campaign) — the goal should be what is required to complete the project and fulfill rewards.
- [AI content and technology guidance](https://help.kickstarter.com/hc/en-us/articles/16848396410267-Can-I-use-AI-generated-content-or-create-AI-technology-in-my-project) — creators must disclose what AI is used, how it is used, what is original, and relevant sources/data-provider practices.

Repository truth used to define the boundary:

- `README.md` documents the existing LotFoundry prototype foundation: parcel search, 3D feasibility, financial estimates, OpenAI-assisted workflows, reports, saves, and builder handoff.
- `TODOS.md` explicitly lists **owner-side comparison workspace (multiple saved ADU concepts per parcel, side-by-side finances, report versioning)** and **full calculation provenance (source, timestamp, formula, confidence)** as future features.

Those future features form the new Kickstarter project.

---

## Recommended Campaign Identity

### Project title

**LotFoundry Project Book — Compare ADU Concepts Before You Build**

### Short description

Help create a new LotFoundry release that lets homeowners compare multiple ADU concepts side by side, understand the numbers behind each option, preserve report versions, and assemble a clear Project Book before speaking with local professionals.

### One-sentence scope test

If a sentence does not describe creating, testing, packaging, or delivering the **Project Book comparison release**, it probably does not belong in the campaign.

---

## The Critical Framing

### What exists before Kickstarter

LotFoundry has an existing prototype foundation that demonstrates the core homeowner feasibility workflow. It can explore a parcel, visualize an ADU concept, estimate planning-level financials and constraints, and generate a report.

The existing prototype is shown only as evidence that the team can build and deliver software. It is **not** the thing backers are being asked to fund.

Do not use campaign language such as:

- “This works today.”
- “LotFoundry is live at lotfoundry.net.”
- “Help us keep LotFoundry running.”
- “Help us grow/scale the platform.”
- “Help cover our first year of hosting, APIs, data, or research.”

Do not link out to the live LotFoundry site from the Kickstarter story. Demonstrate the existing prototype with campaign screenshots/video instead.

### What Kickstarter funds

Backers fund one finite new release: **LotFoundry Project Book**.

The release is complete when the following five deliverables are implemented, tested, documented, and made available to backers:

1. **Multi-concept comparison workspace** — save multiple ADU concepts for one parcel and compare them without overwriting the current scenario.
2. **Side-by-side feasibility and financial comparison** — compare footprint, estimated build cost, rent, NOI, payback, lot coverage, and planning constraints in one view.
3. **Versioned Project Books** — preserve named report versions so a homeowner can return to an earlier concept instead of replacing it.
4. **Calculation provenance** — show the source/basis, timestamp where available, formula or calculation basis, and confidence/estimate status for headline numbers.
5. **Project Book export and release QA** — generate a clear comparison-oriented Project Book for print/save, then complete accessibility, responsive, and regression testing for the funded release.

These items are intentionally bounded. The campaign does **not** promise comprehensive permitting, automatic approvals, construction drawings, financing, a nationwide zoning database, or a completed builder network.

---

## Kickstarter Story Draft

### A better decision before a bigger commitment

An ADU starts with a deceptively simple question: **what should we build here?**

A homeowner may have room for several plausible concepts, but each one changes the tradeoffs — size, lot coverage, estimated build cost, potential rent, payback, privacy, and permitting questions. A single feasibility result is useful, but it does not make those choices easy to compare.

LotFoundry has an existing prototype foundation that demonstrates the core feasibility workflow. The **Project Book features in this campaign do not exist in that prototype today**. This Kickstarter is specifically for creating and delivering that new comparison release.

### What we are creating

**LotFoundry Project Book** will turn a single feasibility scenario into a decision workspace.

Instead of asking a homeowner to remember how Concept A differed from Concept B, Project Book will let them preserve multiple concepts for the same parcel and compare the important numbers side by side. Each saved version will be able to carry its own footprint and feasibility assumptions, financial results, and planning notes.

The second part of the project is trust in the numbers. Headline estimates will gain a provenance layer that explains the calculation basis and identifies whether a value is recorded data, a deterministic calculation, or a planning estimate. Where a source and timestamp are available, Project Book will surface them. Where confidence is limited, it will say so rather than imply certainty.

The final deliverable will be a comparison-oriented Project Book that a homeowner can print or save before talking with a designer, builder, lender, or local permitting professional.

### What backers will be able to do when the project is complete

- Save multiple ADU concepts for the same parcel.
- Compare concepts side by side instead of repeatedly resetting one scenario.
- Compare planning-level cost, rent, NOI, payback, lot coverage, and constraints.
- Reopen named versions of a Project Book.
- See clearer provenance and confidence information behind headline calculations.
- Print or save a comparison-oriented Project Book.

### What this project is not

LotFoundry is an early planning tool. Project Book will not be a permit decision, appraisal, construction document, engineering report, tax opinion, financing commitment, or substitute for local professional advice.

This campaign also does not fund a marketplace, builder lead network, ongoing zoning-research service, or general LotFoundry operations.

---

## Finite Delivery Plan

The following is the recommended 12-week campaign delivery schedule. Publish only a schedule the project owner is prepared to commit to.

### Weeks 1–2 — Scope freeze and comparison UX

- Finalize comparison data model and Project Book information hierarchy.
- Produce working comparison-flow prototypes.
- Lock the fields that are preserved per concept/version.

**Exit condition:** a documented, testable comparison flow with no new feature categories added to campaign scope.

### Weeks 3–5 — Multi-concept workspace

- Implement multiple concepts per parcel.
- Implement create, rename, duplicate, select, and delete behavior.
- Implement side-by-side feasibility/financial comparison.

**Exit condition:** two or more saved concepts can be compared without overwriting one another.

### Weeks 6–8 — Versioning and provenance

- Add named Project Book versions.
- Add calculation/source/basis metadata to headline comparison values.
- Add confidence/estimate labeling where the application cannot claim recorded certainty.

**Exit condition:** a saved version can be reopened and the major numbers show their basis/provenance treatment.

### Weeks 9–10 — Project Book output

- Build the comparison-oriented print/save layout.
- Confirm sensible behavior for incomplete or unavailable fields.
- Add backer-facing explanatory copy and estimate disclaimers.

**Exit condition:** a complete comparison can be exported as a readable Project Book.

### Weeks 11–12 — Beta, accessibility, QA, delivery

- Backer beta on the funded features.
- Responsive and accessibility verification.
- Regression testing of the existing feasibility flow.
- Fix release-blocking defects and publish the funded release.

**Exit condition:** the five promised deliverables are released and documented.

---

## Funding Breakdown

Use the final Kickstarter goal as the amount required to complete the finite release and fulfill rewards. Do not set the goal as a general fundraising target for LotFoundry.

Recommended allocation of the final goal:

| Category | Share | What it funds |
| --- | ---: | --- |
| Finite software implementation | 42% | Engineering for multi-concept comparison, versioning, provenance, and Project Book output |
| Product and report design | 18% | Comparison UX, responsive states, information hierarchy, export layout |
| QA and accessibility | 15% | Regression testing, responsive testing, accessibility checks, release fixes |
| Beta, documentation, and digital reward fulfillment | 8% | Backer beta operations for this release, release notes, help copy, reward packaging |
| Kickstarter/payment fee reserve | 9% | Platform/payment costs associated with the campaign; reconcile to Kickstarter’s current calculator before submission |
| Contingency | 8% | Bounded margin for underestimated work required to deliver the listed scope |
| **Total** | **100%** | |

### Explicitly excluded from the Kickstarter budget

Do **not** describe pledges as paying for:

- recurring hosting or cloud bills;
- ongoing OpenAI/AI API usage;
- recurring Google Maps, parcel, rent, or other data subscriptions;
- ongoing zoning research or maintenance as a service;
- routine business overhead;
- general marketing or customer acquisition;
- builder-network operations, lead acquisition, or marketplace growth;
- app-store operations unrelated to the funded Project Book release;
- salaries/labor that cannot be tied directly to the finite deliverables above.

Existing infrastructure and third-party integrations may be used to build and test Project Book, but their recurring operating cost remains outside the Kickstarter-funded project.

---

## Reward Structure

Rewards should be new, finite, and tied to the Project Book release rather than selling access to the existing service. Suggested structure:

| Suggested pledge | Reward | Scope |
| ---: | --- | --- |
| $10 | **Foundry Supporter** | Campaign updates + name/handle in the Project Book supporter roll (optional public credit) |
| $35 | **Project Book Launch Edition** | Access to the funded Project Book release when delivered + supporter credit |
| $75 | **Beta Foundry** | Project Book Launch Edition + pre-release beta access to the funded features + structured feedback survey |
| $150 | **Founding Review Circle** | Beta Foundry rewards + invitation to one group Project Book preview/review session + founding reviewer credit |

Do not promise lifetime hosting, unlimited recurring data lookups, indefinite API-funded usage, ongoing consulting, guaranteed permit outcomes, or builder placement as a reward.

Final reward prices should be checked against fulfillment cost and the final funding model before submission.

---

## AI Disclosure Draft

### Use of AI

LotFoundry is human-directed software that includes AI-assisted features. The existing application uses OpenAI’s Responses API in authenticated workflows for parcel/permit explanations and style-matched ADU concept assistance. The application also separates AI-generated explanations or concept imagery from deterministic feasibility/financial calculations and recorded third-party data.

For the Kickstarter-funded Project Book release, AI may help present or explain information, but AI will not be treated as the authority for zoning, permitting, engineering, appraisal, financing, or code compliance. The multi-concept data model, comparison UX, calculation logic, provenance system, Project Book design, testing, and release decisions are human-created and human-reviewed.

Any AI-generated campaign image, copy, or other campaign asset must be disclosed as AI-assisted rather than presented as wholly human-produced.

### AI/data source disclosure notes for submission

Kickstarter’s AI questionnaire should be answered from current provider disclosures at the time of submission, not from assumptions.

Current sources to review before submitting:

- [OpenAI training-data summary](https://help.openai.com/en/articles/20001044-training-data-summary-pursuant-to-california-civil-code-section-3111)
- [OpenAI approach to data and AI](https://openai.com/index/approach-to-data-and-ai/)
- [OpenAI business/API data privacy](https://openai.com/business-data/)

OpenAI currently states that its models are developed using a mixture of publicly available data, third-party partnerships, information supplied or generated by users/human trainers/researchers, and synthetic data. OpenAI also states that API/business inputs and outputs are not used for model training by default unless the customer explicitly opts in.

Do **not** claim that LotFoundry independently verified consent, license, or attribution for every item in an AI provider’s model-training corpus. Describe the provider’s published safeguards and opt-out/data-control mechanisms accurately and link to the current provider disclosure in the Kickstarter submission where appropriate.

User-provided photos or other user content used by LotFoundry’s AI workflows must remain subject to the application’s explicit consent flow and privacy disclosures.

---

## Prototype Demonstration Guidance

Kickstarter requires app/software projects to demonstrate a prototype. That does not require the campaign to market the existing LotFoundry service.

Recommended campaign video structure:

1. **Existing prototype — clearly labeled**: show a short screen recording of the current single-scenario feasibility workflow.
2. **Boundary statement on screen**: “The prototype shown here is the foundation. The Project Book comparison features are what this Kickstarter will create.”
3. **Project Book design/prototype**: show honest wireframes or design mockups for comparison/versioning, clearly labeled as proposed/not yet built.
4. **Deliverable recap**: list the five finite deliverables and the 12-week release plan.

Do not use CGI or edited video to imply that an unbuilt Project Book interaction is already functional.

---

## Trust & Safety Resubmission Note

Suggested note to include with the resubmission:

> Thank you for the earlier review and for identifying where our campaign read as funding the operation of an existing service. We have reframed the project around a new, finite software deliverable: LotFoundry Project Book.
>
> The existing LotFoundry prototype is shown only to demonstrate our current technical foundation. The Kickstarter-funded Project Book features — multi-concept comparison, side-by-side financial/feasibility views, report versioning, calculation provenance, and a comparison-oriented Project Book export — are not part of the existing prototype and are the specific work this campaign will create.
>
> We removed language such as “this works today” and references directing backers to a live service. We also removed recurring operational expenses from the funding plan. Pledges are not allocated to ongoing hosting, APIs, parcel/rent data subscriptions, continuing zoning research, builder-network operations, or routine business expenses. The budget is limited to the one-time design, engineering, testing, documentation/reward fulfillment, campaign fees, and contingency required to deliver the Project Book release.
>
> We have also added a specific AI disclosure describing where AI is used, what work is human-created, and the provider/source disclosures relevant to the software.

---

## Pre-Submission Checklist

### Story and scope

- [ ] Campaign title is **LotFoundry Project Book — Compare ADU Concepts Before You Build** or an equally finite title.
- [ ] Story consistently says the campaign funds the Project Book release, not LotFoundry generally.
- [ ] Existing product is called a **prototype foundation**, not the Kickstarter deliverable.
- [ ] No “works today,” “already live,” “help us grow,” or “keep the service running” language remains.
- [ ] No outbound link to the live LotFoundry service appears in the Kickstarter story.
- [ ] Five deliverables are listed and match this document.
- [ ] Campaign does not foreground or fund the builder marketplace/lead-routing business.

### Budget

- [ ] No recurring hosting/cloud line item.
- [ ] No recurring OpenAI/Google/parcel/rent data line item.
- [ ] No continuing zoning-research/service line item.
- [ ] No generic “operations,” “growth,” or “marketing” line item.
- [ ] Every labor cost maps directly to one of the finite Project Book deliverables.
- [ ] Kickstarter/payment fees and contingency are included in the final goal calculation.
- [ ] At exactly 100% of the goal, the project can deliver all promised rewards and features.

### Prototype and media

- [ ] Current prototype footage is labeled as existing.
- [ ] Proposed Project Book mockups are labeled as proposed/not yet built.
- [ ] No edited animation implies unbuilt functionality is already working.
- [ ] Campaign media avoids claims of permit approval, guaranteed ROI, or guaranteed rental income.

### AI

- [ ] Kickstarter AI questions are answered explicitly.
- [ ] AI provider and use cases are named.
- [ ] Human-created portions of the project are described.
- [ ] AI-generated campaign assets, if any, are disclosed.
- [ ] Data/source and consent/credit questions use current provider documentation.
- [ ] No unsupported claim is made about universal consent/license of model-training data.

### Rewards and delivery

- [ ] Rewards are tied to the new Project Book release/campaign rather than the existing service.
- [ ] No lifetime recurring service/data promise is included.
- [ ] Timeline is realistic for the project owner before it is published.
- [ ] Risks section discloses third-party data limitations and planning-estimate limitations.

---

## Risk Disclosure Draft

Software development carries execution risk, and parcel/zoning/market information can be incomplete, outdated, or unavailable for some addresses. Project Book will make those limitations clearer; it cannot eliminate them.

The funded release will be designed and tested using the existing LotFoundry application foundation, its demo parcels, and existing integrations. The campaign does not depend on buying broader recurring data coverage or launching a new ongoing research service. If a third-party integration changes during development, the team will preserve the promised comparison/versioning/provenance workflow using the available application data and clearly label unavailable fields.

Financial outputs remain planning estimates, not guarantees. Zoning and permit information must be verified with the relevant local authority and qualified professionals before a homeowner acts on it.

---

## Internal Guardrail

The easiest way to trigger the same rejection again is to describe **LotFoundry the business** instead of **Project Book the project**.

Before resubmission, read every paragraph and every budget line against one question:

> If Kickstarter funds exactly this campaign goal, what finite new thing will be complete?

The answer should always be: **the LotFoundry Project Book comparison release described in the five deliverables above.**
