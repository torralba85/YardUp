import { Platform, ViewStyle } from "react-native";

export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceStrong: "#F6F4EF",
  card: "#FFFFFF",
  text: "#171714",
  muted: "#6F716A",
  faint: "#E7E2D8",
  border: "#E3DED4",
  accent: "#2F5D50",
  accentDark: "#173F35",
  accentSoft: "#E8F1EC",
  permit: "#A76418",
  permitSoft: "#F7E8D2",
  parcel: "#2F5F80",
  parcelSoft: "#E5EEF4",
  warning: "#A76418",
  warningSoft: "#F7E8D2",
  success: "#2F5D50",
  successSoft: "#E8F1EC",
  black: "#111111",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999, // Reserved strictly for small circular icons or status dots
};

export const shadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  } as ViewStyle,
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  } as ViewStyle,
};

const sansFamily = Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" });
const serifFamily = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const monoFamily = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export const typography = {
  title: {
    fontFamily: sansFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  editorial: {
    fontFamily: serifFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: sansFamily,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700" as const,
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
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  label: {
    fontFamily: sansFamily,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 0,
    textTransform: "uppercase" as const,
  },
  mono: {
    fontFamily: monoFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: 0,
  }
};
