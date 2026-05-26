import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GuideCard } from "../../src/components/GuideCard";
import { MetricCard } from "../../src/components/MetricCard";
import { RiskIndicator } from "../../src/components/RiskIndicator";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { jurisdictionLabels } from "../../src/data/regulations";
import { deriveRisk } from "../../src/domain/risk";
import { useActiveGuide, useActiveParcelSummary, useActiveProject } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function GuideScreen() {
  const project = useActiveProject();
  const guide = useActiveGuide();
  const parcel = useActiveParcelSummary();

  const risk = useMemo(() => deriveRisk({ guide, parcel }), [guide, parcel]);

  return (
    <Screen
      title="Permit Risk"
      subtitle="Local-first risk read, parcel constraints, and source-backed steps. Verify with your jurisdiction before construction decisions."
    >
      {project ? (
        <LinearGradient colors={[colors.canvas, colors.surface]} style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <View style={styles.projectIcon}>
              <Feather name="map-pin" size={18} color={colors.accentDark} />
            </View>
            <View style={styles.projectText}>
              <Text style={styles.projectLabel}>Permit field notes</Text>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <Text style={styles.projectAddress}>{project.address}</Text>
            </View>
          </View>
          <Text style={styles.jurisdiction}>{jurisdictionLabels[project.jurisdiction]}</Text>
        </LinearGradient>
      ) : null}

      <SectionHeader
        title="Permit risk"
        action={project?.jurisdiction === "local-review" ? "local verification required" : parcel ? `verified ${parcel.verifiedAt}` : "needs a study"}
      />
      <RiskIndicator
        label={guide ? `${jurisdictionLabels[guide.jurisdiction]} review` : "Run a study to see permit risk"}
        level={risk.level}
        score={risk.score}
        drivers={risk.drivers}
        verifiedAt={parcel?.verifiedAt}
      />

      {parcel ? (
        <>
          <SectionHeader title="Parcel snapshot" action={parcel.sourceLabel} />
          <View style={styles.metrics}>
            <MetricCard label="Zoning" value={parcel.zoning} detail={parcel.sourceLabel} />
            <MetricCard label="Lot" value={`${parcel.lotSqFt.toLocaleString()} sqft`} detail="Estimated lot" />
            <MetricCard label="Buildable" value={`${parcel.buildableAreaSqFt.toLocaleString()} sqft`} detail="Planning allowance" />
          </View>
          <View style={styles.constraintCard}>
            <Text style={styles.constraintTitle}>Items to verify</Text>
            {parcel.constraints.map((constraint) => (
              <View key={constraint} style={styles.constraintRow}>
                <Feather name="alert-circle" size={15} color={colors.permit} />
                <Text style={styles.constraintText}>{constraint}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {guide ? (
        <>
          <SectionHeader title="Permit guide" action={guide.confidence} />
          <GuideCard guide={guide} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  projectHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  projectIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  projectText: {
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
  },
  projectAddress: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  jurisdiction: {
    ...typography.label,
    alignSelf: "flex-start",
    backgroundColor: colors.mint,
    borderColor: colors.successSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.accentDark,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  constraintCard: {
    backgroundColor: colors.permitSoft,
    borderColor: colors.permit,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.soft,
  },
  constraintTitle: {
    ...typography.label,
    color: colors.permit,
  },
  constraintRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  constraintText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
