import { ArrowRight, MapPin, Box, TrendingUp, Users, Lock, Layers } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-lf-sand text-lf-espresso">
      {/* Top bar */}
      <header className="border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-lf-mahogany font-display font-black text-sm text-lf-sand">
              LF
            </div>
            <span className="font-display font-bold tracking-tight text-lf-mahogany">
              LotFoundry
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-taupe/10"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-lf-mahogany px-4 py-2 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-20 md:pt-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-lf-hairline bg-lf-card px-3 py-1.5 text-xs font-medium text-lf-muted">
            <Box className="h-3.5 w-3.5" />
            ADU Feasibility Studio — now with saved projects
          </div>
          <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight text-lf-espresso md:text-7xl">
            See what your lot
            <br />
            <span className="text-lf-clay">can build.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-lf-muted md:text-xl">
            LotFoundry turns any address into a 3D feasibility study. Place an ADU on your
            actual parcel, check zoning coverage, estimate costs and rental income — in
            minutes, not months.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Start free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-lf-hairline px-6 py-3.5 text-base font-semibold text-lf-espresso transition-colors hover:bg-lf-taupe/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-lf-hairline/50 bg-lf-sand-2/40">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight text-lf-espresso md:text-4xl">
            Everything you need to evaluate a lot
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-lf-muted">
            From parcel lookup to financial projections — all in one studio.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<MapPin className="h-6 w-6" />}
              title="Parcel intelligence"
              description="Search any US address. Pull lot size, zoning, setbacks, and existing structure data automatically."
            />
            <FeatureCard
              icon={<Layers className="h-6 w-6" />}
              title="3D site visualization"
              description="See your ADU placed on the real lot with aerial imagery. Drag to position, rotate, and adjust dimensions."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Feasibility metrics"
              description="Instant cost estimates, rental income projections, payback period, and zoning compliance checks."
            />
            <FeatureCard
              icon={<Box className="h-6 w-6" />}
              title="Multiple configurations"
              description="Compare different footprints, roof styles, exterior finishes, and rental scenarios side by side."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Built for teams"
              description="Builders, designers, and homeowners all share the same studio with role-based access."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Saved projects"
              description="Save your feasibility studies and share them with clients or stakeholders via link."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="rounded-2xl border border-lf-hairline bg-lf-card p-10 text-center md:p-16">
            <h2 className="font-display text-3xl font-bold tracking-tight text-lf-espresso md:text-4xl">
              Ready to explore your lot?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-lf-muted">
              Create a free account and start placing ADUs on real parcels in under a minute.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-8 py-4 text-lg font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
            >
              Create account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-lf-hairline/50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-lf-mahogany font-display font-black text-xs text-lf-sand">
                LF
              </div>
              <span className="font-display font-semibold text-lf-espresso">LotFoundry</span>
            </div>
            <p className="text-sm text-lf-muted">
              A foundry for lots. Estimates, not guarantees.
            </p>
          </div>
        </div>
      </footer>
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
