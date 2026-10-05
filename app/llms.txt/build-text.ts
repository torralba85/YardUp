import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  STATE_BASELINE_AS_OF,
} from "@/lib/adu/content";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { SOCIAL_LINKS } from "@/lib/social-links";
import type { JurisdictionContent, JurisdictionCostContent } from "@/lib/adu/types";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lotfoundry.net";

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
 */
export function buildLlmsTxt(): string {
  const cities = [...ADU_CITIES.map(cityLine), ...ADU_COST_PAGES.map(costLine)].join("\n");

  return `# LotFoundry

> Free ADU (accessory dwelling unit) feasibility tool. Enter a US address and
> see the real parcel boundary from county GIS records, the buildable area left
> after setbacks, a unit placed in 3D, and estimated build cost, rent, and
> payback.

LotFoundry answers "can I build an ADU on my lot, and is it worth it?" without a
paid feasibility report or a sales call. The first address lookup requires no
account.

It is a planning aid, not a permit, a quote, or an appraisal. Ordinance facts are
cited to primary municipal code and carry the date they were verified; cost and
rent figures are regional estimates. Anything that would be costly to get wrong
should be confirmed with the jurisdiction and a licensed builder.

## Jurisdiction guides

State law baseline verified ${STATE_BASELINE_AS_OF}.

- [California ADU rules](${hubUrl()}): the state floor every California city builds on, and how the five largest San Diego County cities differ from it.
${cities}

## Tools

- [Feasibility studio](${baseUrl}/studio): place an ADU against your real setbacks in 3D and see cost, rent, and payback.
- [California ADU cost calculator](${calculatorUrl()}): estimated build cost, monthly rent, and payback by unit size for Los Angeles, San Diego, and Santa Clara counties.
- [Demo lot](${baseUrl}/studio?parcel=oak-street): explore a sample Seattle parcel with no address and no account.
- [Android app](${GOOGLE_PLAY_URL})

## Profiles

- [YouTube](${SOCIAL_LINKS.youtube})
- [Instagram](${SOCIAL_LINKS.instagram})
- [Facebook](${SOCIAL_LINKS.facebook})
- [X](${SOCIAL_LINKS.x})

## Reference

- [How it works](${baseUrl}/about)
- [Help](${baseUrl}/help)
- [Feedback and contact](${baseUrl}/feedback)
- [Privacy policy](${baseUrl}/privacy)
- [Terms](${baseUrl}/terms)

## About

LotFoundry is operated by Veri-share.
`;
}
