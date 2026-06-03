import { ArrowRight, FileText, MapPinned, Ruler, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const PROOF = [
  ["$2,350/mo", "sample rent estimate"],
  ["31%", "lot coverage model"],
  ["9.8 yrs", "sample payback view"],
];

const STEPS = [
  {
    icon: MapPinned,
    title: "Start with the parcel",
    body: "Anchor the conversation in the lot, not a generic unit catalog.",
  },
  {
    icon: Ruler,
    title: "Show fit and constraints",
    body: "Keep setbacks, coverage, and a proposed ADU massing visible at the same time.",
  },
  {
    icon: FileText,
    title: "Package the assumptions",
    body: "Save rent, cost, caveats, and scenario details in one owner-ready report.",
  },
];

const REPORT = [
  "ADU size, finish, and placement assumptions",
  "Estimated rent, NOI, payback, and coverage",
  "Local-review caveats instead of false guarantees",
  "Builder-ready notes for the next conversation",
];

export function FeatureBand() {
  return (
    <>
      <section className="border-y border-lf-hairline/50 bg-lf-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Why owners use it</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              Make the ADU conversation specific before money changes hands.
            </h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-lf-hairline border-y border-lf-hairline py-5 text-center">
            {PROOF.map(([value, label]) => (
              <div key={label} className="px-3">
                <strong className="block font-display text-2xl text-lf-espresso md:text-3xl">{value}</strong>
                <span className="mt-1 block text-sm leading-5 text-lf-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">How it works</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              A complete owner flow, not a pretty rendering with no next step.
            </h2>
          </div>
          <div className="mt-12 grid gap-0 border-y border-lf-hairline md:grid-cols-3 md:divide-x md:divide-lf-hairline">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="py-8 md:px-8">
                <Icon className="h-7 w-7 text-lf-clay" aria-hidden="true" />
                <h3 className="mt-5 font-display text-2xl font-bold text-lf-espresso">{title}</h3>
                <p className="mt-3 max-w-sm leading-7 text-lf-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lf-espresso text-lf-sand">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-taupe">Owner report</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              The output is built for the next conversation.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-lf-taupe">
              The goal is not to pretend the estimate is a permit. It is to make the first builder, planner, or family conversation concrete enough to move forward.
            </p>
          </div>
          <div className="grid gap-4">
            {REPORT.map((item) => (
              <div key={item} className="flex items-start gap-4 border-t border-lf-taupe/25 pt-4">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lf-amber" aria-hidden="true" />
                <span className="text-lg leading-7 text-lf-sand">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-[1fr_auto] md:items-center md:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Ready when the owner is</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              Find the ADU income potential in your lot.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/signup"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-lf-mahogany px-8 text-lg font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Estimate my lot
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-lf-hairline bg-lf-card/65 px-6 font-semibold text-lf-espresso transition-colors hover:bg-lf-card"
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
