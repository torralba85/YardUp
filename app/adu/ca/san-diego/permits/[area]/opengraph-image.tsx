import { renderAduOgImage } from "@/components/adu/AduOgImage";
import { SAN_DIEGO_PERMIT_STUDY as study } from "@/content/adu/ca/san-diego-permits";
import { PERMIT_AREAS, findPermitArea, permitAreaSlug } from "@/lib/adu/permit-areas";

// Static for every area: a per-area alt needs generateImageMetadata, which
// moves the card off `/opengraph-image`, the URL the Article markup cites.
export const alt = "LotFoundry San Diego ADU permit card for this planning area: units permitted 2023-2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-area OG image, replacing the shared permit-study card. */
export function generateStaticParams() {
  return PERMIT_AREAS.map((area) => ({ area: permitAreaSlug(area) }));
}

export default async function PermitAreaOgImage({ params }: { params: Promise<{ area: string }> }) {
  const area = findPermitArea((await params).area);
  const years = `${study.coverage.from.slice(0, 4)}-${study.coverage.to.slice(0, 4)}`;
  return renderAduOgImage({
    kicker: "LotFoundry · San Diego ADU Permits",
    title: area?.name ?? "San Diego",
    tagline: area ? `${area.units.toLocaleString("en-US")} units permitted, ${years}` : `Permits by neighborhood, ${years}`,
  });
}
