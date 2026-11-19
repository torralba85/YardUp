import { renderAduOgImage } from "@/components/adu/AduOgImage";

// Without this file the route fell through to the `[state]/[city]` card and
// shared as "California · Size, setbacks & permits", and the page emitted no
// `og:image` at all because its `openGraph` block lists none.
export const alt = "LotFoundry California ADU eligibility card: the 5 checks that decide whether you can build in 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CaliforniaAduEligibilityOgImage() {
  return renderAduOgImage({
    kicker: "LotFoundry · California ADU Rules (2026)",
    title: "Can I build an ADU?",
    tagline: "Zoning, fire, coastal, utilities & HOA",
  });
}
