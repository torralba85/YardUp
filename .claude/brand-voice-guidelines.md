# LotFoundry Brand Voice Guidelines

## Generation Metadata
- Version: 2 (adopted 2026-11-15; replaces v1 dated 2026-10-26, archived at [`.claude/archive/brand-voice-guidelines-v1-2026-10-26.md`](./archive/brand-voice-guidelines-v1-2026-10-26.md))
- Primary inputs: Brand discovery report (`lotfoundry-brand-discovery-2026-11-15.md`, dated 2026-11-15; 18 Drive candidates shortlisted, 7 Drive documents and 3 local authorities analyzed; 7 Notion searches returned no relevant documents; bounded coverage), v2 review draft (2026-11-15), v1 (2026-10-26), `docs/design/design-system.md` (with 2026-11-01/02 updates), `LotFoundry/memory/voice-profile.md` (confirmed 2026-10-12), and local code observations (`app/about/page.tsx`, `components/studio/CertificatePanel.tsx`, `lib/server/studio-scenario-email.ts`).
- Conversations analyzed: 0. No call transcripts, founder-authored sample corpus, or message-level performance/conversion evidence analyzed.
- Overall confidence: Medium (0.75 under the five-section rubric; see Confidence Scores).

**Precedence.** `docs/design/design-system.md` (especially §§1–3, 8, 10–11, and decisions log) is the authority for product UI copy and visual/design work. If this file disagrees with it, the design system wins and this file is the bug. For brand social captions, `LotFoundry/memory/voice-profile.md` (confirmed by Andrew 2026-10-12) stays canonical; this file aligns with both and governs cross-channel voice.

**Implementation boundary and holds.** Adopting this guideline establishes cross-channel voice policy; it does **not** by itself modify product UI copy, social profile display names, cloud documents, billing/entitlement behavior, or deployments. Existing partner holds—specifically **GreatBuildz**—remain in force; exploratory decks or proposed rewrites in this guide do not authorize outreach, distribution, or endorsement claims.

---

## Resolved Decisions (v2 Policy)

| Topic | Policy in v2 | Reason and boundary |
|---|---|---|
| Authority | Keep `docs/design/design-system.md` authoritative for product/visual work and `memory/voice-profile.md` authoritative for social; this file is the active cross-channel guide. | Prevents a competing brand authority. Current verified authorities outrank historical capability claims. [S1–S4] |
| Homeowner "unlock" | Use **Get your Certificate**, **Certificate purchased**, and **Includes the paid analysis** as appropriate to the actual action/state. | Concrete language replaces the marketing/access metaphor. Internal variable names need no copy-driven rename. Product strings noted in S9 still await a separate copy PR. [S2–S4, S9] |
| Builder "unlock" | Allow **Unlock lead** and **Lead unlocked** only where that is the verified transaction and UI action. | Narrow literal exception, not permission for "unlock potential" or social use. [S3–S4] |
| "Free" | Name the specific free activity and its limits. Keep a paid offer and its price distinct. | Recommended `/about` title: **About LotFoundry: Explore an ADU on Your Lot in 3D** (not yet implemented in `app/about/page.tsx`). First-address wording must match current entitlement behavior before publication. [S2–S4, S9] |
| Disclosures | Use the full planning line by default; allow a defined short UI line and contextual additions. | Standardizes the baseline without deleting income, privacy, source, or jurisdiction-specific notices. See Disclosure System. [S1–S4] |
| ADU vocabulary | Use **backyard home** in homeowner narrative; **ADU** in titles, search metadata, first-use definitions, and technical/regulatory discussion. | Resolves title/body drift without making code explanations awkward. [S1–S3] |
| Naming and capitalization | **LotFoundry**, **Studio**, **Certificate of Feasibility**; shorten to **Certificate** after introduction. | Lowercase generic terms. Preserve exact legal names ("VeriShare LLC" / "VeriShare, DBA Lot Foundry" for KYC/tax/banking) and quotations where required. No social-profile rename is executed by this guide. [S2–S4] |
| Historical documents | Treat superseded Kickstarter, funding, and legacy Certificate claims as historical references. Reverify and rewrite before reuse. | This classification does not edit, move, or archive those source files. [S4, S8] |
| Partner certainty | Replace "We vet the lot" with **We help homeowners explore the lot**; replace unmeasured timing/answer claims with **An early planning picture**. | Examples for future authorized revisions. A disclaimer elsewhere does not cure an overconfident headline. **GreatBuildz remains on hold.** [S4, S7] |
| Founder voice | Keep it separate from the brand voice. Draft structures may be prepared, but personal anecdotes, opinions, and claimed experience need Andrew's own words or confirmation. | No fabricated founder persona and no unnecessary block on neutral, clearly labeled drafts. [S2–S4] |
| Competitor names | Use only where a relevant, accurate comparison helps the reader; source and date material claims. Prefer the planning process as the default comparison. | A removal from one deck does not create a universal ban. Avoid unverified superiority or relationship claims. [S4] |

---

## Executive Summary

LotFoundry speaks with the composure of a planning studio presenting a model, not a bank approving a loan. It shows a homeowner what a backyard-home concept could look like, explains the estimates, and helps them prepare useful questions for a designer or builder. The reader should feel informed and under no pressure when choosing their next step.

Precision creates trust: short sentences, concrete actions, exact units, and a clear statement of scope beside each claim. A model can support early exploration; its output must not be presented as permit approval, guaranteed income, or confirmation that a particular design can be built. [S1–S3]

The signature reassurance move is **honesty as reassurance**: state what happened, what it does not mean, and what to do next (when verified system state supports it). Family, income, and future use carry equal weight—income is a possible motive, not the brand's sole promise. The strongest documented attribute is calm precision. No evidence reviewed establishes a best-converting headline or message. [S1–S4]

---

## We Are / We Are Not

Voice stays constant across channels. Tone, depth, and formality adapt to the reader's task.

| We Are | We Are Not | Evidence |
|---|---|---|
| **Calm and precise**: measured language, exact units | **Hyped, urgent, or inflated** | [S1 §1, S2, S3] |
| **Estimate-honest**: show scope, basis, and uncertainty | **Promising approval, buildability, or income** | [S1 §10, S2, S5] |
| **Possibility-minded**: family, income, future use | **An income-only investment pitch** | [S1 §10, S3] |
| **Plainspoken**: familiar words and explicit actions | **Jargon-first or metaphor-heavy** | [S1 §10, S2, S3] |
| **Sourced and dated**: claims have a verified basis | **Vague, invented, or copied forward unchecked** | [S1 §10, S2, S6] |
| **Respectful of the reader's choice**: clear prices, equal options, no surprises | **Pushy, manipulative, or presumptive** | [S3, S5, S7] |
| **Restrained**: words earn their space | **Decorative, boastful, or aspirational** | [S1 §11, S2, S3] |

### Voice Attributes in Practice

1. **Calm and precise — High confidence.** Use a short statement, then explain what matters. The social profile describes "calm, precise, planner-like" language, with exact numbers and units (`16 ft`, `4 ft`, `750 sq ft`) and typographic money figures. Aim for roughly 12-word social sentences as a rhythm, not a rigid limit. Avoid exclamation marks, emoji, and artificial urgency. [S1 §1, S2]
2. **Estimate-honest — High confidence.** Label figures as estimates, concepts, or scenarios, and make assumptions inspectable beside the number rather than buried in a footer. The design system states "Never imply guaranteed income or permit approval." Avoid "approved," "compliant," or "buildable" as unqualified product verdicts. Answer directly ("No.") when the honest answer is no. [S1 §10, S3–S4]
3. **Possibility-minded — High confidence.** "For family," "for income," and "for what's next" define the three equal motives. A single piece may focus on one motive; the overall brand must not reduce every story to rent, ROI, or "passive income." [S1 §10, S3]
4. **Plainspoken — High confidence.** Prefer "backyard home" or "small home" in homeowner narrative, define "accessory dwelling unit (ADU)" on first use where needed, and make buttons name the action. Use technical detail when it helps answer a real planning question rather than front-loading unexplained acronyms. [S1 §10, S2–S3]
5. **Sourced and dated — High confidence.** Regulatory claims identify the jurisdiction, agency/code section, and date checked (e.g., `SDMC §141.0302`, `HCD ADU Handbook`). Financial figures identify their model/source and scenario. Social fact posts use `Source: <agency/document>, checked <date>.` (brackets are a production instruction, not publishable copy). Re-read facts from live sources rather than carrying them forward unchecked. [S1 §10, S2]
6. **Respectful of the reader's choice — High confidence.** Offer a useful next step without manufacturing a deadline, buried price, asymmetric consent choice, or implied relationship. The builder pitch asks for critique and states limitations; cold builder outreach is founder-sent only (never automated). Avoid implying that a builder has agreed to participate or that an estimate replaces their work. [S3–S5]
7. **Restrained — High confidence.** Keep headlines short enough to behave as graphic objects, one idea per line, with no filler adjectives or decorative clichés such as "Unlock your property potential." [S1 §§3.2, 11, S2–S3]

---

## Brand Personality — Confidence: Medium

- **Archetype:** The Exhibiting Planner, retained from v1: informed, unhurried, and clear about limits. This is an editorial interpretation, not a professional credential. [S1 §1, S3]
- **Personality sketch:** A careful guide at a planning table who shows the model, explains the assumptions, and helps the homeowner identify the next question.
- **Values expressed:** precision, honesty, choice, privacy, and restraint. Avoid language implying that LotFoundry itself is a licensed architect, planner, appraiser, or permitting authority.

---

## Messaging Framework — Confidence: Medium

*No message-level conversion or engagement dataset was analyzed; confidence rests on consistent documentation across design, social, and product copy.*

### Primary Value Proposition

**Explore what a backyard home could look like on your lot, compare early planning estimates, and prepare your next questions before paying for plans.**

This is a guideline synthesis of [S1–S3, S5], not an effectiveness-tested slogan. Offer availability and supported locations need verification for the intended campaign.

Observed live/published variations aligned with this value proposition:
- "Explore an ADU on your lot in 3D." (landing H1)
- "Check your lot before you pay for plans." (social campaign)
- "Start with the lot. Then choose the plan." (social campaign)

### Message Pillars

| Pillar | Core idea and use | Phrasing |
|---|---|---|
| Family | Explore space for people and independence; homeowner stories | "What would you make room for?" — documented social phrase [S2] |
| Income | Compare a rental scenario with disclosed cost and rent assumptions | "Compare estimated rent with the costs behind it." — guideline synthesis [S1 §10] |
| What's next | Keep future uses open without claiming a financial outcome | "Explore a little more room for what comes next." — guideline synthesis [S1 §10] |

Support every pillar with the planning process: **start with the lot, compare a concept, inspect the estimates, then take better questions to a designer or builder**—with the first address free to explore and a clearly priced one-time Certificate if useful. Do not claim direct matching, vetted partners, instant results, guaranteed eligibility, or measured speed from legacy decks. [S4–S8]

### Competitive Positioning

The default comparison is the planning sequence: exploring assumptions before committing money to detailed plans (or getting multiple builder quotes against one shared brief). Name another business only when it helps explain a specific difference and the comparison has been verified; source and date material claims. Distinguish proposed partnerships from active relationships; an exploratory deck is not evidence of endorsement. [S4–S7]

---

## Tone-by-Context Matrix — Confidence: Medium

The source base is strongest for product and social rules. Outreach and proposal tone are supported by a small set of documents. Support tone is extrapolated from transactional copy, not an analyzed support-reply corpus.

| Context | Formality | Energy | Technical depth | Direction and example |
|---|---|---|---|---|
| Landing | Medium | Calm, inviting | Low | State the activity first; headlines as objects: "Explore an ADU on your lot in 3D." [S1–S3] |
| Social (brand account) | Low–medium | Restrained, curious | Low; precise for facts | One idea, one invitation: "Start with the lot. Then choose the plan." (documented phrase) [S2] |
| Studio / Certificate | Medium | Steady | Only what helps the decision | Label the action and show provenance beside figures: "Get your Certificate." (v2 replacement; S9 still live) [S3–S4, S9] |
| Errors / payments / transactional | Medium | Calm, direct | Enough to explain the state | State what happened, what it does not mean, and next step: "Your payment is confirmed. The Certificate is still loading." (draft; use only when verified system state proves it) [S3] |
| Consent and privacy | Medium | Calm, neutral | Low | Ask plainly, name third parties, state what is not shared, keep Accept/Decline equal weight: "Google never gets your address or results." (shipped banner pattern) [S3] |
| Planning guides | Medium–high | Measured | Appropriate to the question | Identify jurisdiction, agency/code section, date checked, assumptions, and exclusions. [S1 §10, S2–S3] |
| Cold builder outreach | Medium | Respectful, curious | Low–medium | Ask for a specific critique; founder-sent first person without inventing personal history. [S2–S5] |
| Partner proposals | Medium–high | Exploratory | Medium–high | Separate established facts, assumptions, and proposed terms: "Proposed pilot for discussion." (draft; GreatBuildz hold active) [S6–S7] |
| Support | Medium | Warm, specific | Appropriate to the issue | Explain what is known and the next action; promise only support actions that can be delivered. (provisional) [S3] |
| Founder content | Andrew's own | Context-dependent | Context-dependent | Preserve authentic phrasing; do not invent anecdotes or experiences. [S2] |
| Machine-readable descriptions | Medium | Neutral | Explicit | Keep prices, geographic support, dates, and limitations aligned with verified product facts. [S3–S4] |

### Channel Rules

- **Social:** No greeting or sign-off; the opening line is the headline. Place the CTA near the end ("Your first address is free to explore. No account needed.") and follow with the required disclosure. Use `→` before links and `•` for bullets; no emoji or exclamation marks. The confirmed profile uses 4–7 Instagram hashtags, 2–3 Facebook hashtags, and 0–1 on X. Verify the actual destination before saying "link in bio" (on Instagram `@lot.foundry`, use `Start at lotfoundry.net` when no bio link exists). These are documented defaults, not measured performance optima. [S2]
- **Outreach:** One specific reason for contacting the business, one small ask, a relevant link, and an easy decline. Do not guess a recipient, invent familiarity, or imply the recipient is already a partner. Andrew reviews and sends founder outreach personally (zero auto-sending). Drafting does not authorize sending. [S3–S5]
- **Proposals:** Label any pilot as proposed and distinguish model outputs from professional assessment. Keep assumptions and limitations near associated claims. Existing holds (including GreatBuildz) remain in force. [S4, S6–S7]
- **Transactional copy:** Follow what happened -> what it does not mean -> what to do next, and state only reassurance the actual system state supports. "You will not be charged twice" is appropriate only where the transaction behavior justifies that promise. [S3]
- **Consent and privacy:** Equal-weight controls, plain explanation of third parties, and zero routing of analytics around consent. [S1 log, S3]

---

## Terminology Guide — Confidence: High for established rules; Medium for v2 resolutions

| Use | Scope | Avoid or replace |
|---|---|---|
| `LotFoundry` | Product, site, and brand copy | `Lot Foundry` / `Lotfoundry` (preserve exact legal or quoted forms where required) |
| `backyard home` / `small home` | Homeowner narrative | Unexplained technical vocabulary |
| `ADU` | Titles, search metadata, first-use definitions, and regulatory discussion | Forcing a colloquial substitute into legal/code explanations |
| `Studio` | The named product workspace | Lowercase only for a generic studio |
| `Certificate of Feasibility`; then `Certificate` | Named $29 product | Language implying that the name certifies permit approval |
| `Get your Certificate` / `Certificate purchased` | Homeowner action or confirmed purchase state | `Unlock property certificate` / `Certificate unlocked` |
| `Unlock lead` / `Lead unlocked` | Verified literal builder action only | `Unlock your potential` / social or homeowner "unlock" phrasing |
| `early planning estimate` / `modeled scenario` / `concept` | Model output | Guaranteed result, unqualified `compliant` / `buildable` / `approved` verdict |
| `supported locations` / `local rules` | Geographic scope | `everywhere` / universal parcel coverage / `real setbacks` outside verified jurisdictions |
| `specific free activity` | Offer copy | Unqualified "free report", "free product", or "free feasibility" claim |

Use exact units and currency where relevant. Verify prices, availability, entitlement limits, provider names, and feature descriptions at the time of publication. A previous draft or pitch deck is not a source of current pricing or product capabilities. [S1–S4]

### Editorial Prohibitions

Do not use hype words such as "dream," "game-changer," "excited," or "thrilled" in the brand register. Do not use exclamation marks or emoji (`→` and `•` only in social formatting). Do not promise permits, income, or approval; invent figures; manufacture urgency; or lead with "passive income" / ROI-only claims. The builder transaction exception does not permit aspirational "unlock" language. Exact quotations and necessary explanations of prohibited wording are editorial exceptions, not suggested marketing copy. [S1 §11, S2–S4]

---

## Disclosure System

**Standard full line:**

> Early planning estimates, not a permit, survey or builder quote.

Retains the confirmed social wording. Use in social posts and roomy marketing contexts. [S2]

**Short UI variant:**

> Planning estimates, not permits or quotes.

Use only where space is constrained and the surrounding flow provides the full explanation. Does not replace relevant legal, payment, privacy, or jurisdiction-specific notices. [S3–S4]

**Add when showing income or payback:**

> Income figures are estimates, not guarantees.

Show the assumptions and source beside the figure. Distinguish demo figures from a user's scenario. [S1 §10]

**Regulatory facts:** Name the agency/document and date checked; retain `Planning information, not legal advice.` Cite the actual rule and its jurisdiction. [S2]

**Concept imagery:** Visibly label illustrative concepts and avoid implying that an image shows an approved or buildable project. Follow the design system's legibility requirements. [S1 §§2.3, 8, 10]

Machine-readable pages (`app/llms.txt`, structured metadata) may retain technically specific limits such as `not a permit, a quote, or an appraisal`. A consistent baseline does not require deleting context-specific protections. [S3]

---

## Content Examples

Examples below distinguish **verified shipped/published copy** from **illustrative drafts and proposed code replacements**. Proposed replacements are not yet applied to product code unless separately committed.

### Verified Published / Shipped Examples

**Social post (X, Oct 11, 2026 — verbatim from social voice profile [S2])**
```text
One backyard. More than one possibility.

Compare size, roof and placement in 3D, with early cost and rental estimates.

First address free. No account needed:
https://lotfoundry.net/?utm_source=x&utm_medium=organic_social&utm_campaign=one_backyard_20261011

Concepts, not permits or builder quotes.
```
*Why it fits:* Statement headline, three concrete controls, scoped "free," limit at the end, no exclamation or emoji. (New posts default to the standard full disclaimer line when space allows.)

**Landing FAQ answer (shipped landing copy [S3])**
> Does this mean I can build?
> No. LotFoundry helps you explore an early concept. It does not grant a permit or guarantee a buildable design. A local professional and your jurisdiction must confirm property conditions and applicable requirements.

*Why it fits:* Honest "No." first, clear scope of what the product does and does not do, and who decides.

**Payment-delay message (shipped builder dashboard copy [S3])**
> Stripe has your payment, but the unlock has not reached your dashboard yet. Refresh in a minute, or select Unlock on the lead again. You will not be charged twice.

*Why it fits:* Literal builder transaction context; states what happened, next action, and verified reassurance.

### Illustrative Drafts and Proposed Replacements

**Homeowner introduction — illustrative draft**
> Start with your lot.
>
> Explore a backyard-home concept in 3D. Compare early estimates and bring better questions to your designer or builder.
>
> Early planning estimates, not a permit, survey or builder quote.

*Why it fits:* Concrete activity, useful next step, adjacent limit; echoes the documented social phrase "Start with the lot. Then choose the plan." [S1–S3]

**Free exploration and paid offer — illustrative draft**
> Your first address is free to explore. No account needed.
>
> The Certificate of Feasibility is a separate, one-time purchase for the property.

*Publication condition:* Verify the first-address entitlement and purchase terms, then show the current price beside the paid action. [S2–S4, S9]

**Certificate, layout email, and About — proposed code replacements (pending separate copy PR)**

| Current local wording | v2 target wording | Condition |
|---|---|---|
| `Unlock property certificate` | `Get your Certificate` | Display current price when the action starts a purchase |
| `Certificate unlocked` | `Certificate purchased` | Only when purchase is confirmed; use `Certificate available` for access obtained another way |
| `Unlocks this property permanently` | `Includes Certificate access for this property` | Verify entitlement duration; omit an unverified permanence claim |
| `does not unlock the paid analysis` | `does not include the paid analysis` | Preserve the adjacent bearer-link privacy notice |
| `About LotFoundry: Free ADU Feasibility Check` | `About LotFoundry: Explore an ADU on Your Lot in 3D` | Proposed metadata change; verify before shipping |

These strings were observed in local code (`components/studio/CertificatePanel.tsx`, `lib/server/studio-scenario-email.ts`, `app/about/page.tsx`). Billing, live deployment, and entitlement behavior are separate from this document. [S9]

**Partner headline — proposed rewrite (held material; do not send)**
> We help homeowners explore the lot.
>
> An early planning picture, with assumptions and limits visible.

*Why it fits:* Replaces "We vet the lot" and unmeasured answer/timing language without inventing a partner relationship. **This does not authorize updating or distributing held GreatBuildz material.** [S4, S7]

**Off-brand example — constructed for illustration**
> Unlock guaranteed passive income with an instantly approved dream ADU.

*Problems:* Aspirational "unlock," guaranteed financial outcome, approval promise, and hype. Replace with the homeowner introduction above, using only verified capabilities. [S1–S4]

---

## Visual Alignment — Confidence: High for documented rules

Retain **A LOT MORE**: chalk `#F5F5F0`, ink/carbon `#161616`, signal orange `#FF5B24`, orange-ink `#C43708`, stone `#65655F` (chalk only), and stone-on-dark `#B7B7AE`; **Space Grotesk** for display and **Manrope** for body/controls. Orange-filled actions use carbon labels. Never use signal-orange text on chalk. Keep financial figures typographic and neutrally colored (carbon on chalk, chalk on carbon); green is strictly for verified/eligible status. [S1 §§2–3]

`docs/design/design-system.md` (2026-11-01/02) permits the landing hero's `backyard-life.webp` photograph, carbon scrims, and hero glass surfaces (with secondary text at chalk 86%+). This is a scoped exception, not a general gradient or glass rule. Retired Blue Hour / Golden Hour, serif/mono, and money-green directions must not replace the current authority. Uninspected historical folder images (dated Aug 8 in Drive metadata) must be visually verified before any reuse. [S1 §§1, 8, 11, log; S4]

---

## Confidence Scores

Confidence reflects the evidence behind this guidance, not probability of approval, conversion, or product accuracy. V1 and the discovery report share underlying sources and do not count as independent corroboration.

| Section | Rating | Evidence and limitation | Rubric contribution |
|---|---|---|---|
| Voice attributes | High | Explicit design/social rules plus operational examples [S1–S2, S5] | 1.0 × 30% = 0.30 |
| Messaging framework | Medium | Documented pillars and pitch examples; no outcome evidence [S1–S2, S5–S7] | 0.6 × 25% = 0.15 |
| Tone matrix | Medium | Explicit product/social guidance; small outreach/proposal sample; support remains provisional [S2–S3, S5–S7] | 0.6 × 20% = 0.12 |
| Terminology | High | Explicit source vocabulary; product copy PRs still pending for S9 [S1–S3, S9] | 1.0 × 15% = 0.15 |
| Conversational language patterns | Low / unavailable | No transcripts analyzed; no effectiveness ranking made | 0.3 × 10% = 0.03 |

**Aggregate: 0.75, Medium.** Bands: High 0.85–1.00, Medium 0.60–0.84, Low below 0.60. Personality is Medium and visual alignment High, outside the five-section aggregate. No "language that works" or transcript-derived objection-handling section is asserted; observed phrases show documented usage, not measured conversion effectiveness.

---

## Remaining Evidence Gaps and Publication Gate

| Priority | Gap | Recommendation | Decision or evidence needed |
|---|---|---|---|
| Medium | Founder voice has no authentic sample set | Keep brand voice separate; prepare outlines and use Andrew-authored words for personal assertions | Existing founder-authored samples if a personal sub-profile is wanted; otherwise keep founder content hand-written |
| Medium | Support tone is inferred | Retain the steady transactional pattern; refine from anonymized real replies when available | Relevant support-reply sample corpus before claiming a validated support style |
| Medium | No message-level performance comparison | Retain the documented voice; evaluate messaging via a separate bounded analytics review | Authorization and appropriate outcome data for that separate analysis |
| Publication gate | Offers, claims, and links can change | Recheck price, eligibility, geography, source dates, and destination links when producing content | Current verified evidence for each published claim; never carry forward a deck's assertions |

---

## Appendix: Sources and Evidence States

| ID | Source | Category / date | Use and state |
|---|---|---|---|
| S1 | `docs/design/design-system.md` §§1–3, 8, 10–11, decisions log | Authoritative; active local source through 2026-11-02 | Product/visual authority; rechecked directly in repo |
| S2 | `LotFoundry/memory/voice-profile.md` | Authoritative; Andrew-confirmed 2026-10-12 | Social phrasing, vocabulary, disclosures; rechecked directly |
| S3 | `.claude/archive/brand-voice-guidelines-v1-2026-10-26.md` | Archived v1 cross-channel synthesis; 2026-10-26 | Prior baseline for tone, shipped examples, and resolved questions |
| S4 | Obsidian wiki `lotfoundry-brand-discovery-2026-11-15.md` | Research synthesis; 2026-11-15 | Primary v2 input; source rankings, conflicts, and hold preservation |
| S5 | Google Drive builder pitch deck, slides 1–2, 6–8 | Operational; 2026-10-13 | Feedback-first tone and modeled limits; analyzed in discovery |
| S6 | Google Drive business review | Operational; updated 2026-10-22 (content as of 2026-10-18) | Separating proposals, assumptions, and established evidence; analyzed in discovery |
| S7 | Google Drive pilot deck, slides 2–4, 6–8 | Operational; 2026-10-28 | Certainty conflict and proposal tone; analyzed in discovery; **GreatBuildz hold retained** |
| S8 | Google Drive Kickstarter story, funding proposal, legacy Certificate | Historical framing; Sep 2 and legacy Jun/Aug dates | Conflict examples only; not current capability, price, legal, or positioning authority |
| S9 | `app/about/page.tsx:6`, `components/studio/CertificatePanel.tsx:457-463`, `lib/server/studio-scenario-email.ts:29` | Local code observations; rechecked 2026-11-15 | Current shipped wording vs. proposed v2 replacements; no live behavior claimed |

No customer names, addresses, credentials, or private contact details appear in this document.
