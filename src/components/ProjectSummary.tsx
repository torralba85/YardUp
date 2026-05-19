import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCurrencyCompact, formatPercent } from "../domain/estimator";
import type { Project } from "../domain/types";
import { colors, radii, spacing, typography } from "../theme";

interface ProjectSummaryProps {
  project: Project;
  onPress?: () => void;
}

export function ProjectSummary({ project, onPress }: ProjectSummaryProps) {
  const estimate = project.lastEstimate;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.label}>Continue project</Text>
          <Text style={styles.title}>{project.name}</Text>
          <Text style={styles.address}>{project.address}</Text>
        </View>
        <View style={styles.icon}>
          <Feather name="arrow-right" size={20} color={colors.accent} />
        </View>
      </View>

      {estimate ? (
        <View style={styles.projectStrip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripLabel}>Value</Text>
            <Text style={styles.stripValue}>{`${formatCurrencyCompact(estimate.lowValue)}-${formatCurrencyCompact(estimate.highValue)}`}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripLabel}>ROI</Text>
            <Text style={styles.stripValue}>{formatPercent(estimate.roi)}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripLabel}>Next</Text>
            <Text style={styles.stripNext}>Quote packet</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No estimate yet. Start with size, rent, and build-cost assumptions.</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.995 }],
    backgroundColor: colors.surfaceStrong,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
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
  address: {
    ...typography.body,
    color: colors.muted,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  projectStrip: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    flexDirection: "row",
    padding: spacing.sm,
  },
  stripItem: {
    flex: 1,
    gap: 2,
  },
  stripDivider: {
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    width: 1,
  },
  stripLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  stripValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
  },
  stripNext: {
    ...typography.body,
    color: colors.accentDark,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
  },
});
