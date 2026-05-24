import { Platform, ViewStyle } from "react-native";

export const colors = {
  background: "#F6F4EE",
  canvas: "#FFFFFF",
  surface: "#F6F4EE",
  surfaceStrong: "#EFEEE7",
  card: "#FFFFFF",
  text: "#15231C",
  muted: "#566159",
  faint: "#8C968D",
  border: "#E5E3D9",
  accent: "#1F9D63",
  accentDark: "#0E2C20",
  accentSoft: "#EBF6EF",
  mint: "#DCF1E5",
  mintSoft: "#EBF6EF",
  forestDeep: "#0E2C20",
  forest: "#143D2B",
  emerald: "#1F9D63",
  emeraldPress: "#177A4D",
  inkSoft: "#EDF3EE",
  permit: "#C1760D",
  permitSoft: "#FFF1D7",
  parcel: "#0D5DB8",
  parcelSoft: "#E4F0FF",
  warning: "#D1583F",
  warningSoft: "#FDE3DA",
  success: "#1F9D63",
  successSoft: "#DCF1E5",
  black: "#10110F",
  ink: "#0E2C20",
  ink2: "#143D2B",
  rail: "#0E2C20",
  clay: "#C9743F",
  blueprint: "#075EBC",
  brass: "#E0A33E",
  paper: "#F6F4EE",
  highlighter: "#CFF86D",
  coral: "#F07052",
  fog: "#EBF6EF",
  grid: "rgba(31,157,99,0.1)",
  veil: "rgba(21,35,28,0.07)",
  line: "rgba(21,35,28,0.12)",
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
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  full: 9999, // Reserved strictly for small circular icons or status dots
};

export const shadows = {
  soft: {
    shadowColor: "#14281E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 1,
  } as ViewStyle,
  medium: {
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 2,
  } as ViewStyle,
  crisp: {
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 1,
  } as ViewStyle,
};

const sansFamily = Platform.select({ ios: "Avenir Next", android: "sans-serif", default: "Hanken Grotesk, Aptos, Segoe UI, sans-serif" });
const serifFamily = Platform.select({ ios: "Iowan Old Style", android: "serif", default: "Fraunces, Georgia, serif" });
const monoFamily = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export const typography = {
  title: {
    fontFamily: sansFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  editorial: {
    fontFamily: serifFamily,
    fontSize: 35,
    lineHeight: 41,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: sansFamily,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: sansFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: sansFamily,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  label: {
    fontFamily: sansFamily,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 0,
    textTransform: "none" as const,
  },
  mono: {
    fontFamily: monoFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: 0,
  }
};
