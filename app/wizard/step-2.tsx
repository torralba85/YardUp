import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Button } from "../../src/components/Button";
import { WizardHeader } from "../../src/components/WizardHeader";
import { aduModels } from "../../src/data/aduModels";
import { useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";
import type { AduModel, DesignFitSignal, DesignPlacement } from "../../src/domain/types";

const defaultPlacement: DesignPlacement = { xPercent: 62, yPercent: 58, rotation: 0 };

export default function WizardStepTwo() {
  const { width } = useWindowDimensions();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const saveWizardModelAndPlacement = useAppStore((state) => state.saveWizardModelAndPlacement);
  const [selectedModelId, setSelectedModelId] = useState(project?.selectedModelId ?? aduModels[0].id);
  const [placement, setPlacement] = useState<DesignPlacement>(project?.placement ?? defaultPlacement);

  useEffect(() => {
    if (project?.selectedModelId) {
      setSelectedModelId(project.selectedModelId);
    }
    if (project?.placement) {
      setPlacement(project.placement);
    }
  }, [project?.placement, project?.selectedModelId]);

  const activeModel = aduModels.find((model) => model.id === selectedModelId) ?? aduModels[0];
  const fitSignals = buildFitSignals(activeModel, parcel?.buildableAreaSqFt ?? project?.lotSqFt ?? 0);
  const canvasWidth = Math.min(width - spacing.lg * 2, 720);
  const canvasHeight = 230;
  const modelWidth = Math.min(Math.max(activeModel.footprint.widthFt * 4, 72), canvasWidth * 0.56);
  const modelHeight = Math.min(Math.max(activeModel.footprint.depthFt * 4, 54), canvasHeight * 0.52);

  const updatePlacement = (next: Partial<DesignPlacement>) => {
    setPlacement((current) => ({
      xPercent: clamp(next.xPercent ?? current.xPercent, 12, 88),
      yPercent: clamp(next.yPercent ?? current.yPercent, 18, 82),
      rotation: clamp(next.rotation ?? current.rotation, -45, 45),
    }));
  };

  const handleNext = async () => {
    if (project) {
      await saveWizardModelAndPlacement(project.id, activeModel.id, placement);
    }
    router.push("/wizard/step-3");
  };

  if (!project) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={2} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.subhead}>Choose a model and test the backyard fit</Text>
          <Text style={styles.body}>
            Pick a realistic starter model, then tune placement against the buildable yard zone.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelRail}>
          {aduModels.map((model) => {
            const isSelected = model.id === activeModel.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={model.id}
                onPress={() => setSelectedModelId(model.id)}
                style={({ pressed }) => [styles.modelChip, isSelected && styles.selectedModelChip, pressed && styles.pressed]}
              >
                <Text style={[styles.modelChipTitle, isSelected && styles.selectedModelText]}>{model.name}</Text>
                <Text style={[styles.modelChipMeta, isSelected && styles.selectedModelText]}>
                  {model.sqft} sqft - {model.beds} bd
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.label}>Selected model</Text>
              <Text style={styles.cardTitle}>{activeModel.name}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{activeModel.fitScore}</Text>
            </View>
          </View>
          <Text style={styles.bodySmall}>
            {activeModel.dimensions} - {activeModel.constructionMethod.replace(/_/g, " ")} - from{" "}
            {formatCurrency(activeModel.priceFrom)}
          </Text>
          <View style={styles.tagRow}>
            {activeModel.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.canvasCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.label}>Backyard fit</Text>
              <Text style={styles.cardTitle}>Placement sketch</Text>
            </View>
            <Text style={styles.bodySmall}>
              {Math.round(placement.xPercent)} / {Math.round(placement.yPercent)}
            </Text>
          </View>
          <View style={[styles.canvas, { height: canvasHeight, width: canvasWidth }]}>
            <View style={styles.primaryHome}>
              <Text style={styles.canvasLabel}>Primary home</Text>
            </View>
            <View style={styles.buildableZone}>
              <Text style={styles.zoneLabel}>Buildable zone</Text>
            </View>
            <View
              style={[
                styles.modelFootprint,
                {
                  height: modelHeight,
                  left: `${placement.xPercent}%`,
                  top: `${placement.yPercent}%`,
                  transform: [
                    { translateX: -modelWidth / 2 },
                    { translateY: -modelHeight / 2 },
                    { rotate: `${placement.rotation}deg` },
                  ],
                  width: modelWidth,
                },
              ]}
            >
              <Text style={styles.footprintTitle}>{activeModel.name}</Text>
              <Text style={styles.footprintMeta}>{activeModel.sqft} sqft</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <NudgeButton icon="arrow-left" label="Left" onPress={() => updatePlacement({ xPercent: placement.xPercent - 5 })} />
            <NudgeButton icon="arrow-up" label="Up" onPress={() => updatePlacement({ yPercent: placement.yPercent - 5 })} />
            <NudgeButton icon="arrow-down" label="Down" onPress={() => updatePlacement({ yPercent: placement.yPercent + 5 })} />
            <NudgeButton icon="arrow-right" label="Right" onPress={() => updatePlacement({ xPercent: placement.xPercent + 5 })} />
            <NudgeButton icon="rotate-ccw" label="Rotate left" onPress={() => updatePlacement({ rotation: placement.rotation - 15 })} />
            <NudgeButton icon="rotate-cw" label="Rotate right" onPress={() => updatePlacement({ rotation: placement.rotation + 15 })} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Fit signals</Text>
          {fitSignals.map((signal) => (
            <View key={signal.id} style={styles.signalRow}>
              <View style={[styles.signalDot, signal.status === "review" && styles.reviewDot, signal.status === "blocked" && styles.blockedDot]} />
              <View style={styles.signalText}>
                <Text style={styles.signalTitle}>
                  {signal.label}: {signal.value}
                </Text>
                <Text style={styles.bodySmall}>{signal.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="secondary" onPress={() => router.back()}>
          Back
        </Button>
        <Button onPress={handleNext}>Save fit</Button>
      </View>
    </View>
  );
}

function NudgeButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.nudgeButton, pressed && styles.pressed]}
    >
      <Feather name={icon} size={17} color={colors.accent} />
    </Pressable>
  );
}

function buildFitSignals(model: AduModel, buildableAreaSqFt: number): DesignFitSignal[] {
  const areaStatus = model.sqft <= buildableAreaSqFt ? "good" : model.sqft <= buildableAreaSqFt * 1.15 ? "review" : "blocked";

  return [
    {
      id: "buildable-area",
      label: "Buildable area",
      value: `${model.sqft}/${Math.max(buildableAreaSqFt, model.sqft).toLocaleString()} sqft`,
      detail:
        areaStatus === "good"
          ? "The model fits within the starter buildable-area allowance."
          : "Ask a designer to verify setbacks before locking this footprint.",
      status: areaStatus,
    },
    {
      id: "construction",
      label: "Construction method",
      value: model.constructionMethod.replace(/_/g, " "),
      detail: model.fitNotes[0] ?? "Use this method as an early planning assumption.",
      status: "good",
    },
    {
      id: "rent-potential",
      label: "Monthly estimate",
      value: formatCurrency(model.monthlyEstimate),
      detail: "Used later as a starting point for the ROI model.",
      status: "good",
    },
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(value);
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
  modelRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  modelChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 152,
    padding: spacing.md,
  },
  selectedModelChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modelChipTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  modelChipMeta: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  selectedModelText: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.78,
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
  canvasCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
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
  scoreBadge: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 42,
    paddingHorizontal: spacing.sm,
  },
  scoreText: {
    ...typography.label,
    color: colors.accentDark,
    fontSize: 14,
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
  tagText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  canvas: {
    alignSelf: "center",
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  primaryHome: {
    alignItems: "center",
    backgroundColor: colors.parcel,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    top: 0,
    width: "31%",
  },
  canvasLabel: {
    ...typography.label,
    color: colors.background,
    textAlign: "center",
  },
  buildableZone: {
    borderColor: colors.accent,
    borderStyle: "dashed",
    borderWidth: 2,
    bottom: "13%",
    left: "39%",
    position: "absolute",
    right: "7%",
    top: "14%",
  },
  zoneLabel: {
    ...typography.label,
    backgroundColor: colors.surfaceStrong,
    color: colors.accentDark,
    left: spacing.sm,
    paddingHorizontal: spacing.xs,
    position: "absolute",
    top: -9,
  },
  modelFootprint: {
    alignItems: "center",
    backgroundColor: colors.permitSoft,
    borderColor: colors.permit,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    padding: spacing.sm,
    position: "absolute",
  },
  footprintTitle: {
    ...typography.label,
    color: colors.text,
    textAlign: "center",
  },
  footprintMeta: {
    ...typography.body,
    color: colors.permit,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nudgeButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  signalRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  signalDot: {
    backgroundColor: colors.success,
    borderRadius: radii.full,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  reviewDot: {
    backgroundColor: colors.warning,
  },
  blockedDot: {
    backgroundColor: colors.blocked,
  },
  signalText: {
    flex: 1,
    gap: 2,
  },
  signalTitle: {
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
