import { renderAduOgImage } from "@/components/adu/AduOgImage";

export const alt = "LotFoundry California ADU cost card: what to budget in 2026, by size, fees and quote scope";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CaliforniaAduCostOgImage() {
  return renderAduOgImage({
    kicker: "LotFoundry · California ADU Cost",
    title: "What to budget in 2026",
    tagline: "Cost by size, fees & quote scope",
  });
}
