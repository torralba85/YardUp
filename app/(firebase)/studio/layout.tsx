import type { Metadata } from "next";

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
  return children;
}
