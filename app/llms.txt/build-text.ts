import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  methodologyUrl,
  stateCostUrl,
  STATE_BASELINE_AS_OF,
} from "@/lib/adu/content";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { landingDemos } from "@/lib/landing-demo";
import { DIRECTORY_LINKS, SOCIAL_LINKS } from "@/lib/social-links";
import type { JurisdictionContent, JurisdictionCostContent } from "@/lib/adu/types";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

const baseUrl = CANONICAL_ORIGIN;

/** The web (Stripe) price, read from the constant checkout bills, so this file cannot quote a stale one. */
function webCertificatePrice(): string {
  const dollars = CERTIFICATE_PRICE_CENTS / 100;
  return `USD ${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

/** One line per demo lot, from the same registry the landing pages use. */
function demoLines(): string {
  return Object.values(landingDemos)
    .map((demo) => `  - [${demo.name}, ${demo.city}](${baseUrl}/studio?parcel=${demo.parcelId})`)
    .join("\n");
}

/**
 * One jurisdiction line: the city's own reviewed meta description, or the
 * same composition `buildCityMetadata` falls back to.
 *
 * Deliberately reuses published copy rather than restating rules. Every
 * ordinance fact on this site is graded (`primary`/`secondary`/`unverified`)
 * and carries an as-of date; paraphrasing one here would produce an ungraded
 * copy of a legal claim with no source behind it, which is exactly what
 * `lib/adu/types.ts` warns against. The `asOf` date rides along so a model
 * quoting this file can say how current the rules are.
 */
function cityLine(content: JurisdictionContent): string {
  const summary =
    content.metaDescription ??
    `${content.city} allows detached ADUs ${content.metaSizeNote} with ${content.metaSetbackNote} and ${content.metaParkingNote}.`;
  return `- [${content.city}, ${content.stateName}](${cityUrl(content)}): ${summary} (rules as of ${content.asOf})`;
}

/** One cost-page line, reusing the page's reviewed meta description. */
function costLine(cost: JurisdictionCostContent): string {
  return `- [${cost.h1}](${costPageUrl(cost)}): ${cost.metaDescription} (fees as of ${cost.asOf})`;
}

/**
 * Render `/llms.txt` — the plain-language summary AI search assistants read
 * when deciding what a site is and what it can answer.
 *
 * Generated from `ADU_CITIES` rather than hand-maintained, for the same
 * reason `sitemap-adu.xml` is: a new jurisdiction module should appear here
 * the moment it ships, and a stale hand-written list is worse than none.
 *
 * "What the studio uses for a lot" must stay no stronger than the code: county
 * and statewide GIS only where `lib/server/county-parcels.ts` has a source.
 * Live-record setback defaults, demo/fallback preset setbacks, and California
 * rules differ; an assistant repeats this file to homeowners as fact.
 */
export function buildLlmsTxt(): string {
  const cities = [...ADU_CITIES.map(cityLine), ...ADU_COST_PAGES.map(costLine)].join("\n");
  const price = webCertificatePrice();

  return `# LotFoundry

> ADU (accessory dwelling unit) feasibility tool for homeowners. Enter a US
> address to see the lot, place a backyard home on it in 3D, and get estimated
> build cost, rent, and payback. Exploring is free. A Certificate of
> Feasibility for one property is a one-time ${price} purchase.

LotFoundry answers "can I build an ADU on my lot, and is it worth it?" before
you pay for plans or a feasibility study. The first address lookup requires no
account.

It is a planning aid, not a permit, a quote, or an appraisal. Ordinance facts on
the jurisdiction guides are cited to primary municipal code and carry the date
they were verified; cost and rent figures are regional estimates. Anything that
would be costly to get wrong should be confirmed with the jurisdiction and a
licensed builder.

## What the studio uses for a lot

- Parcel boundary: public county or statewide GIS records where they are
  published. Signed-in lookups can also use a commercial nationwide parcel
  dataset. Where no parcel record is found, the studio falls back to estimated
  lot dimensions and says so.
- ADU side and rear setbacks: California's 4 ft cap statewide, and the City of
  San Diego's own ADU rules, including High and Very High fire hazard zones.
  Outside California, side and rear setbacks come from the parcel; the front
  setback always comes from the parcel. Live parcel records without zoning
  setbacks use rough defaults (20 ft front, 20 ft rear, 5 ft side). Demo and
  no-record fallback parcels use their preset-specific setbacks instead (for
  example, Portland 18/20/6 ft and Austin 15/15/5 ft). These modeled values
  need local confirmation.
- Build cost, rent, and payback: regional estimates, with the assumptions shown.
  The formulas and data sources are published at ${methodologyUrl()}.

## Pricing

- Free: 3D layout exploration and an estimated monthly rent range. The first
  address needs no account; a free account looks up more.
- Certificate of Feasibility: ${price} one-time on the web, for one property.
  Build costs, net income, payback, financing scenarios, a fee and permit audit
  for its size, and a bid-leveling checklist for three builders. In the Android
  app it is bought through Google Play.
- [Sample certificate](${baseUrl}/sample-certificate/san-diego): a complete example for a fictional San Diego lot.

## Jurisdiction guides

State law baseline verified ${STATE_BASELINE_AS_OF}.

- [California ADU rules](${hubUrl()}): the state floor every California city builds on, and how the five largest San Diego County cities differ from it.
- [California ADU cost guide](${stateCostUrl()}): modeled build cost by unit size, cost-per-square-foot context, permit-fee rules, scope exclusions, and contractor quote guidance.
${cities}

## Tools

- [Feasibility studio](${baseUrl}/studio): place an ADU against modeled setbacks in 3D and see cost, rent, and payback.
- [California ADU cost calculator](${calculatorUrl()}): estimated build cost, monthly rent, and payback by unit size for Los Angeles, San Diego, and Santa Clara counties.
- Demo lots (illustrative sample parcels), open with no address and no account:
${demoLines()}
- [Android app](${GOOGLE_PLAY_URL})

## Profiles

- [YouTube](${SOCIAL_LINKS.youtube})
- [Instagram](${SOCIAL_LINKS.instagram})
- [Facebook](${SOCIAL_LINKS.facebook})
- [X](${SOCIAL_LINKS.x})
- [Crunchbase](${DIRECTORY_LINKS.crunchbase})

## Reference

- [How it works](${baseUrl}/about)
- [Help](${baseUrl}/help)
- [Feedback and contact](${baseUrl}/feedback)
- [Privacy policy](${baseUrl}/privacy)
- [Terms](${baseUrl}/terms)

## Contact

- Support: support@lotfoundry.net
- Privacy requests: privacy@lotfoundry.net

## About

LotFoundry is operated by VeriShare. The name is also written "Lot Foundry" (two words) on its social profiles.
`;
}
