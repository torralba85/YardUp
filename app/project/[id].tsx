import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { GuideCard } from "../../src/components/GuideCard";
import { MetricCard } from "../../src/components/MetricCard";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import { useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const project = useAppStore((state) => state.projects.find((item) => item.id === id));
  const guides = useAppStore((state) => state.regulationGuides);
  const allConcepts = useAppStore((state) => state.concepts);
  const allRecords = useAppStore((state) => state.propertyRecords);
  const createConcept = useAppStore((state) => state.createConcept);
  const refreshPropertyHistory = useAppStore((state) => state.refreshPropertyHistory);
  const guide = project ? guides[project.jurisdiction] : undefined;
  const concepts = useMemo(() => allConcepts.filter((item) => item.projectId === id), [allConcepts, id]);
  const records = useMemo(() => allRecords.filter((item) => item.projectId === id), [allRecords, id]);

  if (!project || !guide) {
    return (
      <Screen title="Project not found">
        <Button onPress={() => router.back()}>Back</Button>
      </Screen>
    );
  }

  const estimate = project.lastEstimate;

  return (
    <Screen title={project.name} subtitle={project.address}>
      <Button variant="ghost" onPress={() => router.back()}>
        Back to tabs
      </Button>

      {estimate ? (
        <View style={styles.metrics}>
          <MetricCard
            label="Value range"
            value={`${formatCurrencyCompact(estimate.lowValue)}-${formatCurrencyCompact(estimate.highValue)}`}
            tone="primary"
          />
          <MetricCard label="ROI" value={formatPercent(estimate.roi)} tone="primary" />
          <MetricCard label="NOI" value={formatCurrency(estimate.annualNOI)} />
          <MetricCard label="Total cost" value={formatCurrency(estimate.totalCost)} />
        </View>
      ) : null}

      <SectionHeader title="AI design concepts" action={`${concepts.length} generated`} />
      <View style={styles.card}>
        {concepts.length ? (
          concepts.map((concept) => (
            <View key={concept.id} style={styles.concept}>
              <Text style={styles.conceptTitle}>{concept.title}</Text>
              <Text style={styles.rowText}>
                {concept.targetSqFt} sqft - {concept.exteriorStyle} - {concept.footprintType}
              </Text>
              <View style={styles.roomRow}>
                {concept.rooms.map((room) => (
                  <Text key={room} style={styles.room}>
                    {room}
                  </Text>
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Generate a lot-specific concept from the Design tab.</Text>
        )}
        <Button variant="secondary" onPress={() => router.push('/ideas')}>
          Open Design Tab
        </Button>
      </View>

      <SectionHeader title="Permit guide" />
      <GuideCard guide={guide} />

      <SectionHeader title="Historic property search" action={`${records.length} records`} />
      <View style={styles.card}>
        {records.length > 0 ? records.map((record) => (
          <View key={record.id} style={styles.concept}>
            <Text style={styles.conceptTitle}>{record.recordType}</Text>
            <Text style={styles.rowText}>{record.summary}</Text>
            <Text style={styles.source}>{record.source}</Text>
          </View>
        )) : (
          <Text style={styles.empty}>No historic records pulled yet.</Text>
        )}
        <Button variant="secondary" onPress={() => void refreshPropertyHistory(project.id)}>
          Search official records
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
  },
  concept: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  conceptTitle: {
    ...typography.h2,
    color: colors.text,
  },
  roomRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  room: {
    ...typography.label,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  source: {
    ...typography.mono,
    fontSize: 10,
    color: colors.muted,
  },
});
