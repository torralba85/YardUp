import { renderAduOgImage } from "@/components/adu/AduOgImage";
import { aduStaticParams, getCity } from "@/lib/adu/content";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/** Per-city OG image for the rules guide; see `renderAduOgImage`. */
export function generateStaticParams() {
  return aduStaticParams();
}

export default async function AduCityOgImage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const content = getCity(state, city);
  return renderAduOgImage({
    kicker: "LotFoundry · ADU Rules (2026)",
    title: content?.city ?? "California",
    tagline: "Size, setbacks & permits",
  });
}
