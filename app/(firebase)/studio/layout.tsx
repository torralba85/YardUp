import type { Metadata } from "next";
import Link from "next/link";

const title = "LotFoundry Studio — feasibility and design";
const description =
  "Place an ADU on your lot and see estimated rent, build cost, and payback for your address.";

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
  return (
    <>
      {children}
      <section
        data-testid="studio-overview"
        aria-labelledby="studio-overview-heading"
        className="border-t border-lf-hairline/50 bg-lf-sand text-lf-espresso"
      >
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 id="studio-overview-heading" className="lf-section-heading">
            ADU Feasibility Studio
          </h1>
          <div className="lf-body mt-5 max-w-3xl space-y-4 text-lf-muted">
            <p>
              LotFoundry helps homeowners evaluate an accessory dwelling unit before spending money
              on plans. Search an address or open a sample parcel, place an ADU on the lot, and compare
              estimated rent, build cost, payback, setbacks, lot coverage, and zoning signals in one
              workspace. Change the unit dimensions and assumptions to see how the scenario responds,
              then save or share the feasibility snapshot when you have a direction worth exploring.
            </p>
            <p>
              The studio is designed for early planning, not permit approval. Parcel boundaries,
              zoning data, setbacks, construction costs, rents, and timelines can be incomplete or
              change over time. Treat the results as estimates that help you ask better questions,
              then verify critical dimensions and local requirements with the city, a surveyor,
              designer, contractor, lender, or other licensed professional before making a building
              or financial commitment.
            </p>
            <p>
              If you are still learning the basics, start with our city-by-city ADU rule guides,
              learn more about how LotFoundry works, or visit Help for product guidance. These public
              resources explain the assumptions behind the studio and give you a path to the source
              material before you move from feasibility into design and permitting.
            </p>
          </div>
          <nav aria-label="Studio resources" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
            <Link href="/adu/ca" className="text-lf-clay-ink underline underline-offset-4">
              California ADU rules
            </Link>
            <Link href="/about" className="text-lf-clay-ink underline underline-offset-4">
              About LotFoundry
            </Link>
            <Link href="/help" className="text-lf-clay-ink underline underline-offset-4">
              Help
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
}
