import { renderAduOgImage } from "@/components/adu/AduOgImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SanDiegoAduPermitsOgImage() {
  return renderAduOgImage({
    kicker: "LotFoundry · San Diego ADU Permits",
    title: "Where San Diego builds ADUs",
    tagline: "Permits by neighborhood, 2023-2026",
  });
}
