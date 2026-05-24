import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

interface YardUpMarkProps {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

interface YardUpLogoProps extends YardUpMarkProps {
  showWordmark?: boolean;
  tone?: "dark" | "light";
}

export function YardUpMark({ color = colors.emerald, size = 34, style }: YardUpMarkProps) {
  const stroke = Math.max(3, size * 0.11);

  return (
    <View style={[styles.mark, { height: size, width: size }, style]} accessible accessibilityLabel="YardUp mark">
      <View
        style={[
          styles.stroke,
          {
            backgroundColor: color,
            borderRadius: stroke,
            height: stroke,
            left: size * 0.18,
            top: size * 0.34,
            transform: [{ rotate: "-39deg" }],
            width: size * 0.42,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          {
            backgroundColor: color,
            borderRadius: stroke,
            height: stroke,
            right: size * 0.18,
            top: size * 0.34,
            transform: [{ rotate: "39deg" }],
            width: size * 0.42,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          {
            backgroundColor: color,
            borderRadius: stroke,
            height: size * 0.45,
            left: (size - stroke) / 2,
            top: size * 0.28,
            width: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          {
            backgroundColor: color,
            borderRadius: stroke,
            bottom: size * 0.14,
            height: stroke,
            left: size * 0.28,
            width: size * 0.44,
          },
        ]}
      />
    </View>
  );
}

export function YardUpLogo({
  color,
  showWordmark = true,
  size = 34,
  style,
  tone = "dark",
}: YardUpLogoProps) {
  const markColor = color ?? (tone === "light" ? colors.mint : colors.emerald);
  const wordColor = tone === "light" ? colors.inkSoft : colors.text;

  return (
    <View style={[styles.logo, style]} accessible accessibilityLabel="YardUp">
      <YardUpMark color={markColor} size={size} />
      {showWordmark ? (
        <Text style={[styles.wordmark, { color: wordColor, fontSize: Math.max(22, size * 0.84), lineHeight: Math.max(25, size * 0.92) }]}>
          Yard<Text style={{ color: markColor }}>Up</Text>
        </Text>
      ) : null}
    </View>
  );
}

export function YardUpAppIcon({ size = 42 }: { size?: number }) {
  return (
    <View style={[styles.icon, { borderRadius: Math.max(radii.md, size * 0.24), height: size, width: size }]}>
      <YardUpMark color={colors.canvas} size={size * 0.56} />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  mark: {
    position: "relative",
  },
  stroke: {
    position: "absolute",
  },
  wordmark: {
    fontFamily: typography.title.fontFamily,
    fontWeight: "800",
    letterSpacing: 0,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.emerald,
    justifyContent: "center",
  },
});
