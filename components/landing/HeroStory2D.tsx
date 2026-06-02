import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Static, fully-legible final frame: SSR-safe and the reduced-motion default. */
export function HeroStaticFrame() {
  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center p-6">
      <svg viewBox="0 0 200 150" className="h-full w-full max-w-md" role="img" aria-label="Lot with proposed ADU and income snapshot">
        <rect x="20" y="20" width="160" height="110" fill="rgba(205,184,154,0.5)" stroke="#8C5B3F" strokeWidth="1.2" rx="2" />
        <rect x="36" y="36" width="128" height="78" fill="none" stroke="#a98a63" strokeWidth="0.8" strokeDasharray="3 2" />
        <rect x="104" y="74" width="52" height="36" fill="#e7dccb" stroke="#592A0F" strokeWidth="1" rx="1" />
        <rect x="112" y="84" width="14" height="12" fill="#2F4A38" />
        <rect x="134" y="84" width="10" height="16" fill="#2F4A38" />
        <text x="130" y="68" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#261307" className="font-sans">ADU</text>
      </svg>
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-md border border-lf-hairline bg-lf-card/90 px-4 py-3 backdrop-blur">
        <div className="font-display text-3xl font-black tabular-nums text-lf-espresso">$2,350</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">estimated monthly rent</div>
      </div>
    </div>
  );
}

const BEATS = [
  { kicker: "Start with a lot", title: "Every lot holds an answer.", body: "Begin with the land you already own." },
  { kicker: "Cast an ADU", title: "A site-fit ADU, in your setbacks.", body: "Placed and sized to the rules that apply." },
  { kicker: "See the numbers", title: "$2,350 / mo estimated rent.", body: "NOI $20.6k · payback 9.8 yrs · 31% coverage." },
];

/** Mobile sequence: a static hero frame followed by scroll-revealed beats. Not pinned. */
export function HeroStory2D() {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-lf-hairline bg-lf-card/70 backdrop-blur">
          <HeroStaticFrame />
        </div>
        <h1 className="lf-reveal mt-8 font-display text-4xl font-black leading-[1.05] tracking-tight text-lf-espresso">
          See what your lot <span className="text-lf-clay">could earn.</span>
        </h1>
        <div className="mt-8 space-y-8">
          {BEATS.map((b) => (
            <div key={b.title} className="lf-reveal border-l-2 border-lf-clay/40 pl-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">{b.kicker}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-lf-espresso">{b.title}</h2>
              <p className="mt-1 text-lf-muted">{b.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
