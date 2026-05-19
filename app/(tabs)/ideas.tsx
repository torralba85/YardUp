import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { aduModels } from "../../src/data/aduModels";
import { formatCurrencyCompact } from "../../src/domain/estimator";
import type { AduModel, ParcelSummary } from "../../src/domain/types";
import { useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, spacing, typography } from "../../src/theme";

export default function DesignScreen() {
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const concepts = useAppStore((state) => state.concepts);
  const records = useAppStore((state) => state.propertyRecords);
  const createConcept = useAppStore((state) => state.createConcept);
  const refreshPropertyHistory = useAppStore((state) => state.refreshPropertyHistory);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const latestConcept = useMemo(
    () => concepts.find((concept) => concept.projectId === project?.id),
    [concepts, project?.id],
  );
  const projectRecords = useMemo(
    () => records.filter((record) => record.projectId === project?.id),
    [records, project?.id],
  );

  const handleGenerateConcept = async () => {
    if (!project) return;
    setIsGenerating(true);
    try {
      await createConcept(project.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchHistory = async () => {
    if (!project) return;
    setIsFetchingHistory(true);
    try {
      await refreshPropertyHistory(project.id);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  if (!project || !parcel) {
    return (
      <Screen title="Design Studio" subtitle="Start a project on Home to test ADU fit against a parcel.">
        <View style={styles.emptyState}>
          <Feather name="map-pin" size={42} color={colors.faint} />
          <Text style={styles.emptyTitle}>No active lot</Text>
          <Text style={styles.emptyText}>Create a project to unlock the parcel sketch, model library, and concept generator.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Design Studio" subtitle="Translate the address into a parcel fit, model shortlist, and concept packet.">
      <View style={styles.projectContext}>
        <Text style={styles.contextLabel}>Active lot</Text>
        <Text style={styles.contextAddress}>{project.address}</Text>
      </View>

      <SectionHeader title="Parcel fit" action={parcel.verifiedAt} />
      <View style={styles.parcelCard}>
        <ParcelSketch parcel={parcel} />
        <View style={styles.factGrid}>
          <Fact label="Zoning" value={parcel.zoning} />
          <Fact label="Buildable" value={`${parcel.buildableAreaSqFt} sqft`} />
          <Fact label="Rear" value={parcel.setbacks.rear} />
        </View>
        <View style={styles.constraintRow}>
          {parcel.constraints.map((constraint) => (
            <Text key={constraint} style={styles.constraint}>
              {constraint}
            </Text>
          ))}
        </View>
        <Text style={styles.sourceText}>{parcel.sourceLabel}. Verify with the city before design or construction decisions.</Text>
      </View>

      <SectionHeader title="ADU model shortlist" action="seeded specs" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelRail}>
        {aduModels.map((model) => (
          <AduModelCard key={model.id} model={model} />
        ))}
      </ScrollView>

      <SectionHeader title="Property records" action={`${projectRecords.length} records`} />
      <View style={styles.card}>
        {projectRecords.length ? (
          projectRecords.map((record) => (
            <View key={record.id} style={styles.recordRow}>
              <View style={styles.recordIcon}>
                <Feather name="file-text" size={16} color={colors.parcel} />
              </View>
              <View style={styles.recordText}>
                <Text style={styles.recordTitle}>{record.recordType}</Text>
                <Text style={styles.recordSummary}>{record.summary}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.cardText}>No records loaded yet. Pull a starter public-record packet for this address.</Text>
        )}
        <Button variant="secondary" onPress={handleFetchHistory} disabled={isFetchingHistory}>
          {isFetchingHistory ? "Searching records" : "Search public records"}
        </Button>
      </View>

      <SectionHeader title="Site photo" />
      <View style={styles.photoCard}>
        <View style={styles.photoIcon}>
          <Feather name={photoUploaded ? "image" : "camera"} size={22} color={colors.accent} />
        </View>
        <View style={styles.photoText}>
          <Text style={styles.cardTitle}>{photoUploaded ? "Backyard photo attached" : "Attach a backyard photo"}</Text>
          <Text style={styles.cardText}>
            {photoUploaded
              ? "site-photo-backyard.jpg is ready for the concept prompt."
              : "Use a real site photo to make the generated concept feel specific to the lot."}
          </Text>
        </View>
        <Button variant="ghost" onPress={() => setPhotoUploaded(true)}>
          {photoUploaded ? "Replace" : "Attach"}
        </Button>
      </View>

      <SectionHeader title="AI concept" action={latestConcept ? "ready" : "draft"} />
      <View style={styles.conceptCard}>
        {latestConcept ? (
          <>
            <View style={styles.conceptHeader}>
              <Text style={styles.conceptTitle}>{latestConcept.title}</Text>
              <Text style={styles.fitBadge}>{latestConcept.targetSqFt} sqft</Text>
            </View>
            <Text style={styles.conceptText}>
              {latestConcept.exteriorStyle} - {latestConcept.footprintType}
            </Text>
            <View style={styles.constraintRow}>
              {latestConcept.rooms.map((room) => (
                <Text key={room} style={styles.constraint}>
                  {room}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.cardText}>Generate a first-pass concept from the parcel fit, model specs, and ROI assumptions.</Text>
        )}
        <Button onPress={handleGenerateConcept} disabled={isGenerating}>
          {isGenerating ? "Generating concept" : latestConcept ? "Regenerate concept" : "Generate concept"}
        </Button>
      </View>
    </Screen>
  );
}

function ParcelSketch({ parcel }: { parcel: ParcelSummary }) {
  return (
    <View style={styles.sketch}>
      <View style={styles.lotFrame}>
        <View style={styles.primaryHouse}>
          <Text style={styles.sketchLabel}>Home</Text>
        </View>
        <View style={styles.buildableArea}>
          <Text style={styles.sketchLabel}>Buildable area</Text>
        </View>
        <View style={styles.aduBlock}>
          <Text style={styles.aduLabel}>ADU</Text>
        </View>
        <Text style={[styles.setbackLabel, styles.sideSetback]}>4 ft side</Text>
        <Text style={[styles.setbackLabel, styles.rearSetback]}>4 ft rear</Text>
      </View>
      <Text style={styles.sketchMeta}>{parcel.lotSqFt.toLocaleString()} sqft parcel - source: {parcel.sourceLabel}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function AduModelCard({ model }: { model: AduModel }) {
  return (
    <View style={styles.modelCard}>
      <Image source={{ uri: model.imageUrl }} style={styles.modelImage} contentFit="cover" transition={200} />
      <View style={styles.modelBody}>
        <View style={styles.conceptHeader}>
          <Text style={styles.modelTitle}>{model.name}</Text>
          <Text style={styles.fitBadge}>{model.fitScore}% fit</Text>
        </View>
        <Text style={styles.modelMeta}>
          {model.sqft} sqft - {model.beds || "Studio"} bed - {model.baths} bath
        </Text>
        <View style={styles.modelStats}>
          <Text style={styles.modelStat}>{formatCurrencyCompact(model.priceFrom)} from</Text>
          <Text style={styles.modelStat}>{formatCurrencyCompact(model.monthlyEstimate)}/mo</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.xxl,
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
  },
  emptyText: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
  },
  projectContext: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  contextLabel: {
    ...typography.label,
    color: colors.muted,
  },
  contextAddress: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  parcelCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  sketch: {
    gap: spacing.sm,
  },
  lotFrame: {
    backgroundColor: colors.parcelSoft,
    borderColor: colors.parcel,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 230,
    overflow: "hidden",
    position: "relative",
  },
  primaryHouse: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 70,
    justifyContent: "center",
    left: 36,
    position: "absolute",
    top: 22,
    width: 136,
  },
  buildableArea: {
    alignItems: "center",
    backgroundColor: "rgba(47, 93, 80, 0.14)",
    borderColor: colors.accent,
    borderRadius: radii.sm,
    borderStyle: "dashed",
    borderWidth: 1,
    bottom: 36,
    justifyContent: "center",
    position: "absolute",
    right: 28,
    top: 76,
    width: 150,
  },
  aduBlock: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    bottom: 56,
    height: 70,
    justifyContent: "center",
    position: "absolute",
    right: 52,
    width: 102,
  },
  sketchLabel: {
    ...typography.label,
    color: colors.text,
    textAlign: "center",
  },
  aduLabel: {
    ...typography.label,
    color: colors.background,
  },
  setbackLabel: {
    ...typography.mono,
    color: colors.parcel,
    fontSize: 11,
    position: "absolute",
  },
  sideSetback: {
    right: 16,
    top: 105,
    transform: [{ rotate: "90deg" }],
  },
  rearSetback: {
    bottom: 10,
    right: 74,
  },
  sketchMeta: {
    ...typography.mono,
    color: colors.muted,
    fontSize: 11,
  },
  factGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  fact: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    flex: 1,
    gap: 2,
    padding: spacing.sm,
  },
  factLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  factValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
  },
  constraintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  constraint: {
    ...typography.label,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  modelRail: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  modelCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    width: 260,
  },
  modelImage: {
    aspectRatio: 1.5,
    backgroundColor: colors.surfaceStrong,
    width: "100%",
  },
  modelBody: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  conceptHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  modelTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  fitBadge: {
    ...typography.label,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    color: colors.accentDark,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modelMeta: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  modelStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modelStat: {
    ...typography.mono,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    color: colors.text,
    flex: 1,
    fontSize: 11,
    overflow: "hidden",
    padding: spacing.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  cardText: {
    ...typography.body,
    color: colors.muted,
  },
  recordRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  recordIcon: {
    alignItems: "center",
    backgroundColor: colors.parcelSoft,
    borderRadius: radii.sm,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  recordText: {
    flex: 1,
    gap: 2,
  },
  recordTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
  },
  recordSummary: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  photoCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  photoIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  photoText: {
    flex: 1,
    gap: 2,
  },
  conceptCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  conceptTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  conceptText: {
    ...typography.body,
    color: colors.muted,
  },
});
