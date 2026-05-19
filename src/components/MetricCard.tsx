import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

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
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    gap: spacing.xs,
    minWidth: 148,
    padding: spacing.md,
  },
  full: {
    flexBasis: "100%",
  },
  primary: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  primaryLabel: {
    color: colors.text,
  },
  value: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
  },
  compactValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  primaryValue: {
    color: colors.text,
  },
  detail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryDetail: {
    color: colors.text,
  },
});
