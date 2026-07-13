import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadLibreFranklin } from "@remotion/google-fonts/LibreFranklin";
import { loadFont as loadIBMPlexMono } from "@remotion/google-fonts/IBMPlexMono";

const display = loadFraunces("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

const sans = loadLibreFranklin("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = loadIBMPlexMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const fonts = {
  display: display.fontFamily,
  sans: sans.fontFamily,
  mono: mono.fontFamily,
};
