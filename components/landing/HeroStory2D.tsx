import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function HeroStaticFrame() {
  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center p-6">
      <svg viewBox="0 0 220 160" className="h-full w-full max-w-md" role="img" aria-label="Lot with proposed ADU and income snapshot">
        <rect x="22" y="20" width="176" height="118" fill="rgba(205,184,154,0.5)" stroke="#8C5B3F" strokeWidth="1.2" rx="2" />
        <rect x="40" y="38" width="140" height="82" fill="rgba(248,240,228,0.55)" stroke="#a98a63" strokeWidth="0.9" strokeDasharray="3 2" />
        <rect x="46" y="44" width="58" height="42" fill="#d8c6aa" stroke="#592A0F" strokeWidth="1" rx="1" />
        <path d="M42 44 L75 29 L108 44" fill="none" stroke="#592A0F" strokeWidth="3" />
        <rect x="122" y="78" width="52" height="36" fill="#e7dccb" stroke="#592A0F" strokeWidth="1" rx="1" />
        <path d="M118 78 L148 63 L178 78" fill="none" stroke="#592A0F" strokeWidth="3" />
        <rect x="130" y="88" width="14" height="12" fill="#2F4A38" />
        <rect x="152" y="88" width="10" height="16" fill="#2F4A38" />
        <text x="148" y="70" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#261307" className="font-sans">ADU</text>
      </svg>
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-md border border-lf-hairline bg-lf-card/90 px-4 py-3 backdrop-blur">
        <div className="font-display text-3xl font-black tabular-nums text-lf-espresso">$2,350</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">estimated monthly rent</div>
      </div>
    </div>
  );
}

const BEATS = [
  { kicker: "Address in", title: "Start with a lot snapshot.", body: "See the parcel, setbacks, and lot coverage before the conversation turns into guesswork." },
  { kicker: "Concept fit", title: "Place a visual ADU concept.", body: "Keep the proposed unit and the buildable envelope visible together." },
  { kicker: "Owner report", title: "Leave with the numbers.", body: "$2,350/mo rent estimate, NOI, payback, caveats, and a shareable next step." },
];

export function HeroStory2D() {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-xl">
        <p className="lf-reveal font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">ADU income snapshot</p>
        <h1 className="lf-reveal mt-3 font-display text-5xl font-extrabold leading-[0.98] text-lf-espresso">
          Know what your lot could earn.
        </h1>
        <p className="lf-reveal mt-5 text-lg leading-8 text-lf-muted">
          LotFoundry turns a backyard address into a visual ADU concept, rent estimate, and owner-ready report before you start calling builders.
        </p>
        <Link
          href="/signup"
          className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="mt-8 overflow-hidden rounded-md border border-lf-hairline bg-lf-card/70 backdrop-blur">
          <HeroStaticFrame />
        </div>
        <div className="mt-10 space-y-8">
          {BEATS.map((b) => (
            <div key={b.title} className="lf-reveal border-l-2 border-lf-clay/40 pl-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">{b.kicker}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-lf-espresso">{b.title}</h2>
              <p className="mt-1 text-lf-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
