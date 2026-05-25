import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../theme";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "primary";
  width?: "flex" | "full";
}

export function MetricCard({ label, value, detail, tone = "default", width = "flex" }: MetricCardProps) {
  const compactValue = value.length > 9;

  return (
    <View style={[styles.card, width === "full" && styles.full, tone === "primary" && styles.primary]}>
      <Text style={[styles.label, tone === "primary" && styles.primaryLabel]}>{label}</Text>
      <Text
        style={[styles.value, compactValue && styles.compactValue, tone === "primary" && styles.primaryValue]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
      {detail ? <Text style={[styles.detail, tone === "primary" && styles.primaryDetail]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    minWidth: 148,
    padding: spacing.md,
    ...shadows.soft,
  },
  full: {
    flexBasis: "100%",
  },
  primary: {
    backgroundColor: colors.mint,
    borderColor: colors.successSoft,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  primaryLabel: {
    color: colors.accentDark,
  },
  value: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "600",
    color: colors.text,
    fontFamily: typography.editorial.fontFamily,
  },
  compactValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  primaryValue: {
    color: colors.forestDeep,
  },
  detail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryDetail: {
    color: colors.muted,
  },
});
