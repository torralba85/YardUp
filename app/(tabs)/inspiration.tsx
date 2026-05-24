import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { IdeaCard } from "../../src/components/IdeaCard";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { jurisdictionLabels } from "../../src/data/regulations";
import type { InspirationItem, JurisdictionId } from "../../src/domain/types";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function InspirationScreen() {
  const project = useActiveProject();
  const inspirationItems = useAppStore((state) => state.inspirationItems);
  const savedItems = useAppStore((state) => state.savedItems);
  const saveInspiration = useAppStore((state) => state.saveInspiration);
  const createConcept = useAppStore((state) => state.createConcept);
  const [adaptingId, setAdaptingId] = useState<string | null>(null);

  const projectSavedItems = useMemo(
    () => savedItems.filter((item) => item.projectId === project?.id),
    [project?.id, savedItems],
  );
  const savedIds = useMemo(() => new Set(projectSavedItems.map((item) => item.inspirationId)), [projectSavedItems]);
  const sortedIdeas = useMemo(() => {
    if (!project) return inspirationItems;
    return [...inspirationItems].sort((left, right) => scoreIdea(right, project.jurisdiction) - scoreIdea(left, project.jurisdiction));
  }, [inspirationItems, project]);
  const featured = sortedIdeas[0];
  const rest = sortedIdeas.slice(1);

  const handleSave = async (item: InspirationItem) => {
    if (!project) return;
    await saveInspiration(project.id, item.id);
  };

  const handleAdapt = async (item: InspirationItem) => {
    if (!project) return;
    setAdaptingId(item.id);
    try {
      await saveInspiration(project.id, item.id);
      await createConcept(project.id, item.id);
      router.push(`/project/${project.id}`);
    } finally {
      setAdaptingId(null);
    }
  };

  return (
    <Screen title="Reference wall" subtitle="Save real ADU precedents, then turn one into a lot-specific concept.">
      {project ? (
        <View style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <View style={styles.projectIcon}>
              <Feather name="bookmark" size={18} color={colors.background} />
            </View>
            <View style={styles.projectText}>
              <Text style={styles.projectLabel}>Saving to</Text>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <Text style={styles.projectAddress}>{jurisdictionLabels[project.jurisdiction]}</Text>
            </View>
          </View>
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>{projectSavedItems.length} saved</Text>
          </View>
        </View>
      ) : null}

      {featured ? (
        <>
          <SectionHeader title="Best starter fit" action={featured.jurisdiction === "california" ? "statewide" : "local"} />
          <IdeaCard
            item={featured}
            saved={savedIds.has(featured.id)}
            onSave={() => void handleSave(featured)}
            onAdapt={() => void handleAdapt(featured)}
          />
          {adaptingId === featured.id ? <Text style={styles.statusText}>Building concept from saved reference...</Text> : null}
        </>
      ) : null}

      <SectionHeader title="Reference library" action={`${inspirationItems.length} ideas`} />
      <View style={styles.grid}>
        {rest.map((item, index) => (
          <IdeaCard
            key={item.id}
            imageShape={index % 3 === 1 ? "tall" : "wide"}
            item={item}
            saved={savedIds.has(item.id)}
            variant="tile"
            onSave={() => void handleSave(item)}
            onAdapt={() => void handleAdapt(item)}
          />
        ))}
      </View>
    </Screen>
  );
}

function scoreIdea(item: InspirationItem, jurisdiction: JurisdictionId) {
  if (item.jurisdiction === jurisdiction) return 3;
  if (item.jurisdiction === "california") return 2;
  return 1;
}

const styles = StyleSheet.create({
  projectCard: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
    ...shadows.soft,
  },
  projectHeader: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  projectIcon: {
    alignItems: "center",
    backgroundColor: colors.clay,
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
    fontSize: 16,
    lineHeight: 20,
  },
  projectAddress: {
    ...typography.body,
    color: colors.faint,
    fontSize: 13,
    lineHeight: 18,
  },
  savedBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedBadgeText: {
    ...typography.label,
    color: colors.background,
  },
  statusText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
