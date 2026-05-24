import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../theme";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

interface RiskIndicatorProps {
  label: string;
  level: RiskLevel;
  /** Optional 0-100 score. Shown as `score/100` in mono when provided. */
  score?: number;
  /** Main drivers behind the risk level. */
  drivers?: string[];
  /** Verification action. Renders a button only when both are provided. */
  verifyLabel?: string;
  onVerify?: () => void;
  /** Last verified date string, shown in the header. */
  verifiedAt?: string;
}

const META: Record<RiskLevel, { tint: string; soft: string; icon: keyof typeof Feather.glyphMap; word: string; fill: number }> = {
  low: { tint: colors.success, soft: colors.successSoft, icon: "check-circle", word: "Low", fill: 1 },
  moderate: { tint: colors.permit, soft: colors.permitSoft, icon: "alert-triangle", word: "Moderate", fill: 2 },
  high: { tint: colors.warning, soft: colors.warningSoft, icon: "alert-octagon", word: "High", fill: 3 },
  // Amber by default for unknowns, per design system.
  unknown: { tint: colors.permit, soft: colors.permitSoft, icon: "help-circle", word: "Needs review", fill: 0 },
};

export function RiskIndicator({ label, level, score, drivers, verifyLabel, onVerify, verifiedAt }: RiskIndicatorProps) {
  const meta = META[level];
  const showVerify = Boolean(verifyLabel && onVerify);

  return (
    <View style={[styles.card, { borderLeftColor: meta.tint }]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: meta.soft }]}>
          <Feather name={meta.icon} size={16} color={meta.tint} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>{label}</Text>
          {verifiedAt ? <Text style={styles.verifiedAt}>Verified {verifiedAt}</Text> : null}
        </View>
        <View style={[styles.levelPill, { backgroundColor: meta.soft }]}>
          <Text style={[styles.levelText, { color: meta.tint }]}>{meta.word}</Text>
        </View>
      </View>

      {typeof score === "number" ? (
        <Text style={styles.score}>
          {Math.round(score)}
          <Text style={styles.scoreUnit}>/100</Text>
        </Text>
      ) : null}

      <View style={styles.meter} accessibilityLabel={`Risk level ${meta.word}`}>
        {[1, 2, 3].map((segment) => (
          <View
            key={segment}
            style={[styles.meterSegment, segment <= meta.fill ? { backgroundColor: meta.tint } : null]}
          />
        ))}
      </View>

      {drivers && drivers.length > 0 ? (
        <View style={styles.drivers}>
          {drivers.map((driver) => (
            <View key={driver} style={styles.driverRow}>
              <Feather name="alert-circle" size={14} color={meta.tint} />
              <Text style={styles.driverText}>{driver}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showVerify ? (
        <Pressable
          accessibilityRole="button"
          onPress={onVerify}
          style={({ pressed }) => [styles.verifyButton, pressed && styles.pressed]}
        >
          <Feather name="search" size={14} color={colors.accentDark} />
          <Text style={styles.verifyText}>{verifyLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.soft,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconChip: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  label: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  verifiedAt: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  levelPill: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  levelText: {
    ...typography.label,
  },
  score: {
    ...typography.mono,
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
  },
  scoreUnit: {
    ...typography.mono,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  meter: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  meterSegment: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.full,
    flex: 1,
    height: 6,
  },
  drivers: {
    gap: spacing.xs,
  },
  driverRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  driverText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  verifyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifyText: {
    ...typography.label,
    color: colors.accentDark,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
});
