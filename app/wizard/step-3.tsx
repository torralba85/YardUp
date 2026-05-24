import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { WizardHeader } from "../../src/components/WizardHeader";
import { aduModels } from "../../src/data/aduModels";
import { designStyles, getDesignStyle } from "../../src/data/designStyles";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";
import type { DesignFitSignal, DesignStyleId } from "../../src/domain/types";

export default function WizardStepThree() {
  const project = useActiveProject();
  const saveWizardStyle = useAppStore((state) => state.saveWizardStyle);
  const createConcept = useAppStore((state) => state.createConcept);
  const concepts = useAppStore((state) => state.concepts);
  const [selectedStyleId, setSelectedStyleId] = useState<DesignStyleId>(project?.selectedStyleId ?? "warm_modern");
  const [isGenerating, setIsGenerating] = useState(false);

  const activeModel = aduModels.find((model) => model.id === project?.selectedModelId) ?? aduModels[0];
  const compatibleStyles = designStyles.filter((style) => activeModel.styleIds.includes(style.id));
  const selectedStyle = getDesignStyle(selectedStyleId);
  const latestConcept = project ? concepts.find((concept) => concept.projectId === project.id) : undefined;

  useEffect(() => {
    if (project?.selectedStyleId) {
      setSelectedStyleId(project.selectedStyleId);
      return;
    }
    if (!activeModel.styleIds.includes(selectedStyleId)) {
      setSelectedStyleId(activeModel.styleIds[0] ?? designStyles[0].id);
    }
  }, [activeModel.styleIds, project?.selectedStyleId, selectedStyleId]);

  const handleGenerate = async () => {
    if (!project) return;

    setIsGenerating(true);
    await saveWizardStyle(project.id, selectedStyleId);
    await createConcept(project.id, undefined, {
      constructionMethod: activeModel.constructionMethod,
      fitSignals: buildConceptFitSignals(activeModel),
      hasSitePhoto: Boolean(project.sitePhotoUri),
      modelId: activeModel.id,
      modelName: activeModel.name,
      placement: project.placement,
      styleId: selectedStyle.id,
      styleLabel: selectedStyle.label,
      targetSqFt: activeModel.sqft,
    });
    setIsGenerating(false);
  };

  const handleNext = async () => {
    if (project) {
      await saveWizardStyle(project.id, selectedStyleId);
    }
    router.push("/wizard/step-4");
  };

  if (!project) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={3} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.subhead}>Choose the architectural direction</Text>
          <Text style={styles.body}>
            Match the selected model to a style system, then generate a local starter concept for the quote packet.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Model baseline</Text>
          <View style={styles.modelRow}>
            <View style={styles.modelIcon}>
              <Feather name="home" size={19} color={colors.accent} />
            </View>
            <View style={styles.modelText}>
              <Text style={styles.cardTitle}>{activeModel.name}</Text>
              <Text style={styles.bodySmall}>
                {activeModel.sqft} sqft - {activeModel.dimensions} - {activeModel.constructionMethod.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.styleGrid}>
          {compatibleStyles.map((style) => {
            const isSelected = style.id === selectedStyleId;
            return (
              <Pressable
                accessibilityRole="button"
                key={style.id}
                onPress={() => setSelectedStyleId(style.id)}
                style={({ pressed }) => [styles.styleCard, isSelected && styles.selectedStyleCard, pressed && styles.pressed]}
              >
                <View style={styles.styleHeader}>
                  <Text style={[styles.styleTitle, isSelected && styles.selectedStyleText]}>{style.label}</Text>
                  {isSelected ? <Feather name="check" size={17} color={colors.background} /> : null}
                </View>
                <Text style={[styles.bodySmall, isSelected && styles.selectedStyleText]}>{style.description}</Text>
                <View style={styles.tagRow}>
                  {style.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, isSelected && styles.selectedTag]}>
                      <Text style={[styles.tagText, isSelected && styles.selectedStyleText]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.conceptCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.label}>Generated concept</Text>
              <Text style={styles.cardTitle}>{latestConcept?.title ?? "Starter concept packet"}</Text>
            </View>
            <Button disabled={isGenerating} onPress={handleGenerate} variant={latestConcept ? "secondary" : "primary"}>
              {isGenerating ? "Generating" : latestConcept ? "Regenerate" : "Generate"}
            </Button>
          </View>

          {latestConcept ? (
            <View style={styles.conceptBody}>
              <Text style={styles.bodySmall}>
                {latestConcept.exteriorStyle} - {latestConcept.footprintType} - {latestConcept.targetSqFt} sqft
              </Text>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Rooms</Text>
              <Text style={styles.bodySmall}>{latestConcept.rooms.join(", ")}</Text>
              <Text style={styles.sectionLabel}>Planning notes</Text>
              {latestConcept.constraints.slice(0, 3).map((constraint) => (
                <View key={constraint} style={styles.noteRow}>
                  <Feather name="check-circle" size={14} color={colors.accent} />
                  <Text style={styles.bodySmall}>{constraint}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyConcept}>
              <Feather name="image" size={22} color={colors.muted} />
              <Text style={styles.bodySmall}>No concept generated for this project yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="secondary" onPress={() => router.back()}>
          Back
        </Button>
        <Button onPress={handleNext}>Run ROI</Button>
      </View>
    </View>
  );
}

function buildConceptFitSignals(model: (typeof aduModels)[number]): DesignFitSignal[] {
  return [
    {
      detail: model.fitNotes[0] ?? "Starter fit looks workable for concept generation.",
      id: "model-fit",
      label: "Model fit",
      status: "good",
      value: `${model.fitScore}/100`,
    },
    {
      detail: `The ${model.name} model is a ${model.constructionMethod.replace(/_/g, " ")} planning assumption.`,
      id: "method",
      label: "Method",
      status: "good",
      value: model.constructionMethod.replace(/_/g, " "),
    },
  ];
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
    flexShrink: 1,
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
  label: {
    ...typography.label,
    color: colors.muted,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
  },
  modelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  modelIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  modelText: {
    flex: 1,
    gap: 2,
  },
  styleGrid: {
    gap: spacing.md,
  },
  styleCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.soft,
  },
  selectedStyleCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  styleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  styleTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  selectedStyleText: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.8,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedTag: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tagText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  conceptCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  cardHeaderText: {
    flex: 1,
  },
  conceptBody: {
    gap: spacing.sm,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.text,
  },
  noteRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  emptyConcept: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.md,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 110,
    padding: spacing.md,
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
