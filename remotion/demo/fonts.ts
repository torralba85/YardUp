import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

const display = loadSpaceGrotesk("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

const sans = loadManrope("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const fonts = {
  display: display.fontFamily,
  sans: sans.fontFamily,
  mono: sans.fontFamily,
};
