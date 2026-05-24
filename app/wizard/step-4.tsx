import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../src/components/Button";
import { WizardHeader } from "../../src/components/WizardHeader";
import { aduModels } from "../../src/data/aduModels";
import { estimateAduValue, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import { getEstimateDefaults, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function WizardStepFour() {
  const project = useActiveProject();
  const saveEstimate = useAppStore((state) => state.saveEstimate);
  const selectedModel = aduModels.find((model) => model.id === project?.selectedModelId);
  const defaults = getEstimateDefaults(project);
  const [rent, setRent] = useState(String(selectedModel?.monthlyEstimate ?? defaults.monthlyRent));
  const [cost, setCost] = useState(String(defaults.buildCostPerSqFt));

  const currentInput = {
    ...defaults,
    aduSqFt: selectedModel?.sqft ?? defaults.aduSqFt,
    buildCostPerSqFt: Number(cost) || defaults.buildCostPerSqFt,
    monthlyRent: Number(rent) || defaults.monthlyRent,
  };
  const results = estimateAduValue(currentInput);

  const handleNext = async () => {
    if (project) {
      await saveEstimate(project.id, currentInput);
    }
    router.push("/wizard/step-5");
  };

  if (!project) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={4} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.subhead}>Model the financial picture</Text>
          <Text style={styles.body}>
            Use the selected model as the square-foot baseline, then adjust rent and construction assumptions.
          </Text>
        </View>

        <View style={styles.metricGrid}>
          <Metric label="Estimated value" value={`${formatCurrencyCompact(results.lowValue)}-${formatCurrencyCompact(results.highValue)}`} />
          <Metric label="Total cost" value={formatCurrencyCompact(results.totalCost)} />
          <Metric label="Annual NOI" value={formatCurrencyCompact(results.annualNOI)} />
          <Metric label="ROI" value={formatPercent(results.roi)} accent />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Assumptions</Text>
          <Text style={styles.cardTitle}>{selectedModel?.name ?? "Detached ADU"} baseline</Text>
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Monthly rent estimate</Text>
            <TextInput
              accessibilityLabel="Monthly rent estimate"
              keyboardType="numeric"
              onChangeText={setRent}
              style={styles.input}
              value={rent}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Construction cost per square foot</Text>
            <TextInput
              accessibilityLabel="Construction cost per square foot"
              keyboardType="numeric"
              onChangeText={setCost}
              style={styles.input}
              value={cost}
            />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.bodySmall}>ADU size</Text>
            <Text style={styles.detailValue}>{currentInput.aduSqFt} sqft</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.bodySmall}>Payback estimate</Text>
            <Text style={styles.detailValue}>{results.paybackYears.toFixed(1)} years</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="secondary" onPress={() => router.back()}>
          Back
        </Button>
        <Button onPress={handleNext}>Find builders</Button>
      </View>
    </View>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent && styles.accentMetric]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceStrong,
    flex: 1,
  },
  scroll: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 112,
  },
  intro: {
    gap: spacing.xs,
  },
  subhead: {
    ...typography.h1,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCell: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    ...shadows.soft,
  },
  metricLabel: {
    ...typography.label,
    color: colors.muted,
  },
  metricValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    marginTop: spacing.xs,
  },
  accentMetric: {
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  formGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  detailValue: {
    ...typography.label,
    color: colors.text,
  },
  bottomBar: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
});
