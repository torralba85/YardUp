import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Button } from "../../src/components/Button";
import { RevenueSnapshot } from "../../src/components/RevenueSnapshot";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { YardUpLogo } from "../../src/components/YardUpLogo";
import { aduModels } from "../../src/data/aduModels";
import { inferJurisdiction } from "../../src/data/regulations";
import { defaultEstimateInput, estimateAduValue, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import { useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const backyardImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=86";

const workbenches = [
  { icon: "move", label: "Studio", detail: "Place a real model on the lot", route: "/ideas" },
  { icon: "map", label: "Permit", detail: "Read zoning and constraints", route: "/guide" },
  { icon: "bar-chart-2", label: "Estimate", detail: "Model value, rent, and ROI", route: "/estimate" },
  { icon: "send", label: "Build", detail: "Prepare a quote-ready packet", route: "/contractors" },
  { icon: "image", label: "References", detail: "Save precedent ADUs", route: "/inspiration" },
] as const;

const nextActions = [
  { icon: "tool", action: "Confirm side yard variance path", impact: "High", status: "Open" },
  { icon: "map-pin", action: "Verify protected tree clearance", impact: "Medium", status: "Open" },
  { icon: "truck", action: "Evaluate parking requirement options", impact: "Medium", status: "Review" },
  { icon: "file-text", action: "Complete quote packet sections", impact: "High", status: "In progress" },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const createProject = useAppStore((state) => state.createProject);
  const storageMode = useAppStore((state) => state.storageMode);
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const startProject = async () => {
    const cleanAddress = address.trim();

    if (!cleanAddress) {
      setAddressError("Enter a property address or city.");
      return;
    }

    setAddressError("");
    setIsStarting(true);

    try {
      await createProject(cleanAddress, inferJurisdiction(cleanAddress));
      setAddress("");
      router.push("/wizard/step-1");
    } catch {
      setAddressError("Could not start the estimate. Try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const isWide = width >= 980;
  const narrow = width < 560;
  const status = project?.status.replace(/_/g, " ") ?? "not run";
  const storageLabel = storageMode === "sqlite" ? (isWide ? "Saved locally" : "Local") : (isWide ? "Memory mode" : "Memory");
  const estimateInput = project?.lastEstimateInput ?? defaultEstimateInput;
  const estimate = project?.lastEstimate ?? estimateAduValue(estimateInput);
  const sentQuotes = project ? quoteRequests.filter((request) => request.projectId === project.id).length : 0;
  const quotePacketReady = project ? 4 + Number(Boolean(project.lastEstimate)) + Number(Boolean(project.selectedModelId)) : 2;

  return (
    <Screen scroll>
      <View style={styles.topbar}>
        <View style={styles.brandGroup}>
          <YardUpLogo size={32} />
          <Text style={styles.brandLine}>ADU earning potential and builder connection</Text>
        </View>
        {isWide ? (
          <View style={styles.topbarActions}>
            <View style={styles.savedBadge}>
              <Feather name={storageMode === "sqlite" ? "check-circle" : "wifi-off"} size={16} color={colors.success} />
              <Text style={styles.savedText}>{storageLabel}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/ideas")} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Feather name="settings" size={18} color={colors.text} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={[styles.commandCenter, isWide && styles.commandCenterWide]}>
        <RevenueSnapshot
          builderMatches={contractors.length}
          estimate={estimate}
          estimateInput={estimateInput}
          projectName={project?.name}
          quotePacketReady={quotePacketReady}
          sentQuotes={sentQuotes}
          wide={isWide}
          onAdjust={() => router.push("/estimate")}
        />

        <View style={[styles.studyPanel, isWide && styles.studyPanelWide]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Run property study</Text>
            <Text style={styles.studyStatus}>{status}</Text>
          </View>
          <View style={styles.inputShell}>
            <Feather name="search" size={18} color={colors.muted} />
            <TextInput
              accessibilityLabel="Property address"
              autoCapitalize="words"
              onChangeText={(value) => {
                setAddress(value);
                if (addressError) setAddressError("");
              }}
              onSubmitEditing={startProject}
              placeholder={project?.address ?? "Address or city"}
              placeholderTextColor={colors.muted}
              returnKeyType="go"
              style={styles.searchInput}
              textContentType="fullStreetAddress"
              value={address}
            />
          </View>
          {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
          <Button disabled={isStarting} icon="arrow-right" onPress={startProject}>
            {isStarting ? "Starting..." : "Start study"}
          </Button>

          <View style={styles.studyDivider} />
          <View style={styles.projectMini}>
            <View>
              <Text style={styles.miniLabel}>Active project</Text>
              <Text style={styles.miniTitle}>{project?.name ?? "No active study"}</Text>
            </View>
            <Text style={styles.miniValue}>{parcel?.zoning ?? "R-1H"}</Text>
          </View>
          <View style={styles.miniMetrics}>
            <MiniMetric label="Lot" value={parcel ? `${Math.round(parcel.lotSqFt / 1000)}k sqft` : "5k sqft"} />
            <MiniMetric label="Models" value={`${aduModels.length}`} />
            <MiniMetric label="Packet" value={project ? "open" : "none"} />
          </View>
        </View>
      </View>

      <SectionHeader title="Backyard fit" action="proof path" />
      <View style={styles.visualPanel}>
        <Image source={{ uri: backyardImage }} style={styles.visualImage} contentFit="cover" transition={250} />
        <LinearGradient colors={["rgba(14,44,32,0.04)", "rgba(14,44,32,0.68)"]} style={styles.visualShade} />
        <View style={styles.lotOutline}>
          <View style={styles.aduFootprint}>
            <Text style={styles.aduLabel}>ADU</Text>
            <Text style={styles.aduMeta}>640 sq ft</Text>
          </View>
          <View style={[styles.measureBubble, styles.measureTop]}>
            <Text style={styles.measureText}>setbacks</Text>
          </View>
          <View style={[styles.measureBubble, styles.measureBottom]}>
            <Text style={styles.measureText}>3'-6"</Text>
          </View>
        </View>
        <View style={styles.visualHeader}>
          <View>
            <Text style={styles.visualTitle}>Fit backs the rent</Text>
            <Text style={styles.visualText}>{parcel ? `${parcel.buildableAreaSqFt.toLocaleString()} sqft starter buildable area` : "Start with an address to run parcel fit"}</Text>
          </View>
          <View style={styles.visualToggle}>
            <Text style={styles.visualToggleActive}>3D</Text>
            <Text style={styles.visualToggleText}>2D</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statusGrid, isWide && styles.statusGridWide]}>
        <StatusCard title="Permit risk" value="62/100" detail="Moderate review" tone="permit" />
        <StatusCard title="ROI model" value={project?.lastEstimate ? formatPercent(project.lastEstimate.roi) : "18.4%"} detail="Saved assumptions" tone="success" />
        <StatusCard title="Quote packet" value="4/6" detail="Sections complete" tone="parcel" />
        <StatusCard title="Local-first" value={storageMode === "sqlite" ? "On" : "Memory"} detail="Data stays device-side" tone="accent" />
      </View>

      <View style={[styles.boardGrid, isWide && styles.boardGridWide]}>
        {project ? <ProjectSnapshot project={project} /> : <EmptySnapshot />}
        <WorkflowPanel />
      </View>

      <SectionHeader title="Workbenches" action="open tools" />
      <View style={[styles.workbenchGrid, isWide && styles.workbenchGridWide]}>
        {workbenches.map((item) => (
          <WorkbenchAction
            key={item.label}
            icon={item.icon}
            label={item.label}
            detail={item.detail}
            onPress={() => router.push(item.route)}
          />
        ))}
      </View>

      <SectionHeader title="Next actions" action="local queue" />
      <View style={styles.actionTable}>
        {nextActions.map((item) => (
          <View key={item.action} style={[styles.actionRow, narrow && styles.actionRowNarrow]}>
            <View style={styles.actionMain}>
              <View style={styles.actionIcon}>
                <Feather name={item.icon} size={15} color={colors.parcel} />
              </View>
              <Text style={styles.actionName} numberOfLines={2}>{item.action}</Text>
            </View>
            <View style={[styles.actionMeta, narrow && styles.actionMetaNarrow]}>
              <Text style={styles.actionImpact}>{item.impact}</Text>
              <Text style={styles.actionStatus}>{item.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
    </View>
  );
}

function StatusCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "accent" | "permit" | "parcel" | "success";
}) {
  const toneColor = tone === "permit" ? colors.permit : tone === "parcel" ? colors.parcel : tone === "success" ? colors.success : colors.accent;
  return (
    <View style={styles.statusCard}>
      <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusDetail}>{detail}</Text>
    </View>
  );
}

function WorkbenchAction({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.workbench, pressed && styles.pressed]}>
      <View style={styles.workbenchIcon}>
        <Feather name={icon} size={18} color={colors.canvas} />
      </View>
      <View style={styles.workbenchText}>
        <Text style={styles.workbenchTitle}>{label}</Text>
        <Text style={styles.workbenchDetail}>{detail}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

function EmptySnapshot() {
  return (
    <View style={styles.projectDeck}>
      <View style={styles.emptyHeader}>
        <View style={styles.emptyIcon}>
          <Feather name="map-pin" size={18} color={colors.canvas} />
        </View>
        <View style={styles.emptyCopy}>
          <Text style={styles.projectLabel}>Active study</Text>
          <Text style={styles.projectTitle}>No active property study</Text>
          <Text style={styles.projectAddress}>The next address becomes the working lot for fit, permits, ROI, and builder packet prep.</Text>
        </View>
      </View>
    </View>
  );
}

function ProjectSnapshot({ project }: { project: NonNullable<ReturnType<typeof useActiveProject>> }) {
  return (
    <View style={styles.projectDeck}>
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleGroup}>
          <Text style={styles.projectLabel}>Active study</Text>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <Text style={styles.projectAddress}>{project.address}</Text>
        </View>
        <Text style={styles.projectStatus}>{project.status.replace(/_/g, " ")}</Text>
      </View>

      {project.lastEstimate ? (
        <View style={styles.snapshotMetrics}>
          <FieldMetric label="Value" value={`${formatCurrencyCompact(project.lastEstimate.lowValue)}-${formatCurrencyCompact(project.lastEstimate.highValue)}`} />
          <FieldMetric label="ROI" value={formatPercent(project.lastEstimate.roi)} />
          <FieldMetric label="Payback" value={`${project.lastEstimate.paybackYears.toFixed(1)} yr`} />
        </View>
      ) : (
        <Text style={styles.projectHint}>The first estimate will pin value range, rent, cost, and payback to this property.</Text>
      )}

      <View style={styles.projectActions}>
        <Button icon="move" style={styles.projectActionButton} onPress={() => router.push("/ideas")}>
          Open Studio
        </Button>
        <Button style={styles.projectActionButton} variant="secondary" onPress={() => router.push(`/project/${project.id}`)}>
          View Packet
        </Button>
      </View>
    </View>
  );
}

function FieldMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldMetric}>
      <Text style={styles.fieldMetricLabel}>{label}</Text>
      <Text style={styles.fieldMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {value}
      </Text>
    </View>
  );
}

function WorkflowPanel() {
  const steps = ["Property study", "Studio", "Permit", "Estimate", "Build"];
  return (
    <View style={styles.workflowPanel}>
      <View style={styles.workflowHeader}>
        <Text style={styles.workflowTitle}>Workflow</Text>
        <Text style={styles.workflowMeta}>5 gates</Text>
      </View>
      {steps.map((step, index) => (
        <View key={step} style={styles.workflowStep}>
          <View style={[styles.workflowIndex, index === 0 && styles.workflowIndexActive]}>
            <Text style={[styles.workflowIndexText, index === 0 && styles.workflowIndexTextActive]}>{index + 1}</Text>
          </View>
          <View style={styles.workflowCopy}>
            <Text style={styles.workflowStepTitle}>{step}</Text>
            <Text style={styles.workflowStepMeta}>{index === 0 ? "Run zoning, lot, and site analysis" : index === 4 ? "Select builders and prepare packet" : "Not started"}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.muted} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  brandGroup: {
    flex: 1,
    gap: 2,
    minWidth: 230,
  },
  brand: {
    ...typography.h1,
    color: colors.text,
    fontSize: 26,
    lineHeight: 31,
  },
  brandAccent: {
    color: colors.accent,
  },
  brandLine: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  topbarActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  savedBadge: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderColor: colors.accentSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  savedText: {
    ...typography.label,
    color: colors.accentDark,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadows.crisp,
  },
  commandCenter: {
    gap: spacing.md,
  },
  commandCenterWide: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  visualPanel: {
    backgroundColor: colors.ink,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 360,
    overflow: "hidden",
    position: "relative",
    ...shadows.medium,
  },
  visualImage: {
    ...StyleSheet.absoluteFillObject,
  },
  visualShade: {
    ...StyleSheet.absoluteFillObject,
  },
  lotOutline: {
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: radii.sm,
    borderStyle: "dashed",
    borderWidth: 2,
    bottom: 132,
    left: "12%",
    position: "absolute",
    right: "14%",
    top: 86,
    transform: [{ rotate: "-5deg" }],
  },
  aduFootprint: {
    alignItems: "center",
    backgroundColor: "rgba(6,20,27,0.88)",
    borderColor: colors.highlighter,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 94,
    justifyContent: "center",
    position: "absolute",
    right: "20%",
    top: "34%",
    width: 124,
  },
  aduLabel: {
    ...typography.label,
    color: colors.canvas,
  },
  aduMeta: {
    ...typography.mono,
    color: colors.canvas,
    fontSize: 12,
  },
  measureBubble: {
    backgroundColor: "rgba(6,20,27,0.86)",
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: radii.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  measureTop: {
    right: 22,
    top: 34,
  },
  measureBottom: {
    bottom: 44,
    left: "45%",
  },
  measureText: {
    ...typography.label,
    color: colors.canvas,
    fontSize: 10,
  },
  visualHeader: {
    alignItems: "flex-end",
    bottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
  },
  visualTitle: {
    ...typography.title,
    color: colors.canvas,
  },
  visualText: {
    ...typography.body,
    color: "rgba(255,255,255,0.78)",
  },
  visualToggle: {
    backgroundColor: "rgba(6,20,27,0.78)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  visualToggleActive: {
    ...typography.label,
    backgroundColor: colors.canvas,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  visualToggleText: {
    ...typography.label,
    color: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  studyPanel: {
    alignSelf: "stretch",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  studyPanelWide: {
    flex: 0.85,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  panelTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
  },
  studyStatus: {
    ...typography.label,
    color: colors.muted,
    textTransform: "capitalize",
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minWidth: 0,
  },
  errorText: {
    ...typography.label,
    color: colors.warning,
  },
  studyDivider: {
    backgroundColor: colors.border,
    height: 1,
  },
  projectMini: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  miniLabel: {
    ...typography.label,
    color: colors.muted,
  },
  miniTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    marginTop: 2,
  },
  miniValue: {
    ...typography.mono,
    color: colors.parcel,
    fontSize: 13,
    lineHeight: 18,
  },
  miniMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  miniMetric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.sm,
  },
  miniMetricLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  miniMetricValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
  },
  statusGrid: {
    gap: spacing.sm,
  },
  statusGridWide: {
    flexDirection: "row",
  },
  statusCard: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: 158,
    padding: spacing.md,
    ...shadows.crisp,
  },
  statusDot: {
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
  statusTitle: {
    ...typography.label,
    color: colors.muted,
  },
  statusValue: {
    ...typography.title,
    color: colors.text,
    fontFamily: typography.mono.fontFamily,
    fontSize: 25,
    lineHeight: 30,
  },
  statusDetail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  boardGrid: {
    gap: spacing.md,
  },
  boardGridWide: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  projectDeck: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1.4,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  emptyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  emptyCopy: {
    flex: 1,
    gap: 2,
  },
  projectHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  projectTitleGroup: {
    flex: 1,
    gap: 2,
  },
  projectLabel: {
    ...typography.label,
    color: colors.accent,
  },
  projectTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
  },
  projectAddress: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  projectStatus: {
    ...typography.label,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.xs,
    color: colors.accentDark,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "capitalize",
  },
  snapshotMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  fieldMetric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: spacing.sm,
  },
  fieldMetricLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  fieldMetricValue: {
    ...typography.h2,
    color: colors.text,
    fontFamily: typography.mono.fontFamily,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  },
  projectHint: {
    ...typography.body,
    color: colors.muted,
  },
  projectActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  projectActionButton: {
    flexBasis: 170,
    flexGrow: 1,
  },
  workflowPanel: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.soft,
  },
  workflowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  workflowTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
  },
  workflowMeta: {
    ...typography.label,
    color: colors.muted,
  },
  workflowStep: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  workflowIndex: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  workflowIndexActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  workflowIndexText: {
    ...typography.mono,
    color: colors.muted,
    fontSize: 12,
  },
  workflowIndexTextActive: {
    color: colors.canvas,
  },
  workflowCopy: {
    flex: 1,
    gap: 1,
  },
  workflowStepTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  workflowStepMeta: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  workbenchGrid: {
    gap: spacing.sm,
  },
  workbenchGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  workbench: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexBasis: 210,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.md,
    ...shadows.crisp,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
  workbenchIcon: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  workbenchText: {
    flex: 1,
    gap: 2,
  },
  workbenchTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  workbenchDetail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionTable: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.soft,
  },
  actionRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  actionRowNarrow: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.parcelSoft,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  actionName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionMetaNarrow: {
    justifyContent: "space-between",
    paddingLeft: 40,
  },
  actionImpact: {
    ...typography.label,
    color: colors.muted,
    width: 64,
  },
  actionStatus: {
    ...typography.label,
    color: colors.accentDark,
    textAlign: "right",
    width: 82,
  },
});
