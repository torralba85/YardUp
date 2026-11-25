import type { Metadata } from "next";
import Link from "next/link";
import { StudioOfferSummary } from "@/components/studio/StudioOfferSummary";
import { SITE_NAME } from "@/lib/site-identity";

// Matches the page's H1, "ADU Feasibility Studio", so the title leads with ADU.
const title = "ADU Feasibility Studio: Your Lot in 3D | LotFoundry";
const description =
  "Place an ADU on your lot in 3D, snap it inside the modeled setbacks and see a free rent range. The $29 certificate adds build cost, net income and payback.";

/**
 * Studio metadata.
 *
 * The Open Graph block is spelled out rather than inherited: `/studio` is the
 * URL that actually gets shared — the demo-lot link in outreach and social
 * posts points here — and without its own `openGraph` entry every share
 * rendered the root page's title, description and artwork instead of the
 * studio's.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/studio" },
  openGraph: {
    title,
    description,
    url: "/studio",
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: "/lotfoundry-og.png",
        width: 1200,
        height: 630,
        alt: "LotFoundry — ADU planning for homeowners",
      },
    ],
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Desktop: the overview is a fixed-height bar at the bottom of the viewport
  // (StudioShell subtracts `--studio-guide-bar`), and it opens upward over the
  // Studio. Below it used to sit under a full-height shell, which gave the page
  // a second scroll that slid the Studio's top controls out of view.
  return (
    <div className="bg-lot-ground-dark lg:[--studio-guide-bar:3rem]">
      {children}
      <section
        data-testid="studio-overview"
        aria-labelledby="studio-overview-heading"
        className="border-t border-lot-line bg-lot-chalk pb-[env(safe-area-inset-bottom,0px)] text-lot-ink lg:relative lg:z-(--z-index-sheet) lg:ml-[248px] lg:h-(--studio-guide-bar) lg:pb-0"
      >
        <details className="group lg:h-full">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 px-[4.5%] py-3 hover:bg-lot-line/25 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink lg:h-full lg:min-h-0 lg:py-0 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 lg:flex lg:items-baseline lg:gap-3">
              <p className="lf-kicker text-lot-stone">Planning guide &amp; methodology</p>
              <h1
                id="studio-overview-heading"
                className="font-display text-lg font-medium tracking-[-0.025em] text-pretty lg:text-base"
              >
                ADU Feasibility Studio
              </h1>
            </div>
            <span
              aria-hidden="true"
              className="shrink-0 text-2xl leading-none motion-safe:transition-transform motion-safe:duration-(--duration-disclosure) group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="overscroll-contain border-t border-lot-line px-[4.5%] py-8 lg:absolute lg:inset-x-0 lg:bottom-full lg:max-h-[min(70dvh,560px)] lg:overflow-y-auto lg:bg-lot-chalk">
            <div className="grid max-w-[1200px] gap-6 text-pretty text-sm leading-6 text-lot-stone xl:grid-cols-2">
              <div>
                <h2 className="font-display text-lg font-medium text-lot-ink">What the address check covers</h2>
                <p className="mt-2">
                  Search an address or open the sample parcel, place a modeled ADU, and compare
                  estimated build cost, rent, payback, setbacks and lot coverage. Change the unit
                  dimensions and assumptions to compare a smaller or larger project before ordering plans.
                  Parcel and zoning coverage varies by location; finding an address does not mean every
                  local rule or property record is available.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-medium text-lot-ink">When a result needs verification</h2>
                <p className="mt-2">
                  A mapped parcel is not a boundary survey. Missing zoning fields may use planning
                  assumptions, and a modeled fit does not establish legal placement. Check the source
                  and confidence notes in your result. Easements, utilities, overlays and site conditions
                  still need review with the city and relevant professionals. Rent and construction
                  figures are estimates, not contractor quotes, appraisals or permit approval.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-medium text-lot-ink">Free exploration and the paid certificate</h2>
                <StudioOfferSummary />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium text-lot-ink">See the sample and the assumptions</h2>
                <p className="mt-2">
                  Read the public sample certificate to see the report format before paying.
                  The methodology explains how cost, rent and payback are modeled; city guides
                  point to local requirements. Verify critical dimensions and rules before committing
                  to design, construction or financing.
                </p>
              </div>
            </div>
            <nav
              aria-label="Studio resources"
              className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"
            >
              <Link href="/sample-certificate/san-diego" prefetch={false} className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
                Sample certificate
              </Link>
              <Link href="/adu/how-we-estimate" prefetch={false} className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
                Cost and rent methodology
              </Link>
              <Link href="/adu/ca" className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
                California ADU rules
              </Link>
              <Link href="/about" className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
                About LotFoundry
              </Link>
              <Link href="/help" className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
                Help
              </Link>
            </nav>
          </div>
        </details>
      </section>
    </div>
  );
}
