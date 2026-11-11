# Competitor analysis: a-du.homes vs lotfoundry.net

Date: 2026-11-10. Method: both sites rendered in headless Chromium (25 pages each, desktop 1440px and
mobile 390px), sitemaps, robots.txt and llms.txt pulled, and the address-to-result flow run on both
sites with the same Los Angeles addresses. Every claim below about A-du comes from its own pages as
captured that day. Treat its fee and coverage figures as of that date.

## TL;DR

- **A-du isn't really a feasibility tool. It's an ADU lifecycle marketplace** (Rent, Manage, Build,
  Services, Insights), LA-first, founded by a licensed architect (Chris Koss, AIA). It makes money from
  3% of rent collected, 3% of plan sales, $40 screening reports and a $5,000 permitting service the
  founder sells personally. Feasibility is only the top of its funnel.
- **It overlaps us in one place: "test fit a plan on my lot."** Its own llms.txt says the test fit is
  a *request*, which the founder or a design firm performs by hand and follows up on. Ours is instant,
  self-serve, in 3D, and free for the first address. That's our strongest edge, and today our marketing
  never says so.
- **It's beating us on organic reach and trust signals.** It has about 600 sitemap URLs to our 29,
  including 269 plan pages, 166 posts, 44 ZIP-level rent pages, 21 LA neighborhood pages, a primary-data
  "LA ADU Index", a press kit with embeddable charts, Spanish pages, 14 "A-du vs X" pages, a named,
  license-verifiable author, and robots.txt that welcomes AI crawlers.
- **Its product is fragile.** In two separate runs the Build marketplace showed "Failed to load build
  listings · 0 designs" (see the caveat under §4). Plan pages didn't hydrate in headless Chromium. A
  modal tour opens on most pages, the Services directory is mostly unclaimed scraped listings, and card
  payments are "coming soon".
- **How we win:** own "instant, honest feasibility for any US lot", which A-du structurally can't match
  outside its four markets or without a human in the loop. Then close the content and trust gap with
  data pages generated from what we already compute. Don't chase its rental, leasing or payments
  business.

## 1. What A-du is

| | A-du (a-du.homes) |
|---|---|
| Positioning | "Homes for rent, tools for landlords and pre-approved ADU plans, all in one place." |
| Homepage | No hero, no address box. Three cards (Rent / Manage / Build) under the headline "What would you like to do?" |
| Coverage | Rentals: LA County, San Francisco, San Diego County, NYC. Plan catalog: 100+ plan sets across CA plus NYC. Test fit: LA, Orange, Riverside, San Diego, Sacramento, San Joaquin, Alameda, Santa Clara and Solano counties, SF, San Ramon, NYC |
| Build | Pre-approved plan marketplace (LADBS Standard Plans, county catalogs, firm designs). Each plan page has a build-cost range, a permit-fee estimate, a rent estimate, a financing illustration and a "Test fit on my property" request |
| Free tools | LA permit-fee calculator (12 jurisdictions, line items with code citations), SF and NYC permit-fee calculators, ZIP-level ADU rent estimator (LA County, median and IQR), LA ADU Index, cost reports for LA and the Bay Area |
| Rent / Manage | Rental marketplace for permitted-and-finaled units only (permit number shown), Stripe Identity for renters, RentPrep screening, Anvil e-sign leases (its own CA-1 form), Stripe Connect rent collection, maintenance |
| Marketplaces | Services directory (early access, mostly unclaimed public listings), property manager marketplace, plan vendor dashboard |
| Builders | "Partner Builder Program": free address-specific rent projection for builder proposals, human-reviewed; concierge listing hand-off; no referral fees either way |
| Pricing | Listing free; "Founding 15" listings pay 0% forever, then 3% of rent collected; tenants pay $0 by ACH, 2.99% by card (coming soon); $40 per screening, paid by the landlord; plans free or designer-priced (3% from the seller); permitting $5,000 flat by the founder personally |
| Trust | Founder named with license number and a link to verify it, "corrections" policy, last-updated dates, primary-source citations, Fair Housing and FCRA pages |
| SEO / AI | ~600 sitemap URLs updated daily, llms.txt (13.7 KB) and llms-full.txt (517 KB), /listings.json feed, robots.txt explicitly allowing GPTBot, ClaudeBot, PerplexityBot and others, Spanish (/es) |
| Stack signals | SPA with prerendered HTML, Supabase backend, Google Maps/Places, GTM |

## 2. Side by side

| Dimension | A-du | LotFoundry | Edge |
|---|---|---|---|
| Time to a lot-specific answer | Plan page, then request a test fit, then wait for a human | Address, then instant 3D parcel, fit check, rent, cost and payback (~10 s observed) | **Us, by a lot** |
| Geographic reach | 4 rental markets; test fit in ~11 CA counties plus NYC | Free county/statewide GIS in WA, OR, TX, 14 CA counties, NY, OH, WI, FL, VT, NV; demo fallback elsewhere | **Us** |
| 3D / visualization | 2D site plan plus "3D massing" claimed; renders are static marketing images | Live 3D parcel, house, ADU, setbacks, clearances, sun angle, neighborhood, aerial and terrain views | **Us** |
| Plan library | 100+ real pre-approved plan sets, priced | None (generic size/roof/finish configurator) | **A-du** |
| Permit fees | Line-item calculators with code citations (LA x12, SF, NYC) | "Fee and permit audit" inside the $29 certificate; 18% soft-cost allowance in the free calculator | **A-du** (free, cited) |
| Rent estimate | ZIP-level ADU rent median and IQR from its own permitted-ADU estimates (LA County) | County HUD FMR with +12% / +25% scenarios | **A-du** (more local) |
| Financing | One illustrative payment line on plan pages | HELOC vs construction-to-perm comparison and cash flow after the loan (certificate) | **Us** |
| Monetization clarity | Very explicit pricing page with worked examples | $29 certificate; builder lead unlocks | Tie; theirs is more detailed |
| Builders | Free rent report for proposals; plan listing | Paid lead-unlock marketplace with consented feasibility snapshots | Different models |
| After the build | Listing, screening, lease, rent collection | Nothing | A-du (not our game) |
| Content / SEO | ~600 URLs, primary-data reports, press kit, 14 comparison pages, Spanish | 29 URLs; strong San Diego County city guides; 4 metro landing pages missing from the sitemap | **A-du** |
| Trust / authority | Named licensed architect, license number, corrections policy | "VeriShare LLC, San Diego", named CEO, honest-estimate language | **A-du** |
| Visual design | Clean but generic (navy, serif display, rounded cards, stock-style renders) | Distinctive A LOT MORE system, cinematic hero, sample result above the fold | **Us** |
| Mobile first screen | Headline plus first card photo; no action until you scroll | Headline, address box and primary CTA all above the fold | **Us** |
| Reliability (observed) | Build listings failed to load twice; tours open on most pages; plan page didn't hydrate headless | All 25 pages 200; the lookup worked; one confusing failure state (§5) | **Us** |
| Page weight | ~90 requests per page on average (343 on /build) | ~33 per page | **Us** |

## 3. Where A-du is ahead of us

1. **Content volume and programmatic SEO.** 269 `/build/design/*` plan pages, 44 `/tools/adu-rent-estimator/{zip}`
   pages, 21 `/los-angeles/adu/{neighborhood}` pages, 166 blog posts, 14 `/compare/*` pages, Spanish
   versions of the top guides. Each long-tail query ("ADU rent 91335", "LADBS standard plan 2 bedroom")
   lands on a page with an answer and a CTA. Our sitemap lists 29 URLs, and `/seattle`, `/portland`,
   `/austin`, `/san-diego` and `/sample-certificate/*` aren't in either of our sitemaps.
2. **Primary-data authority.** The LA ADU Index and the press kit (36,597 LA ADU permits since 2020,
   16,424 finaled, median declared valuation by type, top ZIPs) are citable, reproducible and embeddable.
   They earn links and press, and they make AI assistants quote A-du. We already publish a San Diego
   permits-by-neighborhood page, but not as an index or a press asset.
3. **Free, cited permit-fee calculators.** This is the question homeowners ask after "will it fit".
   Each line item cites the municipal code. We keep fee detail behind the $29 paywall, which makes it
   invisible to search.
4. **Hyper-local rent.** ZIP-level medians with an IQR from ADU-specific data beat our county HUD FMR for
   credibility. Our own copy concedes "a larger footprint can raise cost without raising the modeled rent".
5. **Pre-approved plans as the unit of choice.** Homeowners think in plans ("which plan fits?") more than
   in dimensions. AB 1332 (Gov. Code 65852.27) pushes every CA jurisdiction to publish them, and A-du keeps
   the only statewide index.
6. **Personal, verifiable authority.** "Written by a CA-licensed architect, license #C 39677, check it
   here" and "we correct the page and update its date" is strong E-E-A-T for search and for nervous
   homeowners.
7. **An AI-answer strategy.** Its robots.txt opts in to every AI crawler, it publishes a 517 KB
   llms-full.txt and a JSON inventory feed, and it says "A-du wants assistants to know it." Our llms.txt is
   good, but we have no llms-full.txt.
8. **A builder value proposition that costs builders nothing.** The free rent-ready report for proposals
   is a cheap wedge into builders' sales process. Ours asks builders to pay per lead.
9. **A transparent pricing page.** It lists every fee with worked examples. We explain the $29
   certificate well on the homepage, but we have no `/pricing` page to rank or link to.

## 4. Where we're ahead, and where A-du is weak

- **Instant self-serve fit.** A-du's test fit depends on a person: "Chris Koss, AIA performs it personally
  and follows up", and for firm-listed plans "A-du does not guarantee a review." That doesn't scale and
  it's slow. Our fit is instant, explains itself ("clears the buildable envelope, about 15.7 ft from the
  modeled existing structure") and caveats itself honestly.
- **National reach.** We resolve real parcels in at least 10 states for free. A-du is CA plus NYC.
- **Financial depth.** Payback, net operating income, HELOC vs construction-to-perm, and cash after the
  loan payment. A-du gives one illustrative payment.
- **Design and the first screen.** Our hero gets to the action faster and has more character. A-du's
  homepage is a three-way chooser with no single job, and new visitors meet tour modals on most pages.
- **Reliability and weight.** About a third of A-du's request count per page. Caveat: we observed its
  "Failed to load build listings" and the failed plan-page hydration in headless Chromium only. It may
  block or degrade automated browsers, so confirm in a real browser before using either point in
  marketing.
- **Focus.** A-du spreads one founder across rentals, leasing compliance (FCRA, fair housing, CA-1
  lease), payments, three marketplaces, plans and content. Its Services directory says "Most businesses
  here haven't joined A-du yet." We can win on depth in the feasibility moment.

## 5. Issues found on our own site during the test

1. **The failed-lookup state is confusing.** For an address the free geocoders don't know, the Studio
   shows "Lookup failed" under the visitor's address, yet keeps "Demo Mode: Seattle, WA" and demo rent and
   payback numbers on screen. The visitor can't tell whose numbers they're seeing. Suggest a single clear
   empty state: "We couldn't find that address. Check it or try a nearby one", with the demo offered as a
   separate, labeled action.
2. **Guests get no autocomplete.** A-du's address field autocompletes for everyone. Ours is free text
   for guests, by design (every suggestion source is metered). Typos then turn into "lookup failed".
   Consider a low-cost guest typeahead, such as the Census/Nominatim-backed suggestions already in the
   server chain, behind a debounce and the guest rate limiter.
3. **The Studio URL may keep the demo parcel.** After a real lookup for a Van Nuys address, the URL still
   read `parcel=oak-street&...`. If someone copies that link, it may reopen the Oak Street demo. Verify
   against `lib/scenario-url.ts` before sharing links becomes a growth loop.
4. **Sitemap gaps.** The `/seattle`, `/portland`, `/austin` and `/san-diego` landing pages and
   `/sample-certificate/*` are crawlable but not listed. There's no `/llms-full.txt`.

## 6. Recommendations

Ordered by impact relative to effort. Each one builds on something the engine already computes.

### Now (1–2 weeks)

1. **Say the differentiator out loud.** Add hero and comparison copy that makes the instant fit explicit:
   "See if an ADU fits your lot in seconds, not days. No call, no form." Add a "LotFoundry vs. a test-fit
   request" explainer.
   *Metric:* address-submit rate on the landing page.
2. **Fix the failed-lookup state** (§5.1) and **verify the share-URL parcel bug** (§5.3), with a
   reproducing test first.
   *Metric:* lookups that end with the visitor still in Studio.
3. **Sitemap and AI hygiene.** Add the metro landing pages and the sample certificate to the sitemap,
   publish `/llms-full.txt` generated from the guide content, and decide deliberately on AI crawler
   policy in robots.txt (A-du's opt-in is worth matching for search and answer bots).
4. **Add a `/pricing` page.** Free vs the $29 certificate vs builder lead unlocks, with a worked example
   and a "what's never charged" list.

### Next (3–6 weeks)

5. **Programmatic local pages from our own engine.** Generate `/adu/{state}/{city}` and ZIP-level pages
   in the markets where we have free parcel coverage. Each shows the modeled cost band, the rent band
   (with its source), the state floor rules and an address box that opens Studio. Start with LA County
   ZIPs, where A-du ranks, and San Diego, where we're already deepest.
   *Metric:* indexed URLs, organic sessions, address submits from those pages.
6. **A free, cited permit-fee estimate.** Move a line-item fee estimate for our covered San Diego
   jurisdictions out of the paywall into a free calculator, with code citations, then extend to LA City
   and LA County. Keep the full audit and bid-leveling checklist in the certificate.
7. **Upgrade rent from county to local.** Layer ZIP-level rent (HUD Small Area FMR is free and
   ZIP-level) under the county figure, and show the source and range. Let rent scale with bedrooms so
   size changes move rent as well as cost.
8. **A San Diego ADU Index.** A primary-data report (permits by year, type, neighborhood, declared
   valuation) with CSV, embeddable charts, methodology and "cite with credit", mirroring how A-du owns LA.
   We already have the San Diego permit data page to build on.

### Later (quarter)

9. **Pre-approved plans in the 3D Studio.** Ingest public pre-approved plan catalogs (start with San
   Diego County PDS and the cities whose guides we already maintain) as footprints in the configurator:
   "Try County plan PDS-675 on your lot", instantly. That turns A-du's plan library and manual test fit
   into an instant, visual feature it can't match.
10. **A builder wedge.** Offer builders a free, branded feasibility snapshot for a prospect's address
    (from our engine, instant) as the on-ramp to paid lead unlocks.
11. **Named expertise.** Put a named, licensed reviewer (architect or planner) on the jurisdiction
    guides, add a corrections policy, and show "reviewed by / last verified" on each guide. Partner if
    there's no one in-house.
12. **Spanish** for the homepage, the calculator and the top San Diego and LA guides.

### Don't copy

- The rentals, leasing, screening and payments stack. It's a separate regulated business (FCRA, fair
  housing, money movement) that would dilute the feasibility focus.
- Scraped, unclaimed business directories. They read as filler and erode trust.
- First-visit modal tours on every page.

## 7. Caveats

- A-du was captured on a single day from a cloud browser. Load failures may be intermittent or specific
  to automated browsers.
- A-du's coverage, plan counts and fees are its own claims.
- Our recommendations assume current coverage in `lib/server/county-parcels.ts` and current pricing ($29
  certificate).
- The test address 18350 Kittridge St (Reseda) wasn't found by our free geocoders and appears not to
  exist. The successful run used 6000 Woodman Ave, Van Nuys.
