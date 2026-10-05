import { renderAduOgImage } from "@/components/adu/AduOgImage";
import { aduCostStaticParams, getCity } from "@/lib/adu/content";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/** Per-city OG image for the cost page; see `renderAduOgImage`. */
export function generateStaticParams() {
  return aduCostStaticParams();
}

export default async function AduCityCostOgImage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const content = getCity(state, city);
  return renderAduOgImage({
    kicker: "LotFoundry · ADU Cost (2026)",
    title: content?.city ?? "California",
    tagline: "Build cost, rent & payback",
  });
}
