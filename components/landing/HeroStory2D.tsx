import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function HeroStaticFrame() {
  return (
    <div className="relative flex h-full min-h-[460px] items-center justify-center overflow-hidden p-4 sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(200,146,42,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(47,74,56,0.16),transparent_34%),linear-gradient(135deg,rgba(251,246,238,0.96),rgba(242,229,213,0.82))]"
      />
      <div
        aria-hidden
        className="absolute inset-x-8 top-8 h-28 rounded-full bg-lf-amber-soft blur-3xl"
      />

      <div className="relative w-full max-w-xl rounded-[2rem] border border-white/70 bg-lf-card/88 p-3 shadow-[0_28px_80px_-48px_rgba(38,19,7,0.75)] backdrop-blur md:p-4">
        <div className="flex items-center justify-between border-b border-lf-hairline/70 px-3 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-lf-muted">YardUp scan</p>
            <p className="mt-1 font-display text-xl font-black text-lf-espresso">Backyard feasibility</p>
          </div>
          <div className="rounded-full border border-lf-forest/20 bg-lf-forest-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-forest">
            Ready
          </div>
        </div>

        <div className="grid gap-3 p-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-3xl border border-lf-hairline bg-lf-sand-2 shadow-inner">
            <svg
              viewBox="0 0 420 330"
              className="h-full min-h-[300px] w-full"
              role="img"
              aria-label="Polished parcel map with proposed ADU, buildable envelope, and rental estimate"
            >
              <defs>
                <linearGradient id="yardup-parcel" x1="62" y1="36" x2="344" y2="278" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E9D4B7" />
                  <stop offset="1" stopColor="#CDB89A" />
                </linearGradient>
                <linearGradient id="yardup-house" x1="118" y1="86" x2="246" y2="182" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F8F0E4" />
                  <stop offset="1" stopColor="#D8C6AA" />
                </linearGradient>
                <linearGradient id="yardup-adu" x1="216" y1="164" x2="322" y2="248" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FBF6EE" />
                  <stop offset="1" stopColor="#E7DCCB" />
                </linearGradient>
                <filter id="yardup-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#261307" floodOpacity="0.18" />
                </filter>
                <pattern id="yardup-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E0CDB4" strokeOpacity="0.48" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width="420" height="330" fill="#F8F0E4" />
              <rect width="420" height="330" fill="url(#yardup-grid)" />
              <path d="M78 42 352 70 334 280 54 254Z" fill="url(#yardup-parcel)" stroke="#8C5B3F" strokeWidth="2" />
              <path d="M105 75 315 96 303 246 85 226Z" fill="#FBF6EE" fillOpacity="0.36" stroke="#8C5B3F" strokeDasharray="8 7" strokeWidth="1.8" />
              <path d="M129 112 250 123 241 194 119 183Z" fill="url(#yardup-house)" filter="url(#yardup-shadow)" stroke="#592A0F" strokeWidth="2" />
              <path d="M112 116 190 76 268 126" fill="none" stroke="#592A0F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10" />
              <rect x="142" y="132" width="28" height="24" rx="3" fill="#2F4A38" opacity="0.92" />
              <rect x="188" y="137" width="32" height="44" rx="3" fill="#2F4A38" opacity="0.92" />
              <path d="M221 194 288 176 318 236 243 256Z" fill="#2F4A38" fillOpacity="0.09" stroke="#2F4A38" strokeDasharray="5 5" strokeWidth="2" />
              <path d="M228 174 304 183 296 237 218 229Z" fill="url(#yardup-adu)" filter="url(#yardup-shadow)" stroke="#592A0F" strokeWidth="2" />
              <path d="M218 176 267 146 315 185" fill="none" stroke="#592A0F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
              <rect x="241" y="193" width="21" height="20" rx="3" fill="#2F4A38" />
              <rect x="271" y="197" width="19" height="33" rx="3" fill="#2F4A38" />
              <path d="M169 183 C172 214 194 230 220 229" fill="none" stroke="#BFA58E" strokeLinecap="round" strokeWidth="10" />
              <circle cx="82" cy="83" r="14" fill="#2F4A38" opacity="0.92" />
              <circle cx="337" cy="112" r="18" fill="#2F4A38" opacity="0.86" />
              <circle cx="72" cy="226" r="17" fill="#2F4A38" opacity="0.86" />
              <g transform="translate(268 42)">
                <rect width="118" height="48" rx="16" fill="#261307" opacity="0.92" />
                <text x="16" y="20" fill="#F2E5D5" fontSize="10" fontWeight="700" letterSpacing="1.3">RENT RANGE</text>
                <text x="16" y="38" fill="#F2E5D5" fontSize="18" fontWeight="900">$2.1k-$2.6k</text>
              </g>
            </svg>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-lf-hairline bg-white/55 p-4 shadow-[0_18px_50px_-38px_rgba(38,19,7,0.65)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-lf-muted">Estimated monthly rent</p>
              <div className="mt-2 font-display text-4xl font-black tracking-[-0.03em] text-lf-espresso">$2,350</div>
              <div className="mt-4 h-2 rounded-full bg-lf-taupe-soft">
                <div className="h-full w-[72%] rounded-full bg-lf-forest" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-lf-hairline bg-white/50 p-4">
                <p className="font-display text-2xl font-black text-lf-espresso">31%</p>
                <p className="mt-1 text-xs leading-5 text-lf-muted">lot coverage</p>
              </div>
              <div className="rounded-2xl border border-lf-hairline bg-white/50 p-4">
                <p className="font-display text-2xl font-black text-lf-espresso">9.8</p>
                <p className="mt-1 text-xs leading-5 text-lf-muted">year payback</p>
              </div>
            </div>
            <div className="rounded-3xl border border-lf-forest/20 bg-lf-forest px-4 py-4 text-lf-sand shadow-[0_20px_60px_-42px_rgba(38,19,7,0.8)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-75">Owner packet</p>
              <p className="mt-2 font-display text-xl font-bold">Visual, numbers, and next steps in one clean report.</p>
            </div>
          </div>
        </div>
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
    <section className="px-6 pb-16 pt-10 md:pb-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="lf-reveal font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">ADU income snapshot</p>
          <h1 className="lf-reveal mt-3 max-w-xl font-display text-5xl font-black leading-[0.98] tracking-[-0.03em] text-lf-espresso md:text-7xl">
            Know what your lot could earn.
          </h1>
          <p className="lf-reveal mt-5 max-w-lg text-lg leading-8 text-lf-muted">
            LotFoundry turns a backyard address into a visual ADU concept, rent estimate, and owner-ready report before you start calling builders.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
            {BEATS.map((b) => (
              <div key={b.title} className="lf-reveal border-l-2 border-lf-clay/40 pl-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">{b.kicker}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-lf-espresso">{b.title}</h2>
                <p className="mt-1 text-lf-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-lf-hairline bg-lf-card/70 backdrop-blur">
          <HeroStaticFrame />
        </div>
      </div>
    </section>
  );
}
