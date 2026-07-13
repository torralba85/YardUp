import { Reveal } from "./Reveal";

/**
 * The owner path is a real sequence - address in, envelope cast, verdict out -
 * so the numbered markers carry information, not decoration.
 */
const STEPS = [
  {
    number: "01",
    title: "Enter your address",
    body: "Start with the home you already own. LotFoundry pulls lot size, layout, and what is already built so the estimate matches your yard—not a stock example.",
    record: "Input · street address",
  },
  {
    number: "02",
    title: "Map where an ADU can fit",
    body: "Setbacks, size limits, and your ADU stay on one screen, placed on the lot in 3D. You see what fits—and what does not—before anyone bills an hour.",
    record: "Output · lot map",
  },
  {
    number: "03",
    title: "See rent, cost, and payback",
    body: "Estimated rent, build range, payback, and the assumptions behind them land in a report you can share with a planner, lender, or builder.",
    record: "Output · owner report",
  },
] as const;

/** "How it works" section on the marketing landing. */
export function OwnerPath() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal>
        <p className="lf-kicker flex items-center gap-2.5 text-ln-glow">
          <span aria-hidden="true" className="h-px w-6 bg-ln-glow/70" />
          How it works
        </p>
        <h2 className="ln-section-heading mt-4 max-w-3xl text-ln-mist">
          From your address to rent, lot fit, and payback—before you spend on plans.
        </h2>
      </Reveal>

      <ol className="mt-14 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        {STEPS.map((step, index) => (
          <li
            key={step.number}
            className={`overflow-hidden rounded-lg border border-ln-hairline bg-ln-navy/45 ${
              index === 0 ? "md:row-span-2" : ""
            }`}
          >
            <Reveal delay={index * 90} className="h-full flex flex-col justify-between p-7 sm:p-8">
              <div>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-full border border-ln-glow/50 font-mono text-xs font-semibold text-ln-glow"
                >
                  {step.number}
                </span>
                <h3 className="ln-card-heading mt-6 text-ln-mist">{step.title}</h3>
                <p className="lf-body-sm mt-3 text-ln-slate">{step.body}</p>
              </div>
              <p className="lf-kicker-dense mt-6 border-t border-ln-hairline/60 pt-4 text-ln-slate/70">
                {step.record}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
