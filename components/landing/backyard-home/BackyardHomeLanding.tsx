import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AduPlanningLinks } from "@/components/adu/AduPlanningLinks";
import { BackyardHomeQuiz } from "@/components/landing/backyard-home/BackyardHomeQuiz";
import {
  PARCEL_AFTER,
  PARCEL_BEFORE,
} from "@/components/landing/lot-more/landing-images";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { Bezel } from "@/components/ui/Bezel";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { sanDiego } from "@/content/adu/ca/san-diego";
import { ADU_CITIES } from "@/lib/adu/content";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { landingDemos, landingScenarios } from "@/lib/landing-demo";
import { marketProvenanceLine } from "@/lib/market/market-basis";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const ADU_PATH_TYPES = [
  {
    number: "01",
    title: "Detached backyard home",
    tag: "400 – 1,200 sq ft",
    body: "A standalone structure in your rear or side yard with its own kitchen, bath, and entrance. Keeps the highest privacy and long-term rent value.",
  },
  {
    number: "02",
    title: "Garage conversion",
    tag: "Lower site prep",
    body: "Reuses an existing detached or attached garage slab and framing. Often bypasses extra yard clearance checks when setbacks are tight.",
  },
  {
    number: "03",
    title: "Attached or junior ADU",
    tag: "Under 500 sq ft option",
    body: "Shares a wall with the main house or repurposes an existing bedroom wing (JADU) when open backyard depth is limited.",
  },
] as const;

const PROPERTY_BLOCKERS = [
  {
    number: "01",
    title: "HOA covenants cannot ban your ADU",
    body: "California Civil Code §4751 voids HOA rules that prohibit or unreasonably restrict an ADU or JADU on a single-family lot. Objective architectural standards can still apply, so submit plans rather than assuming a blanket no.",
  },
  {
    number: "02",
    title: "Minimum lot size cannot block an 800 sq ft unit",
    body: "Under Government Code §66323, cities must allow at least one detached ADU up to 800 sq ft with 4-foot side and rear setbacks regardless of local lot-coverage or floor-area ratio caps.",
  },
  {
    number: "03",
    title: "Easements, septic, and coastal overlays matter most",
    body: "Recorded utility easements remain off-limits even when side setbacks shrink to 0–4 ft. Properties on septic need County Environmental Health verification, and Coastal Zone lots require a coastal permit or exemption.",
  },
] as const;

export const BACKYARD_HOME_FAQS = [
  {
    question: "Can I build an ADU on my lot in San Diego?",
    answer:
      "Most single-family and multifamily residential lots in San Diego qualify by right under SDMC §141.0302 and state Gov. Code §§66314–66323. Detached ADUs up to 1,200 sq ft are allowed, with 0 ft side and rear setbacks up to 16 ft tall outside High/Very High Fire Hazard Zones (4 ft inside fire zones or over 16 ft).",
  },
  {
    question: "What are the ADU rules in San Diego for parking and height?",
    answer:
      "San Diego generally requires no replacement or additional parking for standard ADUs, except specific Coastal / Beach Impact Overlay or Bonus Program cases outside Transit Priority Areas. In single-dwelling zones, detached ADUs are capped at two stories per the base zone.",
  },
  {
    question: "How much does an ADU cost in California?",
    answer:
      "Modeled California backyard home build costs typically span $157K–$566K across 400 to 1,200 sq ft finishes and soft costs, with a typical 600 sq ft 1-bedroom running around $231K–$289K before site-specific utility trenching or hillside foundations.",
  },
  {
    question: "Does the 750 sq ft impact-fee waiver apply to backyard homes?",
    answer:
      "Yes. Under California Government Code §66324(c), ADUs smaller than 750 sq ft are exempt from local development impact fees. Units at 750 sq ft or larger pay impact fees scaled proportionally to the main house.",
  },
  {
    question: "Does a passing quiz guarantee city permit approval?",
    answer:
      "No. This 5-question quiz screens common baseline eligibility signals. Final approval depends on your parcel boundaries, recorded utility easements, fire or coastal overlays, sewer/septic capacity, and municipal building review.",
  },
  {
    question: "How does LotFoundry check my exact lot?",
    answer:
      "When you submit your address, the free 3D Feasibility Studio loads parcel boundaries and modeled setbacks, lets you test a 400–1,000 sq ft placement in 3D, and pairs it with local cost and HUD rent estimates.",
  },
] as const;

const SAN_DIEGO_HIGHLIGHT_LABELS = [
  "Max size — detached",
  "Rear and side setbacks",
  "Parking required",
  "Approval type & timeline",
  "Lot-size minimum",
  "Owner-occupancy",
] as const;

/**
 * Top-of-funnel Firebase-free landing page targeting homeowners asking
 * "Can I build a backyard home?", "can I build an ADU on my lot in San Diego",
 * "what are the ADU rules in San Diego", and "how much does an ADU cost in California".
 */
export function BackyardHomeLanding() {
  const demo = landingDemos["san-diego"];
  const marketScenario =
    landingScenarios("san-diego").find((item) => item.id === "market") ??
    landingScenarios("san-diego")[0];
  const sanDiegoMarket = cityMarketAggregate("san-diego");
  const sizeRows = sanDiegoMarket?.rows ?? [];
  const row600 = sizeRows.find((row) => row.size === 600);
  const firstRow = sizeRows[0];
  const lastRow = sizeRows[sizeRows.length - 1];

  const costRange600 = row600
    ? `${formatCompactCurrency(row600.costLow)}–${formatCompactCurrency(row600.costHigh)}`
    : "$231K–$289K";
  const allSizeRange =
    firstRow && lastRow
      ? `${formatCompactCurrency(firstRow.costLow)}–${formatCompactCurrency(lastRow.costHigh)}`
      : "$157K–$566K";

  const sanDiegoRules = SAN_DIEGO_HIGHLIGHT_LABELS.flatMap((label) => {
    const row = sanDiego.glance.find((item) => item.label === label);
    return row ? [row] : [];
  });

  const sanDiegoCountyCities = ADU_CITIES.filter((city) =>
    [
      "san-diego",
      "chula-vista",
      "oceanside",
      "carlsbad",
      "encinitas",
      "escondido",
      "vista",
      "el-cajon",
      "la-mesa",
      "san-marcos",
      "imperial-beach",
      "san-diego-county",
    ].includes(city.slug),
  );

  const costBand = `${CURRENCY.format(marketScenario.costLow)} – ${CURRENCY.format(marketScenario.costHigh)}`;
  const monthlyRent = `${CURRENCY.format(marketScenario.rent)}/mo`;
  const paybackText = `${marketScenario.payback.toFixed(1)} yrs`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-lot-chalk text-lot-ink">
      <header className="border-b border-lot-line bg-lot-chalk">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="inline-flex min-h-11 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            <BrandLockup className="h-8 w-auto" />
          </Link>

          <nav
            aria-label="Page sections"
            className="flex flex-wrap items-center gap-3 sm:gap-5"
          >
            <a
              href="#quiz"
              className="inline-flex min-h-11 items-center rounded-control px-1.5 lf-body-sm font-medium text-lot-ink hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              Lot quiz
            </a>
            <a
              href="#san-diego-rules"
              className="inline-flex min-h-11 items-center rounded-control px-1.5 lf-body-sm font-medium text-lot-stone hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              San Diego rules
            </a>
            <a
              href="#california-cost"
              className="inline-flex min-h-11 items-center rounded-control px-1.5 lf-body-sm font-medium text-lot-stone hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              California cost
            </a>
            <a
              href="#faq"
              className="inline-flex min-h-11 items-center rounded-control px-1.5 lf-body-sm font-medium text-lot-stone hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              FAQ
            </a>
            <Link
              href="/studio?parcel=coyote-brush&size=600"
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-lot-ink bg-lot-ink px-4 py-2 lf-body-sm font-semibold text-lot-chalk hover:bg-lot-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              <span>Open 3D studio</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section
          id="quiz"
          className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14"
        >
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12">
            <div className="min-w-0 space-y-5">
              <p className="lf-kicker text-lot-orange-ink">
                California &amp; San Diego · 60-Second Lot Quiz
              </p>
              <h1 className="lf-display-hero text-lot-ink">
                Can I build a backyard home?
              </h1>
              <p className="lf-body-lg text-lot-stone">
                For most residential lots in California—including San Diego—the
                short answer is yes. State law protects your right to add an{" "}
                <strong className="font-semibold text-lot-ink">
                  accessory dwelling unit (ADU)
                </strong>{" "}
                ministerially, often with 4-foot (or 0-foot in San Diego) yard
                setbacks. Screen your property in five quick checks, then verify
                your exact lot in 3D.
              </p>

              <dl className="grid grid-cols-3 gap-4 border-t border-lot-line pt-5">
                <div>
                  <dt className="lf-kicker-dense text-lot-stone">Lot quiz</dt>
                  <dd className="lf-card-heading mt-1 text-lot-ink">5 checks</dd>
                </div>
                <div>
                  <dt className="lf-kicker-dense text-lot-stone">
                    San Diego setback
                  </dt>
                  <dd className="lf-card-heading mt-1 text-lot-ink">0–4 ft</dd>
                </div>
                <div>
                  <dt className="lf-kicker-dense text-lot-stone">
                    Est. 600 sf cost
                  </dt>
                  <dd className="lf-card-heading mt-1 text-lot-ink tabular-nums">
                    {costRange600}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0">
              <BackyardHomeQuiz />
            </div>
          </div>
        </section>

        <section
          id="san-diego-rules"
          className="border-t border-lot-line bg-lot-surface py-14 sm:py-16"
        >
          <div className="mx-auto max-w-6xl space-y-10 px-5 sm:px-8">
            <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-3">
                <p className="lf-kicker text-lot-stone">
                  01 · City-Specific ADU Rules (Verified {sanDiego.asOf})
                </p>
                <h2 className="lf-section-heading text-lot-ink">
                  What are the ADU rules in San Diego?
                </h2>
                <p className="lf-body text-lot-stone">
                  {sanDiego.introAnswer[1]} Under San Diego Municipal Code
                  (SDMC §141.0302) and California Government Code §66323, a
                  single-family lot can combine up to three units total: one
                  detached or attached ADU, one garage or interior conversion,
                  and one junior ADU (JADU).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Bezel
                  className="border-lot-line bg-lot-chalk shadow-paper-sm"
                  innerClassName="p-2"
                >
                  <picture>
                    <source srcSet={PARCEL_BEFORE.avifSrcSet} type="image/avif" />
                    <img
                      src={PARCEL_BEFORE.src}
                      srcSet={PARCEL_BEFORE.srcSet}
                      sizes="(max-width: 768px) 45vw, 240px"
                      width={1536}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      alt="Residential backyard before adding an accessory dwelling unit"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </picture>
                  <p className="mt-2 lf-caption text-lot-stone">
                    Before · Existing backyard (illustrative concept)
                  </p>
                </Bezel>
                <Bezel
                  className="border-lot-line bg-lot-chalk shadow-paper-sm"
                  innerClassName="p-2"
                >
                  <picture>
                    <source srcSet={PARCEL_AFTER.avifSrcSet} type="image/avif" />
                    <img
                      src={PARCEL_AFTER.src}
                      srcSet={PARCEL_AFTER.srcSet}
                      sizes="(max-width: 768px) 45vw, 240px"
                      width={1536}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      alt="Illustrative backyard home concept placed inside San Diego setbacks"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </picture>
                  <p className="mt-2 lf-caption text-lot-stone">
                    After · Illustrative backyard home concept
                  </p>
                </Bezel>
              </div>
            </div>

            {sanDiego.coastalCallout ? (
              <aside className="border border-lot-line border-l-4 border-l-status-review bg-lot-chalk p-5">
                <p className="lf-kicker-dense text-status-review">
                  San Diego Coastal Zone Caveat
                </p>
                <p className="lf-body-sm mt-1.5 text-lot-ink">
                  {sanDiego.coastalCallout}
                </p>
              </aside>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sanDiegoRules.map((item) => (
                <article
                  key={item.label}
                  className="border border-lot-line bg-lot-chalk p-5 shadow-paper-sm"
                >
                  <p className="lf-kicker-dense text-lot-stone">{item.label}</p>
                  <h3 className="lf-card-heading mt-2 text-lot-ink">
                    {item.value}
                  </h3>
                  {item.note ? (
                    <p className="lf-body-sm mt-2 text-lot-stone">
                      {item.note}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-lot-line pt-6">
              <div className="space-y-2">
                <p className="lf-body-sm font-semibold text-lot-ink">
                  Compare nearby San Diego County cities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sanDiegoCountyCities.map((city) => (
                    <Link
                      key={city.slug}
                      href={`/adu/${city.state}/${city.slug}`}
                      className="inline-flex min-h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-3 py-1.5 lf-caption font-medium text-lot-ink hover:border-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                    >
                      {city.city}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/adu/ca/san-diego"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 lf-body-sm font-semibold text-lot-orange-ink underline underline-offset-4 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
              >
                <span>Read full San Diego ADU rules &amp; IB-400 checklist</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="california-cost"
          className="bg-lot-ink py-14 text-lot-chalk sm:py-16"
        >
          <div className="mx-auto max-w-6xl space-y-8 px-5 sm:px-8">
            <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-3">
                <p className="lf-kicker text-lot-stone-on-dark">
                  02 · California ADU Cost &amp; Rent Math
                </p>
                <h2 className="lf-section-heading text-lot-chalk">
                  How much does an ADU cost in California?
                </h2>
                <p className="lf-body text-lot-stone-on-dark">
                  Across 400 to 1,200 sq ft builds, estimated construction runs{" "}
                  <strong className="font-semibold text-lot-chalk">
                    {allSizeRange}
                  </strong>{" "}
                  using LotFoundry&apos;s baseline finish and soft-cost model (a
                  typical 600 sq ft one-bedroom averages{" "}
                  <strong className="font-semibold text-lot-chalk">
                    {costRange600}
                  </strong>
                  ). Units under{" "}
                  <strong className="font-semibold text-lot-chalk">
                    750 sq ft
                  </strong>{" "}
                  are exempt from municipal development impact fees under Gov.
                  Code §66324(c).
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-self-end">
                <Link
                  href="/studio?parcel=coyote-brush&size=600"
                  prefetch={false}
                  className="inline-flex min-h-11 items-center gap-2 rounded-control bg-lot-orange px-5 py-3 lf-body-sm font-semibold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk"
                >
                  <span>Inspect {demo.name} in 3D</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto border-y border-lot-line-dark">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-lot-line-dark">
                    <th className="py-3.5 pr-4 lf-kicker-dense text-lot-stone-on-dark">
                      Footprint
                    </th>
                    <th className="py-3.5 pr-4 lf-kicker-dense text-lot-stone-on-dark">
                      Est. build cost range
                    </th>
                    <th className="py-3.5 pr-4 lf-kicker-dense text-lot-stone-on-dark">
                      HUD San Diego Co. rent
                    </th>
                    <th className="py-3.5 lf-kicker-dense text-lot-stone-on-dark">
                      Simple payback est.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lot-line-dark">
                  {sizeRows.map((row) => (
                    <tr key={row.size}>
                      <td className="py-3.5 pr-4 lf-body-sm font-semibold text-lot-chalk tabular-nums">
                        {row.size.toLocaleString()} sq ft{" "}
                        <span className="font-normal text-lot-stone-on-dark">
                          ({row.bedroom})
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 lf-money-sm text-lot-chalk">
                        {formatCurrency(row.costLow)} –{" "}
                        {formatCurrency(row.costHigh)}
                      </td>
                      <td className="py-3.5 pr-4 lf-body-sm text-lot-chalk tabular-nums">
                        {formatCurrency(row.monthlyRent)}/mo
                      </td>
                      <td className="py-3.5 lf-body-sm text-lot-stone-on-dark tabular-nums">
                        ~{row.paybackYears.toFixed(1)} yrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 border-b border-lot-line-dark pb-6 sm:grid-cols-3">
              <div>
                <p className="lf-kicker-dense text-lot-stone-on-dark">
                  {demo.name} market demo (600 sq ft)
                </p>
                <p className="lf-money-md mt-2 text-lot-chalk">{costBand}</p>
              </div>
              <div>
                <p className="lf-kicker-dense text-lot-stone-on-dark">
                  Demo market rent scenario
                </p>
                <p className="lf-money-md mt-2 text-lot-chalk">{monthlyRent}</p>
              </div>
              <div>
                <p className="lf-kicker-dense text-lot-stone-on-dark">
                  Demo simple payback
                </p>
                <p className="lf-money-md mt-2 text-lot-chalk">{paybackText}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-3xl lf-caption text-lot-stone-on-dark">
                {sanDiegoMarket
                  ? marketProvenanceLine(sanDiegoMarket.provenance)
                  : "HUD FY2027 FMR · San Diego County, CA"}
                . {demo.note} Build costs reflect LotFoundry&apos;s baseline
                finish + 18% soft-cost model; exact soil, utility trenching, and
                contractor bids vary by lot.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/adu/ca/cost"
                  className="inline-flex min-h-11 items-center rounded-control lf-body-sm font-medium text-lot-chalk underline underline-offset-4 hover:text-lot-stone-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk"
                >
                  California cost guide
                </Link>
                <Link
                  href="/adu-cost-calculator"
                  className="inline-flex min-h-11 items-center rounded-control lf-body-sm font-medium text-lot-chalk underline underline-offset-4 hover:text-lot-stone-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk"
                >
                  Cost calculator
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="lot-edge-cases"
          className="border-b border-lot-line bg-lot-surface py-14 sm:py-16"
        >
          <div className="mx-auto max-w-6xl space-y-10 px-5 sm:px-8">
            <div className="max-w-3xl space-y-3">
              <p className="lf-kicker text-lot-stone">
                03 · Property-Specific Eligibility
              </p>
              <h2 className="lf-section-heading text-lot-ink">
                Which backyard home fits your lot—and what actually blocks a
                build?
              </h2>
              <p className="lf-body text-lot-stone">
                Homeowners often worry about HOA bans or minimum lot sizes that
                California law already overrides. Real blockers are usually
                physical—easements, fire access, or septic capacity—or choosing
                the wrong unit footprint for a narrow yard.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {ADU_PATH_TYPES.map((item) => (
                <article
                  key={item.number}
                  className="border border-lot-line bg-lot-chalk p-5 shadow-paper-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="lf-kicker-dense text-lot-orange-ink">
                      {item.number}
                    </span>
                    <span className="lf-caption text-lot-stone">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="lf-card-heading mt-3 text-lot-ink">
                    {item.title}
                  </h3>
                  <p className="lf-body-sm mt-2 text-lot-stone">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {PROPERTY_BLOCKERS.map((blocker) => (
                <article
                  key={blocker.number}
                  className="border border-lot-line bg-lot-chalk p-5"
                >
                  <span className="lf-kicker-dense text-lot-stone">
                    Rule {blocker.number}
                  </span>
                  <h3 className="lf-card-heading mt-2 text-lot-ink">
                    {blocker.title}
                  </h3>
                  <p className="lf-body-sm mt-2 text-lot-stone">
                    {blocker.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border border-lot-line bg-lot-chalk p-5 shadow-paper-sm">
              <div className="space-y-1">
                <p className="lf-card-heading text-lot-ink">
                  Ready to see your lot lines and setbacks in 3D?
                </p>
                <p className="lf-body-sm text-lot-stone">
                  Jump back to the quiz or enter your street address directly—no
                  account needed for your first property check.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#quiz"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-lot-orange px-5 py-2.5 lf-body-sm font-semibold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                >
                  <span>Check your address above</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/adu/ca/can-i-build-an-adu"
                  className="inline-flex min-h-11 items-center rounded-control border border-lot-ink px-4 py-2.5 lf-body-sm font-semibold text-lot-ink hover:bg-lot-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                >
                  CA statutory checklist
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <p className="lf-kicker text-lot-stone">04 · Common Questions</p>
              <h2 className="lf-section-heading text-lot-ink">
                Backyard home, San Diego rules &amp; California ADU cost FAQ
              </h2>
              <div className="divide-y divide-lot-line border-y border-lot-line">
                {BACKYARD_HOME_FAQS.map((item) => (
                  <details key={item.question} className="group py-4">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-control lf-body font-semibold text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink">
                      <span>{item.question}</span>
                      <span
                        aria-hidden="true"
                        className="lf-caption text-lot-stone group-open:hidden"
                      >
                        +
                      </span>
                      <span
                        aria-hidden="true"
                        className="hidden lf-caption text-lot-stone group-open:inline"
                      >
                        −
                      </span>
                    </summary>
                    <p className="lf-body-sm mt-2 pr-6 text-lot-stone">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <AduPlanningLinks current="/can-i-build-a-backyard-home" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
