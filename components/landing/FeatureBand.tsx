import { Box, FileText, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const ITEMS = [
  { icon: Box, title: "Saved concepts", body: "Save ADU sizes, finishes, and rent assumptions without losing your scenario." },
  { icon: FileText, title: "Shareable owner report", body: "Export a concept summary with costs, coverage, and estimate disclaimers." },
  { icon: Users, title: "Builder-ready next step", body: "Keep the concept organized so a builder can review the same assumptions." },
];

export function FeatureBand() {
  return (
    <section className="border-t border-lf-hairline/50">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          From snapshot to shareable concept
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-lf-hairline bg-lf-card/70 p-6 backdrop-blur transition-colors hover:border-lf-clay/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lf-sand text-lf-clay">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-lf-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-lf-hairline bg-lf-card/70 p-10 text-center backdrop-blur md:p-16">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Find the ADU income potential in your lot.
          </h2>
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
  );
}
