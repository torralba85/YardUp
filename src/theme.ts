import { Platform, ViewStyle } from "react-native";

/**
 * LOTFOUNDRY palette — warm charcoal + cream structural neutrals with a
 * Capital Brass accent. Semantic colors are unchanged: emerald = revenue,
 * amber = permits, blue = builders, coral = error. The sanctioned tokens are
 * the ones DESIGN.md names explicitly; aliases keep older callsites compiling
 * without fragmenting the visual system. New code should prefer the
 * sanctioned names.
 */
export const colors = {
  // Surfaces
  background: "#F2EEE4",
  paper: "#F2EEE4",
  surface: "#F2EEE4",
  surfaceStrong: "#E8E3D6",
  canvas: "#FFFFFF",
  card: "#FFFFFF",
  inkSoft: "#EFEADF",

  // Brand
  text: "#211E19",
  muted: "#6B645A",
  faint: "#9C958A",
  border: "#E3DDD0",
  line: "rgba(33,30,25,0.12)",
  veil: "rgba(33,30,25,0.07)",

  // Revenue green (sanctioned: the income / readiness color)
  emerald: "#1F9D63",
  emeraldPress: "#177A4D",
  accent: "#1F9D63",
  accentDark: "#0E2C20",
  accentSoft: "#EBF6EF",
  success: "#1F9D63",
  successSoft: "#DCF1E5",
  mint: "#DCF1E5",
  mintSoft: "#EBF6EF",

  // Charcoal structure (dark grounds, rails, headers)
  forestDeep: "#1C1A16",
  forest: "#26231E",
  ink: "#1C1A16",
  ink2: "#26231E",
  rail: "#1C1A16",
  black: "#141310",

  // Cash highlight (rare emphasis — selected state, money opportunity)
  highlighter: "#CFF86D",

  // Permit amber (verification needed / unknown / mild risk)
  permit: "#C1760D",
  permitSoft: "#FFF1D7",

  // Builder blue (builder match, quote packet movement, external action).
  // `blueprint` and `parcel` are aliases for the single sanctioned Builder Blue.
  parcel: "#0D5DB8",
  parcelSoft: "#E4F0FF",
  blueprint: "#0D5DB8",

  // Error / blocked
  warning: "#D1583F",
  warningSoft: "#FDE3DA",
  coral: "#D1583F",

  // Warmth accent — used sparingly for "active project" warmth on card rails
  // and the wizard's progress marker. Distinct from permit amber semantically.
  clay: "#C9743F",

  // Grid wash used behind sketches; kept as a single hint of the brand grid.
  grid: "rgba(31,157,99,0.1)",

  // Capital Brass — premium value marker for ROI chips, valuation badges, milestone states.
  // Use sparingly; it signals realized wealth, not generic emphasis.
  capitalBrass: "#A47A3B",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radii = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 8,
  full: 9999, // Reserved strictly for small circular icons or status dots
};

export const shadows = {
  soft: {
    shadowColor: "#14281E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  } as ViewStyle,
  medium: {
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  } as ViewStyle,
  crisp: {
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  } as ViewStyle,
};

/**
 * Font families. expo-google-fonts loads Inter Tight, Fraunces, and IBM
 * Plex Mono at app boot (see app/_layout.tsx). When the loader is still
 * running, the fallback chain renders the platform default so the UI doesn't
 * flash unstyled.
 */
// expo-google-fonts registers @font-face with the suffixed weight name on
// every platform (e.g. "InterTight_400Regular"). Web fallback chains can
// append system fonts after the loaded name so the page doesn't flash blank
// if a face hasn't fetched yet.
const sansFamily = Platform.select({
  default: "InterTight_400Regular, Aptos, Segoe UI, sans-serif",
  ios: "InterTight_400Regular",
  android: "InterTight_400Regular",
}) as string;

const sansBold = Platform.select({
  default: "InterTight_700Bold, Aptos, Segoe UI, sans-serif",
  ios: "InterTight_700Bold",
  android: "InterTight_700Bold",
}) as string;

const sansExtra = Platform.select({
  default: "InterTight_800ExtraBold, Aptos, Segoe UI, sans-serif",
  ios: "InterTight_800ExtraBold",
  android: "InterTight_800ExtraBold",
}) as string;

const serifFamily = Platform.select({
  default: "Fraunces_600SemiBold, Georgia, serif",
  ios: "Fraunces_600SemiBold",
  android: "Fraunces_600SemiBold",
}) as string;

const monoFamily = Platform.select({
  default: "IBMPlexMono_500Medium, ui-monospace, Menlo, monospace",
  ios: "IBMPlexMono_500Medium",
  android: "IBMPlexMono_500Medium",
}) as string;

const monoBold = Platform.select({
  default: "IBMPlexMono_600SemiBold, ui-monospace, Menlo, monospace",
  ios: "IBMPlexMono_600SemiBold",
  android: "IBMPlexMono_600SemiBold",
}) as string;

export const fonts = {
  sansFamily,
  sansBold,
  sansExtra,
  serifFamily,
  monoFamily,
  monoBold,
};

export const typography = {
  // Display — Fraunces, for revenue heroes and editorial moments.
  display: {
    fontFamily: serifFamily,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  editorial: {
    fontFamily: serifFamily,
    fontSize: 35,
    lineHeight: 41,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  // Screen title (DESIGN.md: 30/36, Inter Tight 800)
  title: {
    fontFamily: sansExtra,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  // Section title (DESIGN.md: 20/26, Inter Tight 800)
  h1: {
    fontFamily: sansExtra,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  // Card title (DESIGN.md: 16/21, Inter Tight 700)
  h2: {
    fontFamily: sansBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  // Body (DESIGN.md: 14/21, Inter Tight 400)
  body: {
    fontFamily: sansFamily,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  // Label (DESIGN.md: 11/16, Inter Tight 700)
  label: {
    fontFamily: sansBold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 0,
    textTransform: "none" as const,
  },
  // Tabular numbers (DESIGN.md: 14/20, IBM Plex Mono 500)
  mono: {
    fontFamily: monoFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  // Large tabular numbers (DESIGN.md: 28/34, IBM Plex Mono 600)
  monoLarge: {
    fontFamily: monoBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
};
