import { renderAduOgImage } from "@/components/adu/AduOgImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CaliforniaJaduOgImage() {
  return renderAduOgImage({
    kicker: "LotFoundry · California Junior ADU",
    title: "Junior ADU (JADU) rules",
    tagline: "Up to 500 sq ft inside your home",
  });
}
