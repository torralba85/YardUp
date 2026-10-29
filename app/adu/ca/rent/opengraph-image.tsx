import { renderAduOgImage } from "@/components/adu/AduOgImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CaliforniaAduRentOgImage() {
  return renderAduOgImage({
    kicker: "LotFoundry · California ADU Rent",
    title: "What an ADU rents for",
    tagline: "HUD FY2027 rents for 12 counties",
  });
}
