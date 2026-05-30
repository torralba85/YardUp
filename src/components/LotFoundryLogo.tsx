import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

/**
 * LOTFOUNDRY "Foundation Monogram" mark — an interlocking L + F built as a
 * solid geometric block. LOT reads in charcoal (structure / the lot), FOUNDRY
 * in Capital Brass (realized value / the foundry). Rendered from Views so it
 * stays crisp at any size without an SVG dependency.
 */
const CHARCOAL = colors.text;
const BRASS = colors.capitalBrass;

interface MarkProps {
  charcoal?: string;
  brass?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

interface LogoProps extends MarkProps {
  showWordmark?: boolean;
  tone?: "dark" | "light";
}

export function LotFoundryMark({ charcoal = CHARCOAL, brass = BRASS, size = 34, style }: MarkProps) {
  const r = Math.max(1.5, size * 0.05);
  const bar = (s: ViewStyle): ViewStyle => ({ position: "absolute", borderRadius: r, ...s });

  return (
    <View
      style={[{ height: size, width: size }, style]}
      accessible
      accessibilityLabel="LOTFOUNDRY mark"
    >
      {/* L — charcoal: left stem + base */}
      <View style={bar({ backgroundColor: charcoal, left: size * 0.1, top: size * 0.1, width: size * 0.2, height: size * 0.8 })} />
      <View style={bar({ backgroundColor: charcoal, left: size * 0.1, bottom: size * 0.1, width: size * 0.62, height: size * 0.2 })} />
      {/* F — brass: stem + top arm + mid arm */}
      <View style={bar({ backgroundColor: brass, left: size * 0.46, top: size * 0.1, width: size * 0.18, height: size * 0.8 })} />
      <View style={bar({ backgroundColor: brass, left: size * 0.46, top: size * 0.1, width: size * 0.44, height: size * 0.18 })} />
      <View style={bar({ backgroundColor: brass, left: size * 0.46, top: size * 0.39, width: size * 0.34, height: size * 0.16 })} />
    </View>
  );
}

export function LotFoundryLogo({
  charcoal,
  brass,
  showWordmark = true,
  size = 34,
  style,
  tone = "dark",
}: LogoProps) {
  const lotColor = charcoal ?? (tone === "light" ? colors.paper : colors.text);
  const foundryColor = brass ?? colors.capitalBrass;

  return (
    <View style={[styles.logo, style]} accessible accessibilityLabel="LOTFOUNDRY">
      <LotFoundryMark charcoal={lotColor} brass={foundryColor} size={size} />
      {showWordmark ? (
        <Text
          style={[
            styles.wordmark,
            { fontSize: Math.max(18, size * 0.62), lineHeight: Math.max(20, size * 0.7) },
          ]}
        >
          <Text style={{ color: lotColor }}>LOT</Text>
          <Text style={{ color: foundryColor }}>FOUNDRY</Text>
        </Text>
      ) : null}
    </View>
  );
}

export function LotFoundryAppIcon({ size = 42 }: { size?: number }) {
  return (
    <View
      style={[
        styles.icon,
        { borderRadius: Math.max(radii.md, size * 0.24), height: size, width: size },
      ]}
    >
      <LotFoundryMark size={size * 0.58} />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  wordmark: {
    fontFamily: typography.title.fontFamily,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.paper,
    justifyContent: "center",
  },
});
