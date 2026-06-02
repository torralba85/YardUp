import {
  ArrowRight,
  BadgeDollarSign,
  Box,
  FileText,
  Ruler,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { FloatingNavBar } from "@/components/FloatingNavBar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-lf-sand text-lf-espresso">
      <FloatingNavBar />

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-32 md:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-lf-hairline bg-lf-card px-3 py-1.5 text-xs font-medium text-lf-muted">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              ADU income estimate for lot owners
            </div>
            <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight text-lf-espresso md:text-7xl">
              See what your lot{" "}
              <span className="block text-lf-clay">could earn.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-lf-muted md:text-xl">
              LotFoundry turns an address into an ADU income snapshot:
              estimated rent, build range, payback, and site fit in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
              >
                Estimate my lot
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-lf-hairline px-6 py-3.5 text-base font-semibold text-lf-espresso transition-colors hover:bg-lf-taupe/10"
              >
                View saved concepts
              </Link>
            </div>
          </div>

          <ProductProof />
        </div>
      </section>

      <section className="border-t border-lf-hairline/50 bg-lf-sand-2/40">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-lf-espresso md:text-4xl">
            Turn a lot into an income decision
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-lf-muted">
            Move from curiosity to a saved, shareable ADU concept with the
            numbers that matter.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<BadgeDollarSign className="h-6 w-6" />}
              title="Monthly rent estimate"
              description="Start with a clear rent range so the ADU conversation begins with upside, not guesswork."
            />
            <FeatureCard
              icon={<Ruler className="h-6 w-6" />}
              title="Site fit and zoning review"
              description="See how size, setbacks, and lot coverage affect whether the concept needs local review."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Build range and payback"
              description="Compare estimated construction range, annual NOI, and payback before hiring consultants."
            />
            <FeatureCard
              icon={<Box className="h-6 w-6" />}
              title="Saved concepts"
              description="Save different ADU sizes, finishes, and rent assumptions without losing your scenario."
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Shareable owner report"
              description="Export a concept summary with costs, rent assumptions, coverage, and estimate disclaimers."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Builder-ready next step"
              description="Keep the concept organized so a builder or designer can review the same assumptions."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="rounded-2xl border border-lf-hairline bg-lf-card p-10 text-center md:p-16">
            <h2 className="font-display text-3xl font-bold tracking-tight text-lf-espresso md:text-4xl">
              Find the ADU income potential in your lot.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-lf-muted">
              Create a saved concept with estimated rent, payback, site fit,
              and a report you can share.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-8 py-4 text-lg font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Estimate my lot
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lotfoundry-lockup-horizontal.svg"
              alt="LotFoundry"
              className="h-7 w-auto"
            />
            <p className="text-sm text-lf-muted">
              A foundry for lots. Estimates, not guarantees.
            </p>
            <div className="flex items-center gap-4 text-sm text-lf-muted">
              <Link href="/terms" className="transition-colors hover:text-lf-espresso">
                Terms
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-lf-espresso">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductProof() {
  return (
    <figure className="mx-auto mt-4 w-full max-w-[480px] lg:mt-0 lg:justify-self-center">
      <div className="overflow-hidden rounded-xl border border-lf-hairline bg-lf-card shadow-[0_28px_60px_-24px_rgba(38,19,7,0.45)]">
        <div className="border-b border-lf-hairline bg-lf-sand-2 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lf-muted">
            ADU income snapshot
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="font-display text-4xl font-black leading-none text-lf-espresso">
                $2,350
              </div>
              <div className="mt-1 text-sm font-medium text-lf-muted">
                estimated monthly rent
              </div>
            </div>
            <div className="rounded-md bg-lf-forest px-3 py-2 text-sm font-semibold text-lf-sand">
              Concept fit
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_132px]">
          <div className="grid grid-cols-2 gap-3">
            <ProofMetric label="Annual NOI" value="$20.6k" />
            <ProofMetric label="Payback" value="9.8 yrs" />
            <ProofMetric label="Build range" value="$178-221k" />
            <ProofMetric label="Coverage" value="31% of 40%" />
          </div>
          <div className="rounded-lg border border-lf-hairline bg-lf-sand p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-cadastral-plate.png"
              alt="Lot diagram with proposed ADU placement"
              width={1200}
              height={1600}
              className="h-full max-h-[210px] w-full object-cover object-top opacity-85"
              draggable={false}
            />
          </div>
        </div>
        <div className="border-t border-lf-hairline px-5 py-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-lf-espresso">Owner report ready</span>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-lf-muted">
              estimates, not guarantees
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-lf-muted">
        Income first. Site fit second. Better decisions sooner.
      </figcaption>
    </figure>
  );
}

function ProofMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-lf-hairline bg-lf-sand px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-black text-lf-espresso">
        {value}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-lf-hairline bg-lf-card p-6 transition-colors hover:border-lf-clay/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lf-sand text-lf-clay">
        {icon}
      </div>
      <h3 className="mt-4 font-display font-semibold text-lf-espresso">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-lf-muted">{description}</p>
    </div>
  );
}
