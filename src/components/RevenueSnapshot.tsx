import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCurrency, formatCurrencyCompact, formatPercent } from "../domain/estimator";
import type { EstimateInput, EstimateResult } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { YardUpLogo } from "./YardUpLogo";

interface RevenueSnapshotProps {
  builderMatches: number;
  estimate: EstimateResult;
  estimateInput: EstimateInput;
  projectName?: string;
  quotePacketReady: number;
  sentQuotes: number;
  wide: boolean;
  onAdjust?: () => void;
}

export function RevenueSnapshot({
  builderMatches,
  estimate,
  estimateInput,
  projectName,
  quotePacketReady,
  sentQuotes,
  wide,
  onAdjust,
}: RevenueSnapshotProps) {
  const costLow = estimate.totalCost * 0.9;
  const costHigh = estimate.totalCost * 1.1;

  return (
    <LinearGradient colors={[colors.forestDeep, colors.forest, "#1D5639"]} style={[styles.revenuePanel, wide && styles.revenuePanelWide]}>
      <View style={styles.revenueTop}>
        <YardUpLogo size={29} tone="light" />
        <Text style={styles.revenueEyebrow}>Income first</Text>
      </View>
      <View style={styles.revenueHero}>
        <Text style={styles.revenueHeadline}>Your backyard could be earning rent.</Text>
        <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74}>
          {formatCurrency(estimateInput.monthlyRent)}
          <Text style={styles.revenueUnit}>/mo</Text>
        </Text>
        <Text style={styles.revenueSubcopy}>{projectName ?? "Start with a supported-market property study"}</Text>
      </View>
      <View style={styles.revenueGrid}>
        <RevenueMetric label="Net annual" value={formatCurrency(estimate.annualNOI)} />
        <RevenueMetric label="Cost range" value={`${formatCurrencyCompact(costLow)}-${formatCurrencyCompact(costHigh)}`} />
        <RevenueMetric label="Payback" value={`${estimate.paybackYears.toFixed(1)} yr`} />
        <RevenueMetric label="ROI" value={formatPercent(estimate.roi)} />
      </View>
      <View style={styles.assumptionsRow}>
        <View style={styles.assumptionsCopy}>
          <Feather name="sliders" size={13} color={colors.mint} />
          <Text style={styles.assumptionsText} numberOfLines={1}>
            Assumes {formatCurrency(estimateInput.monthlyRent)}/mo rent · estimate, not a guarantee
          </Text>
        </View>
        {onAdjust ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Adjust assumptions" onPress={onAdjust} style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}>
            <Text style={styles.adjustText}>Adjust assumptions</Text>
            <Feather name="chevron-right" size={14} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.readinessStrip}>
        <ReadinessItem icon="users" label="Builder matches" value={`${builderMatches}`} />
        <ReadinessItem icon="file-text" label="Quote packet" value={`${Math.min(quotePacketReady, 6)}/6`} />
        <ReadinessItem icon="send" label="Quotes sent" value={`${sentQuotes}`} />
      </View>
    </LinearGradient>
  );
}

function RevenueMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueMetricLabel}>{label}</Text>
      <Text style={styles.revenueMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.58}>
        {value}
      </Text>
    </View>
  );
}

function ReadinessItem({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.readinessItem}>
      <Feather name={icon} size={15} color={colors.mint} />
      <View style={styles.readinessCopy}>
        <Text style={styles.readinessLabel}>{label}</Text>
        <Text style={styles.readinessValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  revenuePanel: {
    alignSelf: "stretch",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    minHeight: 372,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadows.medium,
  },
  revenuePanelWide: {
    flex: 1.55,
  },
  revenueTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  revenueEyebrow: {
    ...typography.label,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.full,
    borderWidth: 1,
    color: colors.mint,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  revenueHero: {
    gap: spacing.sm,
    maxWidth: 560,
  },
  revenueHeadline: {
    ...typography.editorial,
    color: colors.inkSoft,
    fontSize: 40,
    lineHeight: 44,
    maxWidth: 430,
  },
  revenueValue: {
    ...typography.editorial,
    color: colors.mint,
    fontSize: 64,
    lineHeight: 68,
  },
  revenueUnit: {
    ...typography.h2,
    color: colors.inkSoft,
    fontSize: 19,
    lineHeight: 24,
  },
  revenueSubcopy: {
    ...typography.body,
    color: "rgba(237,243,238,0.78)",
    maxWidth: 440,
  },
  revenueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  revenueMetric: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 132,
    flexGrow: 1,
    gap: 2,
    padding: spacing.sm,
  },
  revenueMetricLabel: {
    ...typography.label,
    color: "rgba(237,243,238,0.66)",
    fontSize: 10,
  },
  revenueMetricValue: {
    ...typography.mono,
    color: colors.canvas,
    fontSize: 15,
    lineHeight: 20,
  },
  assumptionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  assumptionsCopy: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
  },
  assumptionsText: {
    ...typography.body,
    color: "rgba(237,243,238,0.74)",
    fontSize: 12,
    lineHeight: 16,
  },
  adjustButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  adjustPressed: {
    opacity: 0.85,
  },
  adjustText: {
    ...typography.label,
    color: colors.inkSoft,
  },
  readinessStrip: {
    borderTopColor: "rgba(255,255,255,0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  readinessItem: {
    alignItems: "center",
    flexBasis: 150,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
  },
  readinessCopy: {
    flex: 1,
    gap: 1,
  },
  readinessLabel: {
    ...typography.label,
    color: "rgba(237,243,238,0.62)",
    fontSize: 10,
  },
  readinessValue: {
    ...typography.h2,
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 20,
  },
});
