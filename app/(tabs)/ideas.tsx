import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { aduModels } from "../../src/data/aduModels";
import { designStyles } from "../../src/data/designStyles";
import { formatCurrencyCompact } from "../../src/domain/estimator";
import type {
  AduModel,
  DesignFitSignal,
  DesignPlacement,
  DesignStyle,
  DesignStyleId,
  ParcelSummary,
  Project,
} from "../../src/domain/types";
import { useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const defaultPlacement: DesignPlacement = { xPercent: 68, yPercent: 68, rotation: 0 };
const placementStep = 6;
const aerialImage =
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=86";

export default function DesignScreen() {
  const { width } = useWindowDimensions();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const concepts = useAppStore((state) => state.concepts);
  const records = useAppStore((state) => state.propertyRecords);
  const createConcept = useAppStore((state) => state.createConcept);
  const saveSitePhoto = useAppStore((state) => state.saveSitePhoto);
  const refreshPropertyHistory = useAppStore((state) => state.refreshPropertyHistory);
  const [selectedModelId, setSelectedModelId] = useState(aduModels[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState<DesignStyleId>(aduModels[0].styleIds[0]);
  const [placement, setPlacement] = useState<DesignPlacement>(defaultPlacement);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => aduModels.find((model) => model.id === selectedModelId) ?? aduModels[0],
    [selectedModelId],
  );
  const selectedStyle = useMemo(
    () => designStyles.find((style) => style.id === selectedStyleId) ?? designStyles[0],
    [selectedStyleId],
  );
  const fitSignals = useMemo(
    () => (project && parcel ? buildFitSignals(project, parcel, selectedModel, placement) : []),
    [parcel, placement, project, selectedModel],
  );
  const latestConcept = useMemo(
    () => concepts.find((concept) => concept.projectId === project?.id),
    [concepts, project?.id],
  );
  const projectRecords = useMemo(
    () => records.filter((record) => record.projectId === project?.id),
    [records, project?.id],
  );
  const isWide = width >= 980;

  const handleSelectModel = (model: AduModel) => {
    setSelectedModelId(model.id);
    if (!model.styleIds.includes(selectedStyleId)) {
      setSelectedStyleId(model.styleIds[0]);
    }
  };

  const movePlacement = (xDelta: number, yDelta: number) => {
    setPlacement((current) => ({
      ...current,
      xPercent: clamp(current.xPercent + xDelta, 44, 82),
      yPercent: clamp(current.yPercent + yDelta, 48, 82),
    }));
  };

  const rotatePlacement = () => {
    setPlacement((current) => ({
      ...current,
      rotation: current.rotation >= 8 ? -8 : current.rotation + 8,
    }));
  };

  const handleGenerateConcept = async () => {
    if (!project) return;
    setIsGenerating(true);
    try {
      await createConcept(project.id, undefined, {
        styleId: selectedStyle.id,
        styleLabel: selectedStyle.label,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        constructionMethod: selectedModel.constructionMethod,
        targetSqFt: selectedModel.sqft,
        placement,
        fitSignals,
        hasSitePhoto: Boolean(project.sitePhotoUri),
      });
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

  const handleTakePhoto = async () => {
    if (!project) return;
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError("Camera permission is needed to attach a new backyard photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.82,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) await saveSitePhoto(project.id, uri);
    } catch {
      setPhotoError("Photo capture is unavailable on this device or browser.");
    }
  };

  const handleChoosePhoto = async () => {
    if (!project) return;
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError("Photo library permission is needed to attach an existing backyard photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.82,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) await saveSitePhoto(project.id, uri);
    } catch {
      setPhotoError("Photo selection is unavailable on this device or browser.");
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
    <Screen title="Backyard studio" subtitle="Fit a model, choose the architectural language, and generate a packet-ready design direction.">
      <LinearGradient colors={[colors.ink, "#20372F", "#244234"]} style={styles.projectContext}>
        <View style={styles.contextTop}>
          <View style={styles.contextCopy}>
            <Text style={styles.contextLabel}>Live design board</Text>
            <Text style={styles.contextAddress}>{project.address}</Text>
          </View>
          <View style={styles.contextBadge}>
            <Feather name="crosshair" size={15} color={colors.highlighter} />
            <Text style={styles.contextBadgeText}>true-scale fit</Text>
          </View>
        </View>
        <View style={styles.contextStats}>
          <StudioStat label="Model" value={selectedModel.name} />
          <StudioStat label="Area" value={`${selectedModel.sqft} sqft`} />
          <StudioStat label="Style" value={selectedStyle.label} />
          <StudioStat label="Photo" value={project.sitePhotoUri ? "attached" : "open"} />
        </View>
      </LinearGradient>

      <SectionHeader title="Backyard planner" action={`${selectedModel.sqft} sqft`} />
      <View style={[styles.plannerCard, isWide && styles.plannerCardWide]}>
        <View style={styles.plannerCanvas}>
          <View style={styles.canvasToolbar}>
            <View style={styles.canvasLabel}>
              <Feather name="crosshair" size={15} color={colors.parcel} />
              <Text style={styles.canvasLabelText}>True-scale parcel canvas</Text>
            </View>
            <View style={styles.viewSwitch}>
              {(["2D", "3D"] as const).map((mode) => (
                <Pressable
                  accessibilityRole="button"
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={viewMode === mode ? styles.viewSwitchActive : styles.viewSwitchButton}
                >
                  <Text style={viewMode === mode ? styles.viewSwitchActiveText : styles.viewSwitchText}>{mode}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <PlannerSketch parcel={parcel} model={selectedModel} placement={placement} />
        </View>
        <View style={styles.plannerInspector}>
          <View style={styles.plannerSummary}>
            <View style={styles.plannerTitleGroup}>
              <Text style={styles.cardTitle}>{selectedModel.name}</Text>
              <Text style={styles.cardText}>
                {selectedStyle.label} - {methodLabel(selectedModel.constructionMethod)} - {selectedModel.dimensions}
              </Text>
            </View>
            <View style={styles.modelStats}>
              <Text style={styles.modelStat}>{formatCurrencyCompact(selectedModel.priceFrom)} from</Text>
              <Text style={styles.modelStat}>{formatCurrencyCompact(selectedModel.monthlyEstimate)}/mo</Text>
            </View>
          </View>
          <View style={styles.placementTools}>
            <View style={styles.nudgePad}>
              <NudgeButton icon="arrow-up" label="Move ADU up" onPress={() => movePlacement(0, -placementStep)} />
              <View style={styles.nudgeMiddle}>
                <NudgeButton icon="arrow-left" label="Move ADU left" onPress={() => movePlacement(-placementStep, 0)} />
                <NudgeButton icon="rotate-cw" label="Rotate ADU" onPress={rotatePlacement} />
                <NudgeButton icon="arrow-right" label="Move ADU right" onPress={() => movePlacement(placementStep, 0)} />
              </View>
              <NudgeButton icon="arrow-down" label="Move ADU down" onPress={() => movePlacement(0, placementStep)} />
            </View>
            <View style={styles.fitList}>
              {fitSignals.map((signal) => (
                <FitSignalCard key={signal.id} signal={signal} />
              ))}
            </View>
          </View>
        </View>
      </View>

      <SectionHeader title="Architectural style" action="one tap" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRail}>
        {designStyles.map((style) => (
          <StyleChip
            key={style.id}
            styleOption={style}
            compatible={selectedModel.styleIds.includes(style.id)}
            selected={style.id === selectedStyle.id}
            onPress={() => setSelectedStyleId(style.id)}
          />
        ))}
      </ScrollView>

      <SectionHeader title="ADU model directory" action={`${aduModels.length} models`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelRail}>
        {aduModels.map((model) => (
          <AduModelCard
            key={model.id}
            model={model}
            selected={model.id === selectedModel.id}
            onPress={() => handleSelectModel(model)}
          />
        ))}
      </ScrollView>

      <SectionHeader title="Parcel facts" action={parcel.verifiedAt} />
      <View style={styles.parcelCard}>
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

      <SectionHeader title="Site photo" action={project.sitePhotoUri ? "attached" : "optional"} />
      <View style={styles.photoCard}>
        {project.sitePhotoUri ? (
          <Image source={{ uri: project.sitePhotoUri }} style={styles.photoPreview} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.photoIcon}>
            <Feather name="camera" size={22} color={colors.accent} />
          </View>
        )}
        <View style={styles.photoText}>
          <Text style={styles.cardTitle}>{project.sitePhotoUri ? "Backyard photo attached" : "Attach a backyard photo"}</Text>
          <Text style={styles.cardText}>
            {project.sitePhotoUri
              ? "The next concept can use photo context for entry, window, and privacy decisions."
              : "Use a real site photo to make the generated concept feel specific to the lot."}
          </Text>
          {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}
        </View>
        <View style={styles.photoActions}>
          <Button variant="secondary" onPress={handleTakePhoto}>
            Camera
          </Button>
          <Button variant="ghost" onPress={handleChoosePhoto}>
            Library
          </Button>
          {project.sitePhotoUri ? (
            <Button variant="ghost" onPress={() => void saveSitePhoto(project.id, undefined)}>
              Remove
            </Button>
          ) : null}
        </View>
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
            <Text style={styles.cardText}>{latestConcept.constraints.slice(0, 2).join(" ")}</Text>
            <Text style={styles.sourceText}>{latestConcept.nextSteps.slice(0, 2).join(" ")}</Text>
          </>
        ) : (
          <Text style={styles.cardText}>Generate a first-pass concept from the parcel fit, selected model, style, and site-photo context.</Text>
        )}
        <Button onPress={handleGenerateConcept} disabled={isGenerating}>
          {isGenerating ? "Generating concept" : latestConcept ? "Regenerate concept" : "Generate concept"}
        </Button>
      </View>
    </Screen>
  );
}

function PlannerSketch({
  parcel,
  model,
  placement,
}: {
  parcel: ParcelSummary;
  model: AduModel;
  placement: DesignPlacement;
}) {
  const blockWidth = Math.max(62, Math.min(118, model.footprint.widthFt * 2.55));
  const blockHeight = Math.max(48, Math.min(94, model.footprint.depthFt * 3));

  return (
    <View style={styles.sketch}>
      <View style={styles.lotFrame}>
        <Image source={{ uri: aerialImage }} style={styles.aerialImage} contentFit="cover" transition={250} />
        <View style={styles.aerialWash} />
        <View style={styles.primaryHouse}>
          <Text style={styles.sketchLabel}>Home</Text>
        </View>
        <View style={styles.buildableArea}>
          <Text style={styles.sketchLabel}>Buildable zone</Text>
        </View>
        <View
          style={[
            styles.aduBlock,
            {
              height: blockHeight,
              left: `${placement.xPercent}%`,
              top: `${placement.yPercent}%`,
              transform: [
                { translateX: -blockWidth / 2 },
                { translateY: -blockHeight / 2 },
                { rotate: `${placement.rotation}deg` },
              ],
              width: blockWidth,
            },
          ]}
        >
          <Text style={styles.aduLabel}>{model.name}</Text>
          <Text style={styles.aduMeta}>{model.sqft} sqft</Text>
        </View>
        <Text style={[styles.setbackLabel, styles.sideSetback]}>{parcel.setbacks.side} side</Text>
        <Text style={[styles.setbackLabel, styles.rearSetback]}>{parcel.setbacks.rear} rear</Text>
      </View>
      <Text style={styles.sketchMeta}>{parcel.lotSqFt.toLocaleString()} sqft parcel - source: {parcel.sourceLabel}</Text>
    </View>
  );
}

function NudgeButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
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

function StudioStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.studioStat}>
      <Text style={styles.studioStatLabel}>{label}</Text>
      <Text style={styles.studioStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
        {value}
      </Text>
    </View>
  );
}

function FitSignalCard({ signal }: { signal: DesignFitSignal }) {
  return (
    <View style={styles.signalCard}>
      <View style={styles.signalHeader}>
        <View style={[styles.signalDot, { backgroundColor: signalColor(signal.status) }]} />
        <Text style={styles.signalLabel}>{signal.label}</Text>
      </View>
      <Text style={styles.signalValue}>{signal.value}</Text>
      <Text style={styles.signalDetail}>{signal.detail}</Text>
    </View>
  );
}

function StyleChip({
  styleOption,
  selected,
  compatible,
  onPress,
}: {
  styleOption: DesignStyle;
  selected: boolean;
  compatible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.styleChip,
        selected && styles.styleChipSelected,
        !compatible && styles.styleChipMuted,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.styleTitle, selected && styles.styleTitleSelected]}>{styleOption.label}</Text>
      <Text style={[styles.styleText, selected && styles.styleTextSelected]}>{styleOption.description}</Text>
      <View style={styles.tagRow}>
        {styleOption.tags.slice(0, 2).map((tag) => (
          <Text key={tag} style={[styles.tag, selected && styles.tagSelected]}>
            {tag}
          </Text>
        ))}
      </View>
    </Pressable>
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

function AduModelCard({ model, selected, onPress }: { model: AduModel; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.modelCard, selected && styles.modelCardSelected, pressed && styles.pressed]}
    >
      <Image source={{ uri: model.imageUrl }} style={styles.modelImage} contentFit="cover" transition={200} />
      <View style={styles.modelBody}>
        <View style={styles.conceptHeader}>
          <Text style={styles.modelTitle}>{model.name}</Text>
          <Text style={styles.fitBadge}>{model.fitScore}% fit</Text>
        </View>
        <Text style={styles.modelMeta}>
          {model.sqft} sqft - {model.beds ? `${model.beds} bed` : "Studio"} - {model.baths} bath
        </Text>
        <Text style={styles.modelMeta}>
          {methodLabel(model.constructionMethod)} - {budgetLabel(model.budgetBand)}
        </Text>
        <View style={styles.modelStats}>
          <Text style={styles.modelStat}>{formatCurrencyCompact(model.priceFrom)} from</Text>
          <Text style={styles.modelStat}>{formatCurrencyCompact(model.monthlyEstimate)}/mo</Text>
        </View>
        <View style={styles.tagRow}>
          {model.tags.slice(0, 3).map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
        <Text style={styles.sourceText}>{model.fitNotes[0]}</Text>
      </View>
    </Pressable>
  );
}

function buildFitSignals(project: Project, parcel: ParcelSummary, model: AduModel, placement: DesignPlacement): DesignFitSignal[] {
  const coverage = ((project.primaryHomeSqFt + model.sqft) / parcel.lotSqFt) * 100;
  const insideBuildable = model.sqft <= parcel.buildableAreaSqFt;
  const centeredInRearZone =
    placement.xPercent >= 50 && placement.xPercent <= 80 && placement.yPercent >= 54 && placement.yPercent <= 80;
  const constraintText = parcel.constraints.slice(0, 2).join(", ");

  return [
    {
      id: "buildable-area",
      label: "Buildable area",
      value: `${model.sqft}/${parcel.buildableAreaSqFt} sqft`,
      status: insideBuildable ? "good" : "blocked",
      detail: insideBuildable ? "Model fits the starter buildable-area allowance." : "Choose a smaller model or update parcel facts.",
    },
    {
      id: "setbacks",
      label: "Setbacks",
      value: `${parcel.setbacks.side} side / ${parcel.setbacks.rear} rear`,
      status: centeredInRearZone ? "good" : "review",
      detail: centeredInRearZone ? "Placement stays inside the visual rear buildable zone." : "Move the model deeper into the highlighted zone.",
    },
    {
      id: "lot-coverage",
      label: "Lot coverage",
      value: `${Math.round(coverage)}% modeled`,
      status: coverage <= 45 ? "good" : coverage <= 55 ? "review" : "blocked",
      detail: coverage <= 45 ? "Starter coverage is conservative." : "Confirm local lot coverage and impervious surface limits.",
    },
    {
      id: "access-utility",
      label: "Access and utility",
      value: constraintText ? "Review needed" : "Clear",
      status: constraintText ? "review" : "good",
      detail: constraintText || "No starter access constraints are listed for this parcel.",
    },
  ];
}

function signalColor(status: DesignFitSignal["status"]) {
  if (status === "blocked") return "#B84D35";
  if (status === "review") return colors.permit;
  return colors.success;
}

function methodLabel(method: AduModel["constructionMethod"]) {
  const labels: Record<AduModel["constructionMethod"], string> = {
    conversion: "Conversion",
    modular: "Modular",
    prefab: "Prefab",
    site_built: "Site-built",
  };
  return labels[method];
}

function budgetLabel(budgetBand: AduModel["budgetBand"]) {
  const labels: Record<AduModel["budgetBand"], string> = {
    "250k_400k": "$250k-$400k",
    "400k_plus": "$400k+",
    under_250k: "Under $250k",
  };
  return labels[budgetBand];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  contextTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  contextCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  contextLabel: {
    ...typography.label,
    color: colors.highlighter,
  },
  contextAddress: {
    ...typography.h2,
    color: colors.background,
    fontSize: 18,
    lineHeight: 23,
  },
  contextBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contextBadgeText: {
    ...typography.label,
    color: colors.background,
    fontSize: 10,
  },
  contextStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  studioStat: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 132,
    padding: spacing.sm,
  },
  studioStatLabel: {
    ...typography.label,
    color: colors.faint,
    fontSize: 10,
  },
  studioStatValue: {
    ...typography.h2,
    color: colors.background,
    fontSize: 15,
    lineHeight: 19,
  },
  plannerCard: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  plannerCardWide: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  plannerCanvas: {
    flex: 1.85,
    gap: spacing.sm,
  },
  plannerInspector: {
    flex: 0.92,
    gap: spacing.md,
    minWidth: 280,
  },
  canvasToolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  canvasLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  canvasLabelText: {
    ...typography.label,
    color: colors.muted,
  },
  viewSwitch: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  viewSwitchButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewSwitchActive: {
    backgroundColor: colors.parcel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewSwitchActiveText: {
    ...typography.label,
    color: colors.canvas,
  },
  viewSwitchText: {
    ...typography.label,
    color: colors.text,
  },
  sketch: {
    gap: spacing.sm,
  },
  lotFrame: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 430,
    overflow: "hidden",
    position: "relative",
  },
  aerialImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.92,
  },
  aerialWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,20,27,0.12)",
  },
  primaryHouse: {
    alignItems: "center",
    backgroundColor: "rgba(251,250,244,0.9)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 112,
    justifyContent: "center",
    left: 42,
    position: "absolute",
    top: 54,
    width: 170,
  },
  buildableArea: {
    alignItems: "center",
    backgroundColor: "rgba(207,248,109,0.18)",
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: radii.sm,
    borderStyle: "dashed",
    borderWidth: 2,
    bottom: 52,
    justifyContent: "center",
    position: "absolute",
    right: 34,
    top: 86,
    width: "50%",
  },
  aduBlock: {
    alignItems: "center",
    backgroundColor: "rgba(228,240,255,0.78)",
    borderColor: colors.parcel,
    borderRadius: radii.sm,
    borderWidth: 2,
    justifyContent: "center",
    position: "absolute",
    paddingHorizontal: spacing.xs,
  },
  sketchLabel: {
    ...typography.label,
    color: colors.text,
    textAlign: "center",
  },
  aduLabel: {
    ...typography.label,
    color: colors.ink,
    fontSize: 10,
    textAlign: "center",
  },
  aduMeta: {
    ...typography.mono,
    color: colors.ink,
    fontSize: 10,
    lineHeight: 14,
  },
  setbackLabel: {
    ...typography.mono,
    backgroundColor: colors.canvas,
    borderRadius: radii.xs,
    color: colors.parcel,
    fontSize: 11,
    overflow: "hidden",
    paddingHorizontal: spacing.xs,
    position: "absolute",
  },
  sideSetback: {
    right: 8,
    top: 116,
    transform: [{ rotate: "90deg" }],
  },
  rearSetback: {
    bottom: 10,
    right: 72,
  },
  sketchMeta: {
    ...typography.mono,
    color: colors.muted,
    fontSize: 11,
  },
  plannerSummary: {
    gap: spacing.sm,
  },
  plannerTitleGroup: {
    gap: 2,
  },
  placementTools: {
    gap: spacing.md,
  },
  nudgePad: {
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
  },
  nudgeMiddle: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  nudgeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 46,
  },
  pressed: {
    opacity: 0.82,
  },
  fitList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  signalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    flexGrow: 1,
    flexBasis: "47%",
    gap: 2,
    padding: spacing.sm,
  },
  signalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  signalDot: {
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
  signalLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  signalValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  signalDetail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  styleRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  styleChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 218,
  },
  styleChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.highlighter,
  },
  styleChipMuted: {
    opacity: 0.72,
  },
  styleTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  styleTitleSelected: {
    color: colors.background,
  },
  styleText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  styleTextSelected: {
    color: colors.background,
  },
  parcelCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    borderLeftColor: colors.blueprint,
    borderLeftWidth: 3,
    gap: spacing.md,
    padding: spacing.md,
  },
  factGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  fact: {
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderWidth: 1,
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
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
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
    width: 270,
  },
  modelCardSelected: {
    borderColor: colors.highlighter,
    borderWidth: 2,
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
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
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
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
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
    borderLeftColor: colors.blueprint,
    borderLeftWidth: 3,
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
    borderLeftColor: colors.clay,
    borderLeftWidth: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  photoIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 70,
    justifyContent: "center",
    width: 70,
  },
  photoPreview: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    height: 80,
    width: 96,
  },
  photoText: {
    flex: 1,
    gap: 2,
    minWidth: 180,
  },
  photoActions: {
    flexBasis: "100%",
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: "#B84D35",
    fontSize: 12,
    lineHeight: 17,
  },
  conceptCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    borderLeftColor: colors.clay,
    borderLeftWidth: 4,
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    ...typography.label,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    color: colors.muted,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagSelected: {
    backgroundColor: colors.background,
    color: colors.accentDark,
  },
});
