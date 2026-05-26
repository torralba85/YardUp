import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { EstimateForm } from "../../src/components/EstimateForm";
import { MetricCard } from "../../src/components/MetricCard";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import type { EstimateInput } from "../../src/domain/types";
import { getEstimateDefaults, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function EstimateScreen() {
  const project = useActiveProject();
  const saveEstimate = useAppStore((state) => state.saveEstimate);

  const handleSubmit = async (input: EstimateInput) => {
    if (!project) return;
    await saveEstimate(project.id, input);
  };

  const estimate = project?.lastEstimate;
  const estimateInput = getEstimateDefaults(project);

  return (
    <Screen
      eyebrow="Income model"
      title="Estimate"
      subtitle="Net income, cost range, value range, and payback under explicit assumptions."
    >
      {project ? (
        <LinearGradient colors={[colors.canvas, colors.surface]} style={styles.projectCard}>
          <View style={styles.projectIcon}>
            <Feather name="activity" size={18} color={colors.accentDark} />
          </View>
          <View style={styles.projectBody}>
            <Text style={styles.projectLabel}>Income model</Text>
            <Text style={styles.projectTitle}>{project.name}</Text>
            <Text style={styles.projectText}>{project.address}</Text>
          </View>
        </LinearGradient>
      ) : null}

      {estimate ? (
        <>
          <SectionHeader title="Decision summary" action="estimated range" />
          <View style={styles.modelSheet}>
            <View style={styles.noiHero}>
              <Text style={styles.noiLabel}>Net annual income</Text>
              <Text style={styles.noiValue}>+{formatCurrency(estimate.annualNOI)}</Text>
              <Text style={styles.noiDetail}>after modeled operating expenses</Text>
            </View>
            <View style={styles.sheetRows}>
              <ModelRow label="Gross annual rent" value={formatCurrency(estimate.annualRent)} />
              <ModelRow label="Operating expenses" value={`-${formatCurrency(estimate.annualOpEx)}`} />
              <ModelRow
                label="Estimated cost range"
                value={`${formatCurrencyCompact(estimate.totalCost * 0.9)}-${formatCurrencyCompact(estimate.totalCost * 1.1)}`}
              />
              <ModelRow label="Payback period" value={`${estimate.paybackYears.toFixed(1)} years`} highlight />
            </View>
          </View>
          <View style={styles.sensitivity}>
            <Text style={styles.sensitivityLabel}>Rent sensitivity range</Text>
            <Text style={styles.sensitivityValue}>
              {formatCurrency(estimateInput.monthlyRent * 0.9)} - {formatCurrency(estimateInput.monthlyRent * 1.1)} / month
            </Text>
            <Text style={styles.sensitivityText}>Adjust assumptions below to update income, cost, value, and payback.</Text>
          </View>
          <View style={styles.primaryMetrics}>
            <MetricCard
              label="Value range"
              value={`${formatCurrencyCompact(estimate.lowValue)}–${formatCurrencyCompact(estimate.highValue)}`}
              detail="Income approach"
              tone="primary"
              width="full"
            />
            <MetricCard
              label="ROI"
              value={formatPercent(estimate.roi)}
              detail={`${estimate.paybackYears.toFixed(1)} yr payback`}
            />
          </View>
          <View style={styles.note}>
            <View style={styles.noteIcon}>
              <Feather name="hard-drive" size={15} color={colors.accentDark} />
            </View>
            <View style={styles.noteBody}>
              <Text style={styles.noteLabel}>Saved locally</Text>
              <Text style={styles.noteText}>These assumptions travel with permit checks, design concepts, and quote packets.</Text>
            </View>
          </View>
        </>
      ) : null}

      <SectionHeader title="Underwriting assumptions" />
      <EstimateForm initialValues={estimateInput} onSubmit={handleSubmit} />
    </Screen>
  );
}

function ModelRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.sheetRow}>
      <Text style={styles.sheetLabel}>{label}</Text>
      <Text style={[styles.sheetValue, highlight && styles.sheetValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  projectIcon: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: colors.successSoft,
    borderWidth: 1,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  projectBody: {
    flex: 1,
    gap: 2,
  },
  projectLabel: {
    ...typography.label,
    color: colors.muted,
  },
  projectTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  projectText: {
    ...typography.body,
    color: colors.muted,
  },
  primaryMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modelSheet: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.soft,
  },
  noiHero: {
    backgroundColor: colors.mint,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noiLabel: {
    ...typography.label,
    color: colors.accentDark,
  },
  noiValue: {
    ...typography.display,
    color: colors.emerald,
  },
  noiDetail: {
    ...typography.body,
    color: colors.muted,
  },
  sheetRows: {
    paddingHorizontal: spacing.lg,
  },
  sheetRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  sheetLabel: {
    ...typography.body,
    color: colors.muted,
    flex: 1,
  },
  sheetValue: {
    ...typography.mono,
    color: colors.text,
  },
  sheetValueHighlight: {
    color: colors.capitalBrass,
    fontFamily: typography.monoLarge.fontFamily,
  },
  sensitivity: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderLeftColor: colors.capitalBrass,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sensitivityLabel: {
    ...typography.label,
    color: colors.capitalBrass,
  },
  sensitivityValue: {
    ...typography.mono,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  sensitivityText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    alignItems: "flex-start",
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  noteIcon: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: radii.sm,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  noteBody: {
    flex: 1,
    gap: 2,
  },
  noteLabel: {
    ...typography.label,
    color: colors.accentDark,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
