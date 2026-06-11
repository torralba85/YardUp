import { FileText, MapPinned, Ruler, ShieldCheck } from "lucide-react";
import { Bezel } from "@/components/ui/Bezel";
import { CTAButton } from "@/components/ui/CTAButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

const PROOF = [
  ["$2,350/mo", "sample rent estimate", true],
  ["31%", "lot coverage model", false],
  ["9.8 yrs", "sample payback view", false],
] as const;

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
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <Reveal>
            <Eyebrow>Why owners use it</Eyebrow>
            <h2 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-[-0.01em] text-lf-espresso md:text-5xl">
              Make the ADU conversation specific before money changes hands.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Bezel innerClassName="grid grid-cols-3 divide-x divide-lf-hairline/70 px-2 py-6 text-center">
              {PROOF.map(([value, label, isMoney]) => (
                <div key={label} className="px-3">
                  <strong
                    className={`block font-display text-2xl font-extrabold md:text-3xl ${
                      isMoney ? "text-lf-forest" : "text-lf-espresso"
                    }`}
                  >
                    {value}
                  </strong>
                  <span className="mt-1.5 block text-sm leading-5 text-lf-muted">{label}</span>
                </div>
              ))}
            </Bezel>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-36">
          <Reveal className="max-w-3xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-[-0.01em] text-lf-espresso md:text-5xl">
              A complete owner flow, not a pretty rendering with no next step.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.12} className="h-full">
                <Bezel
                  className="group h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(38,19,7,0.25)]"
                  innerClassName="p-7"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-lf-taupe-soft text-lf-clay transition-colors duration-500 group-hover:bg-lf-clay group-hover:text-lf-sand">
                      <Icon className="h-5.5 w-5.5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm tracking-[0.16em] text-lf-taupe">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">{title}</h3>
                  <p className="mt-3 leading-7 text-lf-muted">{body}</p>
                </Bezel>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:pb-36">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-lf-espresso via-lf-espresso to-lf-mahogany text-lf-sand">
          <div className="grid gap-12 px-8 py-16 md:grid-cols-[0.92fr_1.08fr] md:items-center md:px-16 md:py-24">
            <Reveal>
              <Eyebrow tone="dark">Owner report</Eyebrow>
              <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-[-0.01em] md:text-5xl">
                The output is built for the next conversation.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-lf-taupe">
                The goal is not to pretend the estimate is a permit. It is to make the first builder,
                planner, or family conversation concrete enough to move forward.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <Bezel tone="dark" innerClassName="divide-y divide-white/10 px-7 py-2">
                {REPORT.map((item) => (
                  <div key={item} className="flex items-start gap-4 py-5">
                    <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lf-amber" aria-hidden="true" />
                    <span className="text-lg leading-7 text-lf-sand">{item}</span>
                  </div>
                ))}
              </Bezel>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="start" className="px-6 pb-24 md:pb-32">
        <Reveal className="mx-auto max-w-7xl">
          <Bezel innerClassName="px-8 py-16 text-center md:px-16 md:py-24">
            <Eyebrow>Ready when the owner is</Eyebrow>
            <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-[-0.01em] text-lf-espresso md:text-6xl">
              Find the ADU income potential in your lot.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-lf-muted">
              Estimates, not guarantees — a concrete starting point you can take to a builder.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <CTAButton href="/signup" size="lg">
                Estimate my lot
              </CTAButton>
              <CTAButton href="/login" variant="outline" arrow={false}>
                Sign in
              </CTAButton>
            </div>
          </Bezel>
        </Reveal>
      </section>
    </>
  );
}
