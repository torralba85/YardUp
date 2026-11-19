> **Archival Record (archived 2026-11-15):** This v1 guideline (`2026-10-26`) is superseded by v2 in [`.claude/brand-voice-guidelines.md`](../brand-voice-guidelines.md). Preserved for historical provenance only; do not apply superseded rules or unresolved v1 open questions to new work.

# LotFoundry Brand Voice Guidelines

## Generation Metadata
- Created: 2026-10-26
- Version: 1
- Replaces: none (first version)
- Sources: 12 (see Appendix): the design system's voice and anti-pattern rules, the confirmed social voice profile, the approved content calendar, shipped landing, Studio, Certificate, builder, consent and email copy, the San Diego cost guide, llms.txt, and vault notes on builder outreach, partner decks and the Kickstarter story
- Documents processed: 12
- Conversations analyzed: 0. No call transcripts exist; Gong and Granola are not connected.
- Discovery report used: No. Sources were gathered from the repo, `LotFoundry/memory/` and the Obsidian vault.
- Overall confidence: Medium (0.75; see Confidence Scores)

**Precedence.** `docs/design/design-system.md` §10–11 is the authority for in-product copy. If this file disagrees with it, the design system wins and this file is the bug. For brand social captions, `LotFoundry/memory/voice-profile.md` (confirmed by Andrew 2026-10-12) stays canonical; this file agrees with it and covers every other context.

---

## Executive Summary

LotFoundry sounds like a calm studio presenting a model, not a bank approving a loan. The design system says so in those words, and every shipped surface follows it: short headlines that act as graphic objects, plain sentences, exact numbers with units, and a limit stated beside every claim. The product offers early-planning possibility for a backyard home. The voice never inflates that into a promise of permits, income or approval.

The distinctive move is **honesty as reassurance**. Where other brands hype, LotFoundry says what a thing is, what it is not, and what to do next: "Does this mean I can build? No." "This does not mean your payment failed." "You will not be charged twice." That plainness is the brand's credibility. A homeowner should finish reading feeling better informed and under no pressure. A builder should feel respected and not sold to.

Three reasons sit under every message, not one: a backyard home can be **for family, for income, or for what's next**. Income is one reason among three. The old income-only framing is retired.

---

## We Are / We Are Not

Voice is constant. It does not change by channel or audience.

| We Are | We Are Not |
|--------|------------|
| **Calm and precise**: steady sentences, exact figures with units | **Hyped or salesy**: exclamation marks, "excited", "game-changer" |
| **Estimate-honest**: every figure says what it is and where it came from | **Promising**: guaranteed income, permits, approvals, "you can build" |
| **Possibility-minded**: family, income, or what's next | **An investment pitch**: income-only, ROI-first, "passive income" |
| **Plainspoken**: "backyard home", short words, one idea per line | **Jargon-first**: code-speak to homeowners, acronyms without a definition |
| **Sourced and dated**: the code section, the agency, the date checked | **Vague or invented**: unsourced rules, made-up cost, rent or approval figures |
| **Respectful of the reader's choice**: equal options, clear prices, no surprises | **Pushy or manipulative**: dark patterns, buried prices, auto-sent outreach |
| **Restrained**: few words, each earning its place | **Decorative or aspirational**: "Unlock your property potential", "dream home" |

### Voice Attributes Detail

#### 1. Calm and precise
- **What it means**: A planner's register. Statements, not exclamations. Numbers carry the weight.
- **How it shows up**: Sentences of about 12 words. Fragments in threes ("A smaller footprint. A different roof. A little more room around the home."). Exact units: 16 ft, 4 ft, 750 sq ft. Money is typographic, not decorated.
- **What to avoid**: Exclamation marks (0 of 14 approved captions use one). "Excited", "thrilled", "amazing". Urgency devices.
- **Evidence**: design-system §1 "Mood: bright, calm, confident, tactile. Things settle; nothing bounces." Voice profile: "calm, precise, planner-like; exact numbers with units." Landing: "Place a backyard home. Compare the estimates. Plan your next questions."
- **Confidence**: High

#### 2. Estimate-honest
- **What it means**: Possibility, honestly bounded. Every estimate is labelled as one, and its limit sits next to it, not in a footer.
- **How it shows up**: The words "estimate", "concept", "scenario", "feasibility". Provenance on every financial figure (demo or real parcel). Every concept image labelled illustrative. A direct "No" when the honest answer is no.
- **What to avoid**: "Guaranteed", "approved", "you can build", any figure the model did not produce.
- **Evidence**: design-system §10 "Estimate-honest… Never imply guaranteed income or permit approval." Landing FAQ: "Does this mean I can build? No. LotFoundry helps you explore an early concept." Studio verdict band and layout email: "Early planning estimates, not permit approval or guaranteed income." llms.txt test enforces "not a permit, a quote, or an appraisal."
- **Confidence**: High

#### 3. Possibility-minded (three pillars)
- **What it means**: A backyard home serves a life, not only a spreadsheet.
- **How it shows up**: Questions that open the reader's own reason: "What would you make room for?" Copy that names family, income and future use with equal weight.
- **What to avoid**: Income-only framing, "passive income", "maximize ROI", treating rent as the point.
- **Evidence**: design-system §10 "Three pillars, not one… The old income-only mandate is retired." Landing: "Keep the people you love nearby, with a little more independence for everyone." / "A home for grown children, future plans, or the life you haven't quite imagined yet." San Diego cost guide: "whether it is for family, for rental income or for what comes next."
- **Confidence**: High

#### 4. Plainspoken
- **What it means**: Homeowner language first. Technical terms are defined once, then used.
- **How it shows up**: "Backyard home" or "small home" in body copy. "ADU" in titles, headings, hashtags, and zoning or permitting statements. First use defines it: "An accessory dwelling unit, or ADU, is a smaller home on the same property…"
- **What to avoid**: Unexplained acronyms (JADU, FHSZ, CDP) in homeowner copy, legalese, planner shorthand.
- **Evidence**: CLAUDE.md preference, design-system §10 vocabulary, voice profile "Calls it", landing FAQ definition.
- **Confidence**: High

#### 5. Sourced and dated
- **What it means**: A rule without a source and a date is not published.
- **How it shows up**: Code sections and agencies named (SDMC §141.0302, HCD ADU Handbook March 2026, Information Bulletin 501). "Rules as of" and "fees as of" dates. Fact posts end "Source: <agency/document>, checked <date>. Planning information, not legal advice." Facts are re-read from the live source when each piece is drafted.
- **What to avoid**: Rules stated as universal when the model uses defaults; carrying a fact forward from an old draft; rounding a code citation from memory.
- **Evidence**: Voice profile disclaimers; content calendar ("Facts are re-read from the live guide and its cited source when each post is drafted"); llms.txt tests ("dates every jurisdiction", "claims no more about setbacks than the code models"); the Oct 6 fire-zone caption fix.
- **Confidence**: High

#### 6. Respectful of the reader's choice
- **What it means**: The reader is never tricked, rushed or surprised. Prices are stated, choices carry equal weight, and anything sent in Andrew's name is sent by Andrew.
- **How it shows up**: "One-time purchase for this property. No subscription." Equal-weight Accept and Decline in the consent banner. "You requested this one-time layout email. You have not been subscribed to marketing." Builder outreach is founder-sent only, never automated.
- **What to avoid**: Pre-checked opt-ins, a bigger Accept than Decline, fake scarcity, hidden fees, auto-sent cold email.
- **Evidence**: Studio email copy (`lib/server/studio-scenario-email.ts`); design-system decisions log 2026-10-17 (equal-weight consent); builder pipeline "Zero Auto-Sending"; CLAUDE.md "Never route analytics around consent."
- **Confidence**: High

#### 7. Restrained
- **What it means**: The fewest words that carry the idea. Headlines short enough to behave as graphic objects.
- **How it shows up**: Two- to six-word headlines ("Small homes. Big possibility.", landing Seattle demo kicker), one idea per line, no filler adjectives, no icon or sentence explaining the obvious.
- **What to avoid**: "Unlock your property potential", stacked adjectives, paragraph-length headlines, decoration in words.
- **Evidence**: design-system §3.2 "Headlines are short enough to behave as graphic objects. Body copy stays conversational." §11 bans "Unlock your property potential" copy. Landing headlines throughout.
- **Confidence**: High

---

## Brand Personality

- **Archetype**: The Exhibiting Planner. A studio presenting a model: expert, unhurried, generous with what it knows, clear about what it does not.
- **If our brand were a person**: A licensed architect friend who walks your backyard with a tape measure, tells you what they see and what they would check, never promises the permit, and hands you a list of good questions for the builder.
- **Core values expressed in voice**: honesty about limits, respect for the homeowner's own reasons, precision, privacy, and restraint.

---

## Messaging Framework (Confidence: Medium)

*Why Medium: the messages are documented and used consistently across the landing, Studio and social, but there is no performance data yet to show which ones work (28-day search: 3 clicks; social results not read).*

### Primary Value Proposition
**See what a backyard home could look like on your own lot, with early cost, rent and payback estimates, before you pay for plans.**

Variations observed:
- "Explore an ADU on your lot in 3D." (landing H1, Andrew's decision 2026-10-17)
- "Check your lot before you pay for plans." (social campaign, Oct 3)
- "Start with the lot. Then choose the plan." (social campaign, Oct 7)
- "LotFoundry helps homeowners see ADU rent, build cost, and payback estimates for the land they already own." (`/about`)

### Key Message Pillars

1. **Start with your lot**
   - Core idea: Your real parcel, in 3D, comes before any plan or quote.
   - When to use: Hero copy, offer posts, first-touch content.
   - Example phrasing: "Start with the lot. Then choose the plan." / "One backyard. More than one possibility."

2. **For family, for income, for what's next**
   - Core idea: A backyard home serves the reader's own reason.
   - When to use: Engagement questions, landing narrative, guide intros.
   - Example phrasing: "What would you make room for?" / "Keep the people you love nearby, with a little more independence for everyone."

3. **Honest early numbers**
   - Core idea: Cost, rent and payback as labelled estimates with their basis shown.
   - When to use: Studio, Certificate, cost pages, proof posts.
   - Example phrasing: "Compare the estimates." / "Rent uses San Diego County's HUD Fair Market Rent… compare it with site-specific quotes before you set a budget."

4. **Better questions for your designer or builder**
   - Core idea: LotFoundry prepares the homeowner; it does not replace the professional.
   - When to use: Certificate copy, builder-facing copy, CTAs near the end of a page.
   - Example phrasing: "Spot questions before requesting quotes." / "Give builders the same brief." / "bring better questions to your designer or builder"

5. **Your first address is free; pay once if the Certificate is useful**
   - Core idea: Low-friction entry with a clear, single price.
   - When to use: CTAs and offer posts.
   - Example phrasing: "Your first address is free to explore. No account needed." (voice profile) / "One-time purchase for this property. No subscription." (layout email)

### Competitive Positioning
- **vs. the status quo (paying for plans first)**: Check the lot, size, roof and placement before paying a designer, so the paid conversation starts from better questions.
- **vs. builder-run feasibility**: Independent estimates and one brief every builder can quote against ("so two quotes cover the same scope").
- **Competitors by name**: not named in public copy or partner decks (inferred from Andrew removing a competitor from the GreatBuildz deck; see Open Question 8).

---

## Tone-by-Context Matrix (Confidence: Medium)

*Why Medium: social captions and builder outreach have explicit written guidance; the other contexts are inferred from three or more shipped examples each; partner proposals rest on a single deck.*

Voice is constant. Tone flexes along three dimensions.

| Context | Formality | Energy | Technical Depth | Key Principle | Example (source) |
|---------|-----------|--------|-----------------|---------------|------------------|
| Landing and marketing pages | Medium | Medium, warm | Low | Headlines as objects; one idea per line | "Explore an ADU on your lot in 3D." (landing H1) |
| Social captions (brand account) | Medium-Low | Medium | Low, one exact fact | Headline first, one fact, "first address free" CTA, disclaimer last | "One backyard. More than one possibility." (X, Oct 11) |
| City guides and cost pages | Medium-High | Low | High | Cite the section, date the rule, say what the model covers | "There is no single permit price per square foot for every ADU." (San Diego cost guide) |
| Studio and Certificate UI | Medium | Low | Medium | Label the action; show provenance beside the number | "Continue to secure checkout" (CertificatePanel) |
| Errors, payments, transactional email | Medium | Low, steady | Low | What happened, what it does not mean, what to do next | "We could not verify Certificate access yet. This does not mean your payment failed." (CertificatePanel) |
| Consent and privacy | Medium | Low | Low | Ask plainly, name the third party, say what is not shared, equal choices | "Allow Google Analytics and Google Ads cookies to measure how people find us? Google never gets your address or results." (consent banner) |
| Builder outreach (cold, founder-sent) | Medium-Low, first person | Medium | Medium | Ask for a critique, not a sale | No shipped example; see illustrative opener below |
| Partner proposals and decks | Medium-High | Medium | Medium-High | Explore together; no SLAs, exclusivity or lock-in | GreatBuildz slides 7–8: "strict opt-in, independent estimates, transparent disclosures with no lock-in" (vault) |
| Founder voice (Andrew's name) | Low, first person | Medium-High | Low | Andrew's own words; agents draft placeholders only | Kickstarter story opens on a personal backyard anecdote (vault) |
| Machine-read text (llms.txt, meta descriptions) | High | Low | High | Literal, dated, priced, limits verbatim | "not a permit, a quote, or an appraisal" (llms.txt) |

### Context-Specific Guidelines

#### Social Media (brand account)
- **Overall tone**: Calm, useful, a little warm. One fact or one question per post.
- **Opening approach**: No greeting. The first line is the headline, a short statement or question.
- **Do's**: Exact numbers with units and the code section cited. CTA in the second-to-last paragraph ("Your first address is free to explore. No account needed."). "→" before a link, "•" for bullets. Hashtags: Instagram 4–7, Facebook 2–3, X 0–1. On Instagram write "Start at lotfoundry.net" (the account has no bio link).
- **Don'ts**: Exclamation marks, emoji, "dream", "unlock", "excited", invented figures, "Lot Foundry" as two words in captions.
- **Every post ends with**: "Early planning estimates, not a permit, survey or builder quote." Fact posts add "Source: <agency/document>, checked <date>. Planning information, not legal advice."
- **Example**: "Taller isn't automatically bigger." (voice profile characteristic phrase)

#### City Guides and Cost Pages (SEO)
- **Overall tone**: A careful explainer. More formal, still plain.
- **Opening approach**: State what the page prices or covers and for which kind of project, then the basis of the numbers.
- **Do's**: Name the code section and edition. Show "rules as of" and "fees as of" dates. Separate what the model covers from what it does not ("The model does not price conversions."). Tell the reader what to ask for ("request an itemized assessment").
- **Don'ts**: Present defaults as local rules. Restate an ordinance from memory. Promise a fee or a timeline.
- **Example**: "Ask the builder to separate the costs below and to mark which items are allowances and which are excluded, so two quotes cover the same scope." (San Diego cost guide)

#### Product UI, Errors and Transactional Messages
- **Overall tone**: Steady and specific. The reader may be mid-payment or worried.
- **Pattern**: What happened → what it does not mean → what to do next.
- **Do's**: Name the system involved when it helps ("Stripe has your payment…"). Reassure with facts ("You will not be charged twice."). Buttons say the action ("Continue to secure checkout", "Open Your 3D Lot Layout").
- **Don'ts**: A bare "Something went wrong" where a cause is known; blame ("You entered an invalid…"); jokes in error states.
- **Example**: "Stripe has your payment, but the credits have not reached your dashboard yet. Refresh in a minute. You will not be charged again." (BuilderDashboard)

#### Builder Outreach (cold, founder-sent)
- **Overall tone**: A humble founder asking a respected builder for a two-minute critique of an early planning aid.
- **Opening approach**: Name something specific about their work, then the ask. No pitch, no pricing in the first touch.
- **Do's**: First person, short, one link to a demo lot, an easy out. Andrew reviews and sends every message himself.
- **Don'ts**: Automated sends, guessed email addresses, claims that LotFoundry replaces their feasibility work, lead-volume promises.
- **Illustrative opener** (not from a source; Andrew should rewrite it in his own words): "I'm building an early planning tool for homeowners in San Diego, and I'd value two minutes of your critique against what you see on real lots."

#### Partner Proposals and Decks
- **Overall tone**: Exploratory and precise. Peers comparing notes, not a vendor closing.
- **Do's**: Frame pilots as low-friction exploration. Say opt-in, independent estimates and transparent disclosures. Check every claim about the partner against their own site.
- **Don'ts**: SLAs, exclusivity, automatic next steps, endorsement language, naming competitors.
- **Example**: GreatBuildz pilot slides 7–8 (local deck, revised 2026-10-22).

---

## Terminology Guide (Confidence: High)

### Must-Use Terms
| Term | Usage | Instead Of | Example |
|------|-------|------------|---------|
| LotFoundry | Always one word in product, site and caption copy | "Lot Foundry", "Lotfoundry" | "Start at lotfoundry.net" / "LotFoundry helps you explore an early concept." |
| backyard home / small home | Homeowner-facing body copy | "ADU" in narrative sentences | "Place a backyard home." |
| ADU | Titles, headings, meta, hashtags, zoning and permit statements; define on first use | "granny flat", "in-law unit" in titles | "Explore an ADU on your lot in 3D." |
| estimate / concept / scenario / feasibility | Any figure or image the model produces | "projection", "guarantee", "quote" | "Early planning estimates" |
| Certificate of Feasibility | Full product name of the $29 report | "report", "certificate" in marketing headlines | "Your $29 Certificate of Feasibility includes build-cost allowances…" (layout email) |
| supported markets / local rules | Geography-neutral copy | "everywhere", "all of California" | "Available parcel and market detail varies by location." |

### Preferred Terms
| Term | Usage | Example |
|------|-------|---------|
| your lot / your first address | Second person, concrete | "Your first address is free to explore." |
| the Studio / 3D studio | The feasibility workspace | "Explore in the studio" |
| early planning estimates | Standard qualifier | "Early planning estimates, not a permit, survey or builder quote." |
| worth exploring | Soft, honest invitation | "A detached unit may be worth exploring." (illustrative; phrase from the voice profile) |
| before you pay for plans | Timing hook | "Check your lot before you pay for plans." |
| illustrative / concept | Labels on artwork | "ILLUSTRATIVE CONCEPT · SCALE 1:100" |
| one-time purchase / no subscription | Pricing clarity | "One-time purchase for this property. No subscription." (layout email) |

### Avoid These Terms
| Term | Reason | Alternative |
|------|--------|-------------|
| passive income / ROI-first framing | Income is one pillar of three | "rental potential", "what a small home could earn" |
| free (unqualified) | The Certificate costs $29 | "Your first address is free", "free account", "demo lots are always open" |
| "Please" in every error | Reads as filler when repeated | State the next step directly |
| real setbacks (outside California) | The model uses defaults there | "modeled setbacks" |
| unlock (homeowner-facing) | Conflicts with the social ban; see Open Question 1 | "Get your Certificate", "includes" |

### Never-Use Terms
| Term | Reason |
|------|--------|
| guaranteed / approved / "you can build" | Implies permit approval or certain income |
| Unlock your property potential (and similar aspiration) | Named anti-pattern in design-system §11 |
| dream / dream home | Inflates a planning aid into a promise |
| excited / thrilled / game-changer | Hype register |
| ! (exclamation mark) | 0 of 14 approved captions; hype register |
| emoji | Not part of the brand register ("→" and "•" are the only symbols) |
| invented cost, rent or approval figures | Every figure must come from the model or a cited source |

---

## Language Patterns (Confidence: Low)

*Why Low: there are no call transcripts and no per-message performance data. These patterns come from published copy only, so they show what the brand says, not what works best.*

### Signature Phrases (from published copy, not transcripts)
- "before you pay for plans"
- "worth exploring"
- "bring better questions to your designer or builder"
- "Taller isn't automatically bigger."
- "What would you make room for?"
- "Save this for…"
- "One backyard. More than one possibility."

### Copy Anti-Patterns (bad examples are illustrative, written for this guide)
1. **Promise phrasing**: "Find out if you can build an ADU." Problem: implies a verdict the product cannot give. Better: "See what could fit on your lot, and what to confirm locally."
2. **Income as the point**: "Turn your backyard into passive income." Problem: one pillar presented as the whole story, and income implied as certain. Better: "Explore what a small home could earn, and what it might take to bring it to life." (landing)
3. **Buried limit**: a figure in the body with the caveat only in the footer. Better: the limit sits beside the figure.
4. **Unscoped free**: "Free ADU feasibility report." Problem: the report is $29. Better: "Your first address is free to explore. No account needed."

---

## Content Examples

### Excellent Examples

**Social post (X, Oct 11, 2026, verbatim from the voice profile)**
```
One backyard. More than one possibility.

Compare size, roof and placement in 3D, with early cost and rental estimates.

First address free. No account needed:
https://lotfoundry.net/?utm_source=x&utm_medium=organic_social&utm_campaign=one_backyard_20261011

Concepts, not permits or builder quotes.
```
*Why it works*: The headline is a statement. One sentence of value with three concrete controls. "Free" is scoped to the first address. The limit is the last line. No exclamation, no emoji.
*Note*: Its last line is the short disclaimer variant. New posts use the canonical line once Open Question 3 is settled.

**FAQ answer (landing)**
> Does this mean I can build?
> No. LotFoundry helps you explore an early concept. It does not grant a permit or guarantee a buildable design. A local professional and your jurisdiction must confirm property conditions and applicable requirements.

*Why it works*: The honest answer comes first, in one word. Then what the product does, what it does not, and who decides.

**Payment-delay message (builder dashboard)**
> Stripe has your payment, but the unlock has not reached your dashboard yet. Refresh in a minute, or select Unlock on the lead again. You will not be charged twice.

*Why it works*: What happened, what to do, and the reassurance the reader actually needs, all in plain facts. (This is the lead-unlock variant. The credit-purchase variant, quoted under Product UI above, ends "You will not be charged again." Both are correct for their flows.)

### Example to Avoid (constructed for illustration)
> Unlock your backyard's potential! Find out in minutes if you can build a dream ADU and start earning passive income. Get your FREE feasibility report today!

*What's off-brand*: Exclamation marks, "unlock … potential" (a named anti-pattern), "dream", a buildability promise, income-only framing, unscoped "FREE" when the report costs $29, urgency ("today").
*On-brand rewrite*:
> What would you make room for?
> See a backyard home on your own lot in 3D, with early cost and rent estimates.
> Your first address is free to explore. No account needed.
> Early planning estimates, not a permit, survey or builder quote.

---

## Confidence Scores

| Section | Confidence | Basis | Sources |
|---------|------------|-------|---------|
| Voice Attributes | High | Explicit in design-system §1, §10 and §11 and in the confirmed voice profile; shown in shipped landing, Studio, email and guide copy | 8 |
| Messaging Framework | Medium | Documented and used consistently, but no performance data shows which messages convert | 6 |
| Tone Matrix | Medium | Explicit guidance for social and outreach; other contexts inferred from 3+ shipped examples each; partner proposals from one deck | 9 |
| Terminology | High | Explicit lists in CLAUDE.md, design-system §10, the voice profile and the glossary; one open conflict ("unlock") | 5 |
| Language Patterns | Low | No call transcripts; patterns come from published copy only, without outcome data | 3 |
| Brand Personality | Medium (not weighted) | Archetype inferred from design-system §1 ("a studio presenting a model") and the attributes above | 2 |
| Content Examples | High (not weighted) | Excellent examples are verbatim shipped or published copy; the off-brand example is labelled as constructed | 3 |
| Executive Summary | N/A | A synthesis of the scored sections | n/a |

Aggregate: 0.30 + 0.15 + 0.12 + 0.15 + 0.03 = **0.75, Medium**. Bands: High 0.85–1.0, Medium 0.60–0.84, Low below 0.60. Recording two or three builder or partner calls, and reading social and Search Console results per message, would raise Messaging and Language Patterns.

---

## Open Questions for Team Discussion

### High Priority (blocks guideline completion)
1. **Is "unlock" allowed in product copy?**
   - What was found: The voice profile bans "unlock" and design-system §11 bans "Unlock your property potential". Shipped UI uses it as an access verb. Homeowner-facing: "Unlock property certificate", "Certificate unlocked" and "One-time purchase · No subscription · Unlocks this property permanently" (CertificatePanel), "Unlocked" (CertificatesClient), and the layout email's "does not unlock the paid analysis". Builder-facing: lead "Unlock" (BuilderDashboard, BuilderInbox) and "Total Unlocks" (BillingLedger).
   - Agent recommendation: Ban it in all marketing, social and aspirational copy. Allow it only as the literal name of the builder lead-credit transaction ("Unlock lead", "Unlocked"), where builders already understand it. On homeowner surfaces, use "Get your Certificate" / "Certificate purchased", "Covers this property permanently" and "does not include the paid analysis".
   - Need from you: Confirm or override. If confirmed, the homeowner strings above get a small copy PR.

### Medium Priority (improves quality)
2. **How "free" is scoped**
   - What was found: The `/about` title says "Free ADU Feasibility Check" while the Certificate is $29. Elsewhere "free" is scoped: "Your first address is free", "free account", demo lots "always open". The llms.txt test exists so assistants do not call the product free-only.
   - Agent recommendation: Always attach "free" to the specific thing that is free. Retitle `/about` to something like "About LotFoundry: Explore an ADU on Your Lot in 3D", or keep "Free" only as "Free First Lot Check".
   - Need from you: Pick the `/about` title. It is an SEO surface, so a CTR test is reasonable.

3. **One canonical disclaimer line**
   - What was found: Five variants: "Early planning estimates, not a permit, survey or builder quote." (social) · "Early planning estimates, not permit approval or guaranteed income." (Studio) · "Concepts, not permits or builder quotes." (X) · "Planning estimates only." (landing footer) · "not a permit, a quote, or an appraisal" (llms.txt).
   - Agent recommendation: Long form everywhere there is room: "Early planning estimates, not a permit, survey or builder quote." Surfaces that show income or payback add: "Income figures are estimates, not guarantees." Short form for tight UI: "Planning estimates, not permits or quotes." Keep llms.txt as is; it is tested and machine-read.
   - Need from you: Confirm the three strings.

4. **Founder voice**
   - What was found: Anything in Andrew's name must use his own words (voice profile). The only long first-person sample is the Kickstarter story, which is constrained by Kickstarter's rules. The Nov 6 founder post is blocked on this.
   - Agent recommendation: Paste 3–5 things you have written yourself (emails, posts, notes) and a sub-profile for "Andrew, founder" gets added beside the brand voice. Until then, agents draft clearly marked placeholders only.
   - Need from you: The samples, or a decision that founder posts stay fully hand-written.

### Low Priority (nice to have)
5. **"ADU" in body copy**
   - What was found: The rule is "ADU" in titles and "backyard home" in body copy, but `/about` body copy and the guides use "ADU" in running text.
   - Agent recommendation: Guides keep "ADU" wherever they state a rule or quote a code (design-system §10 reserves "ADU" for zoning and permitting). Narrative homeowner copy, `/about` included, uses "backyard home".
   - Need from you: Confirm.

6. **"Lot Foundry" on social profiles**
   - What was found: Copy uses "LotFoundry". The Facebook Page and YouTube display names read "Lot Foundry", and the legal record is "VeriShare, DBA Lot Foundry".
   - Agent recommendation: Keep "LotFoundry" in all copy. Use "VeriShare (DBA Lot Foundry)" only for KYC, tax and banking. Rename social display names to "LotFoundry" when convenient, and keep "Lot Foundry" as a search alias in llms.txt.
   - Need from you: Whether to rename the profiles.

7. **Product-name capitalization**
   - What was found: The landing writes "the studio" in lowercase; the voice profile writes "the Studio". CertificatePanel mixes "Certificate access" and "certificate access".
   - Agent recommendation: Capitalize "Studio" and "Certificate" when they name the product; lowercase in generic use ("a certificate of occupancy").
   - Need from you: Confirm.

8. **Naming competitors**
   - What was found: A competitor was removed from the GreatBuildz deck at your request. No written rule exists.
   - Agent recommendation: Never name competitors in public copy, decks or outreach; position against the status quo (paying for plans first).
   - Need from you: Confirm, or say where naming is acceptable (for example, internal analysis only).

---

## Data Gaps & Recommendations

- [ ] **No call transcripts**: Record or transcribe two or three builder and partner calls (Gong or Granola need connecting via `/mcp`) to ground the outreach and proposal tones.
- [ ] **No performance data per message**: Read Metricool engagement and Search Console CTR by message to tell which pillar earns attention.
- [ ] **No founder-voice samples**: See Open Question 4.
- [ ] **No support-reply samples**: Five or so sent replies from support@lotfoundry.net would define the customer-support tone.
- [ ] **No email marketing voice**: There is no list or ESP yet. Define it when the first newsletter is planned.

---

## Appendix: Sources

| # | Source | Platform | Type | Date | Key Sections Used | Confidence |
|---|--------|----------|------|------|-------------------|------------|
| 1 | `docs/design/design-system.md` §1, §3.2, §8, §10, §11, decisions log | Repo | AUTHORITATIVE | 2026-09-05, updated through 2026-10-17 | Voice, anti-patterns, three pillars, vocabulary | High |
| 2 | `LotFoundry/memory/voice-profile.md` | Local memory | AUTHORITATIVE (confirmed by Andrew) | 2026-10-12 | Social register, never-use list, disclaimers, phrases | High |
| 3 | `CLAUDE.md` (YardUp + LotFoundry workspace) | Repo | AUTHORITATIVE | current | "ADU" vs "backyard home", consent rule, names | High |
| 4 | `LotFoundry/memory/glossary.md` | Local memory | REFERENCE | current | Names and spellings | High |
| 5 | `LotFoundry/content-calendar.md` | Local | OPERATIONAL | 2026-10-12 | Published campaign headlines, fact-checking practice | Medium |
| 6 | `components/landing/lot-more/LotMoreLanding.tsx` | Repo | SHIPPED COPY | 2026-10-26 | Headlines, pillars, FAQ, CTAs | High |
| 7 | Studio, Certificate, builder dashboard and consent components | Repo | SHIPPED COPY | 2026-10-26 | Microcopy, errors, payment states, consent | High |
| 8 | `lib/server/studio-scenario-email.ts` | Repo | SHIPPED COPY | 2026-10-26 | Transactional email, offer and disclosure | High |
| 9 | `content/adu/ca/san-diego-cost.ts` | Repo | SHIPPED COPY | 2026-10-26 | Guide register, citations, scope statements | High |
| 10 | `app/llms.txt/build-text.ts` and tests | Repo | SHIPPED COPY | 2026-10-26 | Machine-read register, tested limitations | High |
| 11 | Vault: `lotfoundry-builder-pipeline`, `lotfoundry-greatbuildz-strategic-deck` (index) | Obsidian | OPERATIONAL | 2026-10-22 to 10-26 | Outreach tone, partner framing | Medium |
| 12 | Vault: `lotfoundry-kickstarter-campaign` | Obsidian | OPERATIONAL | 2026-09-11 | Founder first-person voice | Low |

Consulted, not used for rules: `brand/cadastral-lyric.md`, a visual philosophy for the brand plate render. Its serif, monospace and sepia palette conflict with A LOT MORE, and `docs/design/README.md` gives design authority only to `docs/design/`. Its restraint ("does this earn its place?") agrees with attribute 7.

No customer names, addresses or contact details appear in this document.
