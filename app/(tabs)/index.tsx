import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Button } from "../../src/components/Button";
import { RevenueSnapshot } from "../../src/components/RevenueSnapshot";
import { RiskIndicator } from "../../src/components/RiskIndicator";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { YardUpLogo } from "../../src/components/YardUpLogo";
import { aduModels } from "../../src/data/aduModels";
import { inferJurisdiction, jurisdictionLabels } from "../../src/data/regulations";
import { defaultEstimateInput, estimateAduValue, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import { deriveRisk } from "../../src/domain/risk";
import { useActiveGuide, useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const PACKET_TOTAL = 6;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const guide = useActiveGuide();
  const createProject = useAppStore((state) => state.createProject);
  const storageMode = useAppStore((state) => state.storageMode);
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const concepts = useAppStore((state) => state.concepts);
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
  const storageLabel = storageMode === "sqlite" ? "Saved locally" : "Memory mode";
  const estimateInput = project?.lastEstimateInput ?? defaultEstimateInput;
  const estimate = project?.lastEstimate ?? estimateAduValue(estimateInput);
  const hasEstimate = Boolean(project?.lastEstimate);
  const projectQuotes = project ? quoteRequests.filter((request) => request.projectId === project.id) : [];
  const projectConcepts = project ? concepts.filter((concept) => concept.projectId === project.id) : [];
  const packetReady = useMemo(
    () => derivePacketReady({ hasEstimate, hasConcept: projectConcepts.length > 0, hasParcel: Boolean(parcel), hasGuide: Boolean(guide), quotesSent: projectQuotes.length }),
    [hasEstimate, projectConcepts.length, parcel, guide, projectQuotes.length],
  );
  const risk = useMemo(
    () => deriveRisk({ guide, parcel }),
    [guide, parcel],
  );
  const nextActions = useMemo(
    () => deriveNextActions({ parcel, guide, hasEstimate, hasConcept: projectConcepts.length > 0, packetReady, hasProject: Boolean(project) }),
    [parcel, guide, hasEstimate, projectConcepts.length, packetReady, project],
  );

  return (
    <Screen scroll>
      <View style={styles.topbar}>
        <View style={styles.brandGroup}>
          <YardUpLogo size={32} />
          <Text style={styles.brandLine}>Earning potential and builder readiness for your backyard</Text>
        </View>
        {isWide ? (
          <View style={styles.topbarActions}>
            <View style={styles.savedBadge}>
              <Feather name={storageMode === "sqlite" ? "check-circle" : "cloud-off"} size={15} color={colors.accentDark} />
              <Text style={styles.savedText}>{storageLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.commandCenter, isWide && styles.commandCenterWide]}>
        <RevenueSnapshot
          builderMatches={contractors.length}
          estimate={estimate}
          estimateInput={estimateInput}
          projectName={project?.name}
          quotePacketReady={packetReady}
          sentQuotes={projectQuotes.length}
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
            {isStarting ? "Starting" : "Start study"}
          </Button>

          <View style={styles.studyDivider} />
          <View style={styles.projectMini}>
            <View style={styles.projectMiniText}>
              <Text style={styles.miniLabel}>Active study</Text>
              <Text style={styles.miniTitle}>{project?.name ?? "No active study"}</Text>
            </View>
            <Text style={styles.miniValue}>{parcel?.zoning ?? "—"}</Text>
          </View>
          <View style={styles.miniMetrics}>
            <MiniMetric label="Lot" value={parcel ? `${Math.round(parcel.lotSqFt / 1000)}k sqft` : "—"} />
            <MiniMetric label="Models" value={`${aduModels.length}`} />
            <MiniMetric label="Packet" value={project ? `${packetReady}/${PACKET_TOTAL}` : "—"} />
          </View>
        </View>
      </View>

      <SectionHeader title="Permit signal" action={parcel ? `verified ${parcel.verifiedAt}` : "needs a study"} />
      <RiskIndicator
        label={guide ? `${jurisdictionLabels[guide.jurisdiction]} review` : "Run a study to see permit risk"}
        level={risk.level}
        score={risk.score}
        drivers={risk.drivers}
        verifiedAt={parcel?.verifiedAt}
        verifyLabel={guide ? "Open permit guide" : undefined}
        onVerify={guide ? () => router.push("/guide") : undefined}
      />

      <View style={[styles.boardGrid, isWide && styles.boardGridWide]}>
        {project ? (
          <ProjectSnapshot
            project={project}
            estimate={hasEstimate ? estimate : null}
            packetReady={packetReady}
            sentQuotes={projectQuotes.length}
          />
        ) : (
          <EmptySnapshot />
        )}
        <WorkflowPanel
          hasEstimate={hasEstimate}
          hasConcept={projectConcepts.length > 0}
          packetReady={packetReady}
          sentQuotes={projectQuotes.length}
        />
      </View>

      {nextActions.length > 0 ? (
        <>
          <SectionHeader title="Next actions" action={`${nextActions.length} open`} />
          <View style={styles.actionTable}>
            {nextActions.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.actionRow,
                  narrow && styles.actionRowNarrow,
                  index === nextActions.length - 1 && styles.actionRowLast,
                ]}
              >
                <View style={styles.actionMain}>
                  <View style={[styles.actionIcon, item.tone === "builder" && styles.actionIconBuilder, item.tone === "permit" && styles.actionIconPermit]}>
                    <Feather name={item.icon} size={15} color={item.tone === "permit" ? colors.permit : item.tone === "builder" ? colors.parcel : colors.accentDark} />
                  </View>
                  <Text style={styles.actionName} numberOfLines={2}>{item.label}</Text>
                </View>
                <View style={[styles.actionMeta, narrow && styles.actionMetaNarrow]}>
                  <Text style={styles.actionImpact}>{item.impact}</Text>
                  <Pressable accessibilityRole="button" onPress={() => router.push(item.route)} style={({ pressed }) => [styles.actionLink, pressed && styles.actionLinkPressed]}>
                    <Text style={styles.actionLinkText}>{item.cta}</Text>
                    <Feather name="chevron-right" size={14} color={colors.accentDark} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
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

function ProjectSnapshot({
  project,
  estimate,
  packetReady,
  sentQuotes,
}: {
  project: NonNullable<ReturnType<typeof useActiveProject>>;
  estimate: ReturnType<typeof estimateAduValue> | null;
  packetReady: number;
  sentQuotes: number;
}) {
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

      {estimate ? (
        <View style={styles.snapshotStrip}>
          <StripMetric label="Value" value={`${formatCurrencyCompact(estimate.lowValue)}–${formatCurrencyCompact(estimate.highValue)}`} />
          <View style={styles.stripDivider} />
          <StripMetric label="ROI" value={formatPercent(estimate.roi)} />
          <View style={styles.stripDivider} />
          <StripMetric label="Payback" value={`${estimate.paybackYears.toFixed(1)} yr`} />
        </View>
      ) : (
        <Text style={styles.projectHint}>The first estimate will pin value range, rent, cost, and payback to this property.</Text>
      )}

      <View style={styles.snapshotStrip}>
        <StripMetric label="Packet" value={`${packetReady}/${PACKET_TOTAL}`} />
        <View style={styles.stripDivider} />
        <StripMetric label="Quotes sent" value={`${sentQuotes}`} />
      </View>

      <View style={styles.projectActions}>
        <Button icon="send" style={styles.projectActionButton} onPress={() => router.push("/contractors")}>
          Open Build
        </Button>
        <Button style={styles.projectActionButton} variant="secondary" onPress={() => router.push(`/project/${project.id}`)}>
          View packet
        </Button>
      </View>
    </View>
  );
}

function StripMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stripItem}>
      <Text style={styles.stripLabel}>{label}</Text>
      <Text style={styles.stripValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function WorkflowPanel({
  hasEstimate,
  hasConcept,
  packetReady,
  sentQuotes,
}: {
  hasEstimate: boolean;
  hasConcept: boolean;
  packetReady: number;
  sentQuotes: number;
}) {
  const steps = [
    { title: "Property study", done: true, meta: "Lot, zoning, parcel facts" },
    { title: "Estimate", done: hasEstimate, meta: hasEstimate ? "Saved" : "Set size, rent, cost" },
    { title: "Build", done: sentQuotes > 0, meta: sentQuotes > 0 ? `${sentQuotes} quote${sentQuotes === 1 ? "" : "s"} sent` : "Send packet to builders" },
    { title: "Permit", done: packetReady >= PACKET_TOTAL, meta: "Verify with local jurisdiction" },
    { title: "Studio", done: hasConcept, meta: hasConcept ? "Concept ready" : "Optional proof path" },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <View style={styles.workflowPanel}>
      <View style={styles.workflowHeader}>
        <Text style={styles.workflowTitle}>Study path</Text>
        <Text style={styles.workflowMeta}>{completed}/{steps.length} done</Text>
      </View>
      {steps.map((step, index) => {
        const isActive = !step.done && (index === 0 || steps[index - 1]?.done);
        return (
          <View key={step.title} style={styles.workflowStep}>
            <View style={[styles.workflowIndex, step.done && styles.workflowIndexDone, isActive && styles.workflowIndexActive]}>
              {step.done ? (
                <Feather name="check" size={13} color={colors.canvas} />
              ) : (
                <Text style={[styles.workflowIndexText, isActive && styles.workflowIndexTextActive]}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.workflowCopy}>
              <Text style={styles.workflowStepTitle}>{step.title}</Text>
              <Text style={styles.workflowStepMeta}>{step.meta}</Text>
            </View>
            {step.done ? <Feather name="check-circle" size={15} color={colors.accent} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function derivePacketReady({
  hasEstimate,
  hasConcept,
  hasParcel,
  hasGuide,
  quotesSent,
}: {
  hasEstimate: boolean;
  hasConcept: boolean;
  hasParcel: boolean;
  hasGuide: boolean;
  quotesSent: number;
}) {
  const items = [
    hasEstimate,
    hasConcept,
    hasParcel,
    hasGuide,
    quotesSent > 0,
    hasEstimate && hasParcel, // ROI summary requires both
  ];
  return items.filter(Boolean).length;
}

function deriveNextActions({
  parcel,
  guide,
  hasEstimate,
  hasConcept,
  packetReady,
  hasProject,
}: {
  parcel: ReturnType<typeof useActiveParcelSummary>;
  guide: ReturnType<typeof useActiveGuide>;
  hasEstimate: boolean;
  hasConcept: boolean;
  packetReady: number;
  hasProject: boolean;
}): NextAction[] {
  const actions: NextAction[] = [];

  if (!hasProject) {
    return actions;
  }
  if (!hasEstimate) {
    actions.push({ label: "Set first estimate", icon: "bar-chart-2", impact: "High", cta: "Estimate", route: "/estimate", tone: "default" });
  }
  if (parcel && parcel.constraints.length > 0) {
    actions.push({
      label: `Verify ${parcel.constraints[0]}`,
      icon: "alert-circle",
      impact: "High",
      cta: "Permit",
      route: "/guide",
      tone: "permit",
    });
  }
  if (guide && guide.blockers.length > 0) {
    actions.push({
      label: guide.blockers[0],
      icon: "shield",
      impact: "Medium",
      cta: "Review",
      route: "/guide",
      tone: "permit",
    });
  }
  if (packetReady < PACKET_TOTAL) {
    actions.push({
      label: `Complete quote packet (${packetReady}/${PACKET_TOTAL})`,
      icon: "file-text",
      impact: packetReady < 4 ? "High" : "Medium",
      cta: "Build",
      route: "/contractors",
      tone: "builder",
    });
  }
  if (!hasConcept) {
    actions.push({ label: "Generate first lot-specific concept", icon: "move", impact: "Optional", cta: "Studio", route: "/ideas", tone: "default" });
  }
  return actions.slice(0, 4);
}

type NextAction = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  impact: "High" | "Medium" | "Optional";
  cta: string;
  route: "/estimate" | "/guide" | "/contractors" | "/ideas";
  tone: "default" | "builder" | "permit";
};

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
  commandCenter: {
    gap: spacing.md,
  },
  commandCenterWide: {
    alignItems: "stretch",
    flexDirection: "row",
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
  projectMiniText: {
    flex: 1,
    gap: 2,
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
    ...typography.mono,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
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
  snapshotStrip: {
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.sm,
  },
  stripItem: {
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  stripDivider: {
    backgroundColor: colors.border,
    width: 1,
  },
  stripLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  stripValue: {
    ...typography.mono,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
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
    backgroundColor: colors.canvas,
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
  workflowIndexDone: {
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
  actionRowLast: {
    borderBottomWidth: 0,
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
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  actionIconBuilder: {
    backgroundColor: colors.parcelSoft,
  },
  actionIconPermit: {
    backgroundColor: colors.permitSoft,
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
  actionLink: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionLinkPressed: {
    opacity: 0.85,
  },
  actionLinkText: {
    ...typography.label,
    color: colors.accentDark,
  },
});
