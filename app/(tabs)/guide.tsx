import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { GuideCard } from "../../src/components/GuideCard";
import { MetricCard } from "../../src/components/MetricCard";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { jurisdictionLabels } from "../../src/data/regulations";
import { useActiveGuide, useActiveParcelSummary, useActiveProject } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function GuideScreen() {
  const project = useActiveProject();
  const guide = useActiveGuide();
  const parcel = useActiveParcelSummary();

  return (
    <Screen title="Permit map" subtitle="A local-first checklist for jurisdiction, parcel constraints, and source-backed next steps.">
      {project ? (
        <LinearGradient colors={[colors.ink, "#20352E"]} style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <View style={styles.projectIcon}>
              <Feather name="map-pin" size={18} color={colors.ink} />
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

      {parcel ? (
        <>
          <SectionHeader title="Parcel snapshot" action={parcel.verifiedAt} />
          <View style={styles.metrics}>
            <MetricCard label="Zoning" value={parcel.zoning} detail={parcel.sourceLabel} />
            <MetricCard label="Lot" value={`${parcel.lotSqFt.toLocaleString()} sqft`} detail="Starter parcel" />
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
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  projectHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  projectIcon: {
    alignItems: "center",
    backgroundColor: colors.highlighter,
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
    color: colors.faint,
  },
  projectTitle: {
    ...typography.h2,
    color: colors.background,
  },
  projectAddress: {
    ...typography.body,
    color: colors.faint,
    fontSize: 13,
    lineHeight: 18,
  },
  jurisdiction: {
    ...typography.label,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.background,
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
    backgroundColor: colors.warningSoft,
    borderColor: colors.permitSoft,
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
