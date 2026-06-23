import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

const TYPE_SCALE = [
  ["Hero display", "48-76 px", "Cormorant Garamond 700"],
  ["Section heading", "36-44 px", "Cormorant Garamond 700"],
  ["Card heading", "24 px", "Cormorant Garamond 700"],
  ["Body", "16 px", "Libre Franklin 400"],
  ["Small UI", "14 px", "Libre Franklin 400-600"],
  ["Recorded fact", "10-12 px", "IBM Plex Mono 400-600"],
] as const;

export default function TypeSamplesPage() {
  return (
    <main className="min-h-[100dvh] bg-lf-sand text-lf-espresso">
      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 border border-lf-hairline bg-lf-card px-4 text-sm font-semibold text-lf-espresso transition hover:bg-lf-sand-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <p className="lf-kicker text-right text-lf-muted">
            Brand typography specimen
          </p>
        </nav>

        <header className="grid gap-8 border-b border-lf-hairline py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:py-20">
          <div>
            <p className="lf-kicker text-lf-clay">Current production system</p>
            <h1 className="lf-display-hero mt-4 max-w-4xl text-lf-espresso">
              Three families. Three jobs.
            </h1>
          </div>
          <p className="lf-body-lg prose-width text-lf-muted">
            Cormorant Garamond carries authority and money. Libre Franklin keeps
            controls and explanations clear. IBM Plex Mono marks the facts copied
            from a parcel record, calculation, or status.
          </p>
        </header>

        <div className="grid gap-px border-x border-b border-lf-hairline bg-lf-hairline lg:grid-cols-3">
          <article className="bg-lf-card p-6 sm:p-8">
            <p className="lf-kicker-dense text-lf-clay">01 / Display and money</p>
            <h2 className="lf-card-heading mt-3 text-lf-espresso">
              Cormorant Garamond
            </h2>
            <p className="mt-8 font-display text-5xl font-bold leading-[0.98] text-lf-espresso">
              Your backyard is an asset.
            </p>
            <div className="mt-10 border-t border-lf-hairline pt-5">
              <p className="lf-kicker-dense text-lf-muted">Estimated monthly rent</p>
              <p className="mt-2 font-display text-6xl font-semibold leading-none text-lf-forest tabular-nums">
                $2,350
                <span className="ml-2 font-mono text-xs text-lf-muted">/mo</span>
              </p>
            </div>
          </article>

          <article className="bg-lf-card p-6 sm:p-8">
            <p className="lf-kicker-dense text-lf-clay">02 / Body and controls</p>
            <h2 className="lf-card-heading mt-3 text-lf-espresso">
              Libre Franklin
            </h2>
            <p className="lf-body mt-8 text-lf-muted">
              LotFoundry estimates site fit, build range, projected rent, and the
              assumptions behind each number before an owner spends on plans.
            </p>
            <div className="mt-8 space-y-3">
              <Link
                href="/studio"
                className="flex min-h-12 items-center justify-between bg-lf-mahogany px-5 text-sm font-semibold text-lf-sand transition hover:bg-lf-clay"
              >
                Check my address
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="flex min-h-12 items-center border border-lf-hairline bg-lf-sand-2 px-4 text-sm text-lf-muted">
                1234 Oak Street
              </div>
            </div>
          </article>

          <article className="bg-lf-espresso p-6 text-lf-sand sm:p-8">
            <p className="lf-kicker-dense text-lf-taupe">03 / Recorded fact</p>
            <h2 className="lf-card-heading mt-3 text-lf-sand">
              IBM Plex Mono
            </h2>
            <dl className="mt-8 space-y-5 font-mono">
              <Fact label="Parcel" value="APN 061-244-018" />
              <Fact label="Lot" value="5,000 SF / 40 FT X 125 FT" />
              <Fact label="Coverage" value="40% OF 40% MAX" />
              <Fact label="Status" value="LIKELY FEASIBLE" positive />
            </dl>
          </article>
        </div>

        <section className="py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="lf-kicker text-lf-clay">Production scale</p>
              <h2 className="lf-section-heading mt-3 text-lf-espresso">
                Fewer styles, clearer hierarchy.
              </h2>
            </div>
            <div className="border-t border-lf-espresso">
              {TYPE_SCALE.map(([role, size, family]) => (
                <div
                  key={role}
                  className="grid gap-2 border-b border-lf-hairline py-4 sm:grid-cols-[1fr_120px_1fr] sm:items-baseline"
                >
                  <strong className="text-sm font-semibold text-lf-espresso">{role}</strong>
                  <span className="font-mono text-xs text-lf-muted">{size}</span>
                  <span className="text-sm text-lf-muted">{family}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Fact({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="border-b border-lf-taupe/20 pb-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-taupe">
        {label}
      </dt>
      <dd className={`mt-1.5 text-sm ${positive ? "text-lf-money-on-dark" : "text-lf-sand"}`}>
        {positive && <CheckCircle2 className="mr-2 inline h-4 w-4" />}
        {value}
      </dd>
    </div>
  );
}
