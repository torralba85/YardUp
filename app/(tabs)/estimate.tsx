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

  return (
    <Screen
      title="Feasibility sheet"
      subtitle="A deterministic model for value, rent, cost, and payback that stays attached to the active lot."
    >
      {project ? (
        <LinearGradient colors={[colors.ink, "#21342D"]} style={styles.projectCard}>
          <View style={styles.projectIcon}>
            <Feather name="activity" size={18} color={colors.ink} />
          </View>
          <View style={styles.projectBody}>
            <Text style={styles.projectLabel}>Numbers lab</Text>
            <Text style={styles.projectTitle}>{project.name}</Text>
            <Text style={styles.projectText}>{project.address}</Text>
          </View>
        </LinearGradient>
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
            <View style={styles.noteIcon}>
              <Feather name="file-text" size={16} color={colors.permit} />
            </View>
            <View style={styles.noteBody}>
              <Text style={styles.noteLabel}>Saved locally</Text>
              <Text style={styles.noteText}>These assumptions travel with permit checks, inspiration concepts, and quote packets.</Text>
            </View>
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
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.medium,
  },
  projectIcon: {
    alignItems: "center",
    backgroundColor: colors.highlighter,
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
    color: colors.faint,
  },
  projectTitle: {
    ...typography.h2,
    color: colors.background,
    marginTop: spacing.xs,
  },
  projectText: {
    ...typography.body,
    color: colors.faint,
  },
  primaryMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  note: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: colors.permitSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  noteIcon: {
    alignItems: "center",
    backgroundColor: colors.card,
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
    color: colors.permit,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
