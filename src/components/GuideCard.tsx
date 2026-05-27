import { Feather } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, View } from "react-native";

import type { RegulationGuide } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { Button } from "./Button";

interface GuideCardProps {
  guide: RegulationGuide;
}

export function GuideCard({ guide }: GuideCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.label}>Verified {guide.verifiedAt}</Text>
          <Text style={styles.title}>{guide.title}</Text>
        </View>
        <View style={styles.confidence}>
          <Feather name="shield" size={14} color={colors.accentDark} />
          <Text style={styles.confidenceText}>{guide.confidence}</Text>
        </View>
      </View>
      <Text style={styles.summary}>{guide.summary}</Text>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Confidence</Text>
          <Text style={styles.summaryValue}>{guide.confidence}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Steps</Text>
          <Text style={styles.summaryValue}>{guide.permitSteps.length}</Text>
        </View>
        <View style={styles.summaryItemWide}>
          <Text style={styles.summaryLabel}>Next action</Text>
          <Text style={styles.summaryValue}>Verify locally</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permit path</Text>
        {guide.permitSteps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepIndexContainer}>
              <Text style={styles.stepIndex}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.warning}>
        <Feather name="info" size={20} color={colors.warning} />
        <Text style={styles.warningText}>Verify requirements with your local jurisdiction before design or construction decisions.</Text>
      </View>

      <View style={styles.links}>
        {guide.citations.map((citation) => (
          <Button key={citation.url} icon="external-link" variant="secondary" onPress={() => Linking.openURL(citation.url)}>
            {citation.label}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderLeftColor: colors.blueprint,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  confidence: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confidenceText: {
    ...typography.label,
    color: colors.accentDark,
  },
  summary: {
    ...typography.body,
    color: colors.muted,
  },
  summaryStrip: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: 88,
  },
  summaryItemWide: {
    flexBasis: "100%",
    marginTop: spacing.xs,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.muted,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
  },
  step: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  stepIndexContainer: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndex: {
    ...typography.mono,
    fontSize: 12,
    color: colors.canvas,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  warning: {
    alignItems: "flex-start",
    backgroundColor: colors.permitSoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    flex: 1,
    fontSize: 14,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
