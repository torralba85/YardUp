import { Reveal } from "./Reveal";

/**
 * The owner path is a real sequence - address in, envelope cast, verdict out -
 * so the numbered markers carry information, not decoration.
 */
const STEPS = [
  {
    number: "01",
    title: "Pin the parcel",
    body: "Start with your actual address. LotFoundry pulls the lot - dimensions, orientation, what's already standing - so the estimate reflects the yard you own, not a catalog example.",
    record: "Input · street address",
  },
  {
    number: "02",
    title: "Cast the envelope",
    body: "Setbacks, size limits, and your ADU stay on one screen, placed on the lot in 3D. You see what fits - and what does not - before anyone bills an hour.",
    record: "Output · buildable envelope",
  },
  {
    number: "03",
    title: "Read rent, payback, and fit",
    body: "Projected rent, build range, payback, and the assumptions behind them land in a report you can share with a planner, lender, or builder.",
    record: "Output · owner report",
  },
] as const;

/** "How it works" for the Blue Hour landing: one sequenced survey record. */
export function OwnerPath() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal>
        <p className="lf-kicker flex items-center gap-2.5 text-ln-glow">
          <span aria-hidden="true" className="h-px w-6 bg-ln-glow/70" />
          The owner path
        </p>
        <h2 className="ln-section-heading mt-4 max-w-3xl text-ln-mist">
          From address to rent, fit, and payback before the sky goes dark.
        </h2>
      </Reveal>

      <ol className="mt-14 overflow-hidden rounded-lg border border-ln-hairline bg-ln-navy/45 md:grid md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.number}
            className="border-b border-ln-hairline/70 last:border-b-0 md:border-b-0 md:border-l md:first:border-l-0"
          >
            <Reveal delay={index * 90}>
              <div className="flex min-h-[270px] flex-col justify-between p-7 sm:p-8">
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
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
