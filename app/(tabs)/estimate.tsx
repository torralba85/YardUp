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

  return (
    <Screen
      title="ROI Model"
      subtitle="A deterministic feasibility sheet for value, rent, cost, and payback."
    >
      {project ? (
        <View style={styles.projectCard}>
          <Text style={styles.projectLabel}>Active project</Text>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <Text style={styles.projectText}>{project.address}</Text>
        </View>
      ) : null}

      {estimate ? (
        <>
          <SectionHeader title="Current model" action="saved locally" />
          <View style={styles.primaryMetrics}>
            <MetricCard
              label="Value range"
              value={`${formatCurrencyCompact(estimate.lowValue)}-${formatCurrencyCompact(estimate.highValue)}`}
              detail="Income approach"
              tone="primary"
              width="full"
            />
            <MetricCard
              label="ROI"
              value={formatPercent(estimate.roi)}
              detail={`${estimate.paybackYears.toFixed(1)} yr payback`}
            />
            <MetricCard label="Annual NOI" value={formatCurrency(estimate.annualNOI)} />
            <MetricCard label="Total cost" value={formatCurrency(estimate.totalCost)} />
          </View>
          <View style={styles.note}>
            <Text style={styles.noteLabel}>Builder packet</Text>
            <Text style={styles.noteText}>These numbers travel with quote requests so pros can price the same scope.</Text>
          </View>
        </>
      ) : null}

      <SectionHeader title="Assumptions" />
      <EstimateForm initialValues={getEstimateDefaults(project)} onSubmit={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  note: {
    backgroundColor: colors.permitSoft,
    borderRadius: radii.sm,
    gap: 2,
    padding: spacing.md,
  },
  noteLabel: {
    ...typography.label,
    color: colors.permit,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
