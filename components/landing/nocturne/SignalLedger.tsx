import { Reveal } from "./Reveal";
import { TYPICAL_MARKET } from "@/lib/typical-market";

const FIGURES = [
  { label: "Est. rent", value: TYPICAL_MARKET.rentBand, unit: "/mo", money: true },
  { label: "Yearly income", value: TYPICAL_MARKET.noi, unit: "/yr", money: true },
  { label: "Payback", value: `~${TYPICAL_MARKET.paybackYears}`, unit: "yrs", money: false },
  { label: "Build cost", value: TYPICAL_MARKET.buildBand, unit: "", money: false },
] as const;

/**
 * Ledger band under the hero: sample market figures for cities we cover.
 * Money reads in patina green; everything else stays mist.
 */
export function SignalLedger() {
  return (
    <section
      aria-label="Sample earning potential"
      className="border-y border-ln-hairline/60 bg-ln-navy/40"
    >
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12">
        <Reveal>
          <p className="lf-kicker flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ln-slate">
            Sample ranges · cities we cover
            <span className="text-ln-slate/60">Seattle · Portland · Austin</span>
          </p>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {FIGURES.map((figure, index) => (
            <Reveal key={figure.label} delay={index * 70}>
              <div className={index > 0 ? "lg:border-l lg:border-ln-hairline/60 lg:pl-6" : ""}>
                <p className="lf-kicker-dense text-ln-slate">{figure.label}</p>
                <p className={`ln-money mt-2 text-3xl sm:text-4xl ${figure.money ? "text-ln-money" : "text-ln-mist"}`}>
                  {figure.value}
                  {figure.unit ? (
                    <span className="ml-1 font-mono text-sm font-normal text-ln-slate">
                      {figure.unit}
                    </span>
                  ) : null}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="lf-caption mt-8 max-w-[64ch] text-ln-slate">
          Sample ranges for cities we cover—not your lot. Enter your address for
          figures based on your property. Estimates only, not guarantees.
        </p>
      </div>
    </section>
  );
}
