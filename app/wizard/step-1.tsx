import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { WizardHeader } from "../../src/components/WizardHeader";
import { jurisdictionLabels } from "../../src/data/regulations";
import { useActiveGuide, useActiveParcelSummary, useActiveProject } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function WizardStepOne() {
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const guide = useActiveGuide();

  if (!project) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={1} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.subhead}>Verify the lot facts</Text>
          <Text style={styles.body}>
            Review the address, jurisdiction, parcel facts, and ADU constraints before choosing a model.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Site address</Text>
          <Text style={styles.cardTitle}>{project.address}</Text>
          <View style={styles.badge}>
            <Feather name="map-pin" size={13} color={colors.accent} />
            <Text style={styles.badgeText}>{jurisdictionLabels[project.jurisdiction]}</Text>
          </View>
        </View>

        {project.jurisdiction === "local-review" ? (
          <View style={[styles.card, styles.verificationCard]}>
            <Text style={styles.label}>Market coverage</Text>
            <Text style={styles.cardTitle}>Local rules verification needed</Text>
            <Text style={styles.body}>
              YardUp can model earning potential here, but sourced parcel and permit coverage is not available for this jurisdiction yet.
            </Text>
          </View>
        ) : null}

        {parcel ? (
          <View style={styles.card}>
            <Text style={styles.label}>Parcel information</Text>
            <View style={styles.metrics}>
              <Metric label="Zoning" value={parcel.zoning} />
              <Metric label="Lot area" value={`${parcel.lotSqFt.toLocaleString()} sqft`} />
              <Metric label="Buildable" value={`${parcel.buildableAreaSqFt.toLocaleString()} sqft`} />
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Setbacks</Text>
            <View style={styles.setbackRow}>
              <Setback label="Front" value={parcel.setbacks.front} />
              <Setback label="Side" value={parcel.setbacks.side} />
              <Setback label="Rear" value={parcel.setbacks.rear} />
            </View>
          </View>
        ) : null}

        {guide ? (
          <View style={styles.card}>
            <Text style={styles.label}>Regulatory overview</Text>
            <Text style={styles.body}>{guide.summary}</Text>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Items to verify</Text>
            {guide.blockers.map((blocker) => (
              <View key={blocker} style={styles.checkRow}>
                <Feather name="alert-circle" size={14} color={colors.permit} />
                <Text style={styles.bodySmall}>{blocker}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomSpacer} />
        <Button onPress={() => router.push("/wizard/step-2")}>Select model</Button>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Setback({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.setback}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.setbackValue}>{value}</Text>
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
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.soft,
  },
  verificationCard: {
    backgroundColor: colors.permitSoft,
    borderColor: colors.permit,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.label,
    color: colors.accentDark,
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    flex: 1,
    padding: spacing.sm,
  },
  metricLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  metricValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.text,
  },
  setbackRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  setback: {
    flex: 1,
  },
  setbackValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  checkRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  bottomBar: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.md,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  bottomSpacer: {
    flex: 1,
  },
});
