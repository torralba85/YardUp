import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RiskLevel } from "../domain/risk";
import { colors, radii, shadows, spacing, typography } from "../theme";

export type { RiskLevel } from "../domain/risk";

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
  moderate: { tint: colors.permit, soft: colors.permitSoft, icon: "alert-triangle", word: "Medium", fill: 2 },
  high: { tint: colors.warning, soft: colors.warningSoft, icon: "alert-octagon", word: "High", fill: 3 },
  // Amber by default for unknowns, per design system.
  unknown: { tint: colors.permit, soft: colors.permitSoft, icon: "help-circle", word: "Under review", fill: 0 },
};

export function RiskIndicator({ label, level, score, drivers, verifyLabel, onVerify, verifiedAt }: RiskIndicatorProps) {
  const meta = META[level];
  const showVerify = Boolean(verifyLabel && onVerify);
  const driverCount = drivers?.length ?? 0;
  const summary =
    driverCount > 0
      ? `${driverCount} potential ${driverCount === 1 ? "blocker" : "blockers"} identified. Verify early before pricing or builder commitments.`
      : label;

  return (
    <View style={styles.card}>
      <View style={[styles.topStripe, { backgroundColor: meta.tint }]} />
      <View style={styles.scorecard}>
        <View style={styles.riskLabelRow}>
          <Feather name={meta.icon} size={17} color={meta.tint} />
          <Text style={[styles.riskLabel, { color: meta.tint }]}>Risk assessment</Text>
        </View>
        <Text style={styles.levelWord}>{meta.word}</Text>
        <Text style={styles.summaryText}>{summary}</Text>
        <View style={styles.coveragePill}>
          <Feather name="database" size={13} color={colors.muted} />
          <Text style={styles.coverageText} numberOfLines={1}>
            {verifiedAt ? `Verified ${verifiedAt}` : label}
          </Text>
        </View>
      </View>

      {typeof score === "number" ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.score}>
            {Math.round(score)}
            <Text style={styles.scoreUnit}>/100</Text>
          </Text>
        </View>
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
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
    ...shadows.soft,
  },
  topStripe: {
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scorecard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  riskLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  riskLabel: {
    ...typography.label,
    textTransform: "uppercase",
  },
  levelWord: {
    ...typography.display,
    color: colors.forestDeep,
    fontSize: 44,
    lineHeight: 50,
    textAlign: "center",
  },
  summaryText: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 390,
    textAlign: "center",
  },
  coveragePill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  coverageText: {
    ...typography.mono,
    color: colors.muted,
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  scoreRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  scoreLabel: {
    ...typography.label,
    color: colors.muted,
  },
  score: {
    ...typography.mono,
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
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
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
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
