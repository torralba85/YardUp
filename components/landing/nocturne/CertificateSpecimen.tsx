import { TYPICAL_MARKET } from "@/lib/typical-market";
import { Reveal } from "./Reveal";

/**
 * Steps 04–05 of the arc: the paid Certificate of Feasibility and the builder
 * handoff — the two revenue destinations the studio spine ends at. Per
 * DESIGN.md invariant 4 ("the certificate is the sun"), the specimen renders
 * as daylight parchment with Cormorant recorded figures even on the night
 * landing — a lit window in a dark house. The `lf-*` classes on the card are
 * deliberate: the card is an artifact of the daylight system, not landing
 * type, and stays rectangular (a document, not a control).
 */
const DESTINATIONS = [
  {
    number: "04",
    title: "Save your estimate",
    body: "When the numbers look solid, save them: rent, build cost, payback, and the assumptions behind them—as a Certificate of Feasibility you keep and share.",
    record: "In the studio · certificate · paid",
  },
  {
    number: "05",
    title: "Meet local builders",
    body: "Matched local builders review the same report and reply with real bids—no cold calls, no generic packages.",
    record: "In the studio · builder connect",
  },
] as const;

const RECORDED = [
  "Your ADU's size, style, and placement",
  "Estimated rent, income, payback, and lot coverage",
  "Honest fine print instead of empty promises",
] as const;

/** Certificate specimen + builder handoff section on the marketing landing. */
export function CertificateSpecimen() {
  return (
    <section aria-labelledby="specimen-heading" className="border-t border-ln-hairline/60">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 sm:py-32 lg:grid-cols-[1fr_1.05fr]">
        <Reveal>
          <p className="lf-kicker flex items-center gap-2.5 text-ln-glow">
            <span aria-hidden="true" className="h-px w-6 bg-ln-glow/70" />
            What you walk away with
          </p>
          <h2 id="specimen-heading" className="ln-section-heading mt-4 max-w-2xl text-ln-mist">
            A report you can keep—and hand to a builder.
          </h2>
          <ul className="mt-12 space-y-9">
            {DESTINATIONS.map((step) => (
              <li key={step.number} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ln-glow/50 font-mono text-xs font-semibold text-ln-glow"
                >
                  {step.number}
                </span>
                <div>
                  <h3 className="ln-card-heading text-ln-mist">{step.title}</h3>
                  <p className="lf-body-sm mt-2 max-w-[52ch] text-ln-slate">{step.body}</p>
                  <p className="lf-kicker-dense mt-3 text-ln-slate/70">{step.record}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="lf-caption mt-10 max-w-[60ch] text-ln-slate/70">
            The certificate records estimates and concepts — it is not a permit,
            an appraisal, or a guarantee.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {/* Daylight parchment on night ground: the lit window (invariant 4). */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-lg border border-lf-hairline bg-lf-card p-6 text-lf-espresso shadow-[0_0_80px_rgba(245,181,74,0.16),0_24px_48px_rgba(0,0,0,0.55)] sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lf-kicker-dense text-lf-muted">
                <span>No. LF-042-0117-118</span>
                <span>Sample · cities we cover</span>
              </div>
              <div className="mt-4 border-t border-lf-hairline pt-4">
                <p className="font-display text-2xl font-semibold leading-tight">
                  Certificate of Feasibility
                </p>
                <p className="mt-1 lf-kicker-dense text-lf-muted">
                  Sample — your address replaces this
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1">
                <p className="lf-kicker-dense text-lf-muted">
                  Est. rent
                </p>
                <p className="lf-kicker-dense text-lf-muted">
                  Build cost
                </p>
                <p className="lf-money-md text-lf-forest">
                  {TYPICAL_MARKET.rentBand}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-muted">/mo</span>
                </p>
                <p className="lf-money-md">{TYPICAL_MARKET.buildBand}</p>
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-4 border-b-4 border-double border-lf-taupe pb-2">
                <span className="lf-kicker-dense text-lf-muted">
                  Yearly income
                </span>
                <span className="lf-money-md text-lf-forest">
                  {TYPICAL_MARKET.noi}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-muted">/yr</span>
                </span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {RECORDED.map((item) => (
                  <li key={item} className="flex gap-2.5 font-mono text-xs leading-5 text-lf-espresso/85">
                    <span aria-hidden="true" className="shrink-0 text-lf-taupe">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-3 right-8 rotate-6 rounded-sm border-2 border-lf-brick/80 bg-lf-brick-soft px-2.5 py-1 lf-kicker-dense text-lf-brick"
            >
              Concept · not a permit
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
