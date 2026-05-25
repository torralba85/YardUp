import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCurrency } from "../domain/estimator";
import type { EstimateInput, EstimateResult } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";

interface RevenueSnapshotProps {
  builderMatches: number;
  estimate: EstimateResult;
  estimateInput: EstimateInput;
  assumptionsLabel?: string;
  quotePacketReady: number;
  sentQuotes: number;
  wide: boolean;
  onAdjust?: () => void;
}

export function RevenueSnapshot({
  estimate,
  estimateInput,
  assumptionsLabel = "Starter supported-market estimate",
  wide,
  onAdjust,
}: RevenueSnapshotProps) {
  const rentLow = estimateInput.monthlyRent * 0.9;
  const rentHigh = estimateInput.monthlyRent * 1.1;

  return (
    <View style={[styles.revenuePanel, wide && styles.revenuePanelWide]}>
      <View pointerEvents="none" style={styles.mintWash} />
      <Text style={styles.revenueEyebrow}>Estimated monthly rent</Text>
      <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {formatCurrency(rentLow)}
        <Text style={styles.revenueDash}> - </Text>
        {formatCurrency(rentHigh)}
      </Text>

      <View style={styles.incomeRow}>
        <View style={styles.incomeRail} />
        <View style={styles.incomeCopy}>
          <Text style={styles.incomeLabel}>Net annual income</Text>
          <Text style={styles.incomeValue}>
            +{formatCurrency(estimate.annualNOI)}
            <Text style={styles.incomeUnit}> avg/yr</Text>
          </Text>
        </View>
      </View>

      <View style={styles.assumptionsRow}>
        <View style={styles.assumptionsCopy}>
          <Feather name="check-circle" size={16} color={colors.accent} />
          <Text style={styles.assumptionsText} numberOfLines={1}>
            {assumptionsLabel}
          </Text>
        </View>
        {onAdjust ? (
          <Pressable accessibilityRole="button" accessibilityLabel="View proforma" onPress={onAdjust} style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}>
            <Text style={styles.adjustText}>View proforma</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  revenuePanel: {
    alignSelf: "stretch",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    ...shadows.soft,
  },
  revenuePanelWide: {
    flex: 1,
  },
  mintWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mint,
    opacity: 0.22,
  },
  revenueEyebrow: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  revenueValue: {
    ...typography.display,
    color: colors.forestDeep,
    fontSize: 38,
    lineHeight: 44,
  },
  revenueDash: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 23,
    lineHeight: 29,
  },
  incomeRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
  },
  incomeRail: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    width: 4,
  },
  incomeCopy: {
    gap: 2,
  },
  incomeLabel: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  incomeValue: {
    ...typography.monoLarge,
    color: colors.accentDark,
    fontSize: 20,
    lineHeight: 25,
  },
  incomeUnit: {
    ...typography.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  assumptionsRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.md,
  },
  assumptionsCopy: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
  },
  assumptionsText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  adjustButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  adjustPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  adjustText: {
    ...typography.label,
    color: colors.accentDark,
    fontSize: 13,
  },
});
