import Link from "next/link";
import {
  Cormorant_Garamond,
  EB_Garamond,
  DM_Sans,
  IBM_Plex_Sans,
  Instrument_Serif,
  Libre_Baskerville,
  Libre_Franklin,
  Lora,
  Plus_Jakarta_Sans,
  Playfair_Display,
  Source_Sans_3,
  Spectral,
  Work_Sans,
} from "next/font/google";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], display: "swap" });
const lora = Lora({ subsets: ["latin"], display: "swap" });
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap" });
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const libreFranklin = Libre_Franklin({ subsets: ["latin"], display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });
const workSans = Work_Sans({ subsets: ["latin"], display: "swap" });

const samples = [
  {
    name: "Premium A",
    tone: "Architecture atelier",
    display: "Cormorant Garamond",
    body: "Libre Franklin",
    displayClass: cormorant.className,
    bodyClass: libreFranklin.className,
    accent: "text-lf-mahogany",
    tint: "bg-lf-taupe-soft",
    verdict: "Most premium overall. Elegant, architectural, and clearly less SaaS-like.",
  },
  {
    name: "Premium B",
    tone: "Private advisory",
    display: "Libre Baskerville",
    body: "Source Sans 3",
    displayClass: libreBaskerville.className,
    bodyClass: sourceSans.className,
    accent: "text-lf-forest",
    tint: "bg-lf-forest-soft",
    verdict: "Best for serious homeowner trust, especially around permits and estimates.",
  },
  {
    name: "Premium C",
    tone: "High-end editorial",
    display: "Playfair Display",
    body: "DM Sans",
    displayClass: playfair.className,
    bodyClass: dmSans.className,
    accent: "text-lf-brick",
    tint: "bg-lf-brick-soft",
    verdict: "Most expressive. Strong for a polished marketing homepage, less quiet in-app.",
  },
  {
    name: "Premium D",
    tone: "Boutique report",
    display: "Instrument Serif",
    body: "Plus Jakarta Sans",
    displayClass: instrumentSerif.className,
    bodyClass: jakarta.className,
    accent: "text-lf-clay",
    tint: "bg-lf-amber-soft",
    verdict: "Best for warmth and restraint. Premium without feeling ornate.",
  },
  {
    name: "Premium E",
    tone: "Heritage planning",
    display: "EB Garamond",
    body: "IBM Plex Sans",
    displayClass: ebGaramond.className,
    bodyClass: plexSans.className,
    accent: "text-lf-forest",
    tint: "bg-lf-forest-soft",
    verdict: "Most established and bookish. Good if YardUp should feel rigorous and grounded.",
  },
  {
    name: "Premium F",
    tone: "Refined product",
    display: "Lora",
    body: "Work Sans",
    displayClass: lora.className,
    bodyClass: workSans.className,
    accent: "text-lf-mahogany",
    tint: "bg-lf-taupe-soft",
    verdict: "Best compromise if you want premium type without leaving modern product territory.",
  },
  {
    name: "Premium G",
    tone: "Planning journal",
    display: "Spectral",
    body: "DM Sans",
    displayClass: spectral.className,
    bodyClass: dmSans.className,
    accent: "text-lf-clay",
    tint: "bg-lf-amber-soft",
    verdict: "Good for dense report content: refined, legible, and less fashion-forward.",
  },
];

/**
 * Internal typography specimen page (`/type-samples`): renders candidate font
 * pairings and scale samples used while designing the brand type system.
 */
export default function TypeSamplesPage() {
  return (
    <main className="min-h-[100dvh] bg-lf-sand text-lf-espresso">
      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-lf-hairline bg-lf-card/70 px-4 text-sm font-semibold text-lf-espresso transition hover:bg-lf-card"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lf-muted">
            YardUp typography samples
          </p>
        </nav>

        <div className="grid gap-8 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">
              Current baseline: Outfit + Manrope
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-5xl font-black leading-[0.96] tracking-tight text-lf-espresso sm:text-6xl">
              Premium font directions for YardUp.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-lf-muted">
            These are more refined, serif-led specimens using real homepage copy, rent figures,
            CTA labels, and report-card UI so the choice is based on product feel instead of
            isolated alphabets.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {samples.map((sample) => (
            <article
              key={sample.name}
              className={`overflow-hidden rounded-md border border-lf-hairline bg-lf-card shadow-sm ${sample.bodyClass}`}
            >
              <div className="border-b border-lf-hairline/80 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lf-muted">
                      {sample.name}
                    </p>
                    <h2 className={`mt-1 text-2xl font-semibold ${sample.displayClass}`}>
                      {sample.display} + {sample.body}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${sample.tint} ${sample.accent}`}
                  >
                    {sample.tone}
                  </span>
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
                <div className="p-5 sm:p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lf-muted">
                    ADU income snapshot
                  </p>
                  <h3
                    className={`mt-3 text-5xl font-semibold leading-[0.96] tracking-normal text-lf-espresso sm:text-6xl ${sample.displayClass}`}
                  >
                    See what your backyard could earn.
                  </h3>
                  <p className="mt-5 max-w-md text-base leading-7 text-lf-muted">
                    YardUp estimates rent, build range, site fit, and next steps before an
                    owner spends weeks coordinating with designers or builders.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-5 text-sm font-bold text-lf-sand transition hover:bg-lf-clay"
                    >
                      Check my lot
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center rounded-md border border-lf-hairline px-5 text-sm font-bold text-lf-espresso transition hover:bg-lf-sand-2"
                    >
                      View sample report
                    </button>
                  </div>
                </div>

                <div className="border-t border-lf-hairline bg-lf-sand-2 p-5 md:border-l md:border-t-0 sm:p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lf-muted">
                    Estimated monthly rent
                  </p>
                  <p className={`mt-2 text-5xl font-black tracking-tight ${sample.accent} ${sample.displayClass}`}>
                    $2,350
                  </p>
                  <div className="mt-5 space-y-3 text-sm font-semibold text-lf-espresso">
                    {["Build range ready", "Site fit scored", "Owner packet queued"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${sample.accent}`} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-sm leading-6 text-lf-muted">{sample.verdict}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
