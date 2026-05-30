import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Button } from "../../src/components/Button";
import { RevenueSnapshot } from "../../src/components/RevenueSnapshot";
import { RiskIndicator } from "../../src/components/RiskIndicator";
import { Screen } from "../../src/components/Screen";
import { LotFoundryLogo } from "../../src/components/LotFoundryLogo";
import { inferJurisdiction, jurisdictionLabels } from "../../src/data/regulations";
import { defaultEstimateInput, estimateAduValue, formatCurrencyCompact, formatPercent } from "../../src/domain/estimator";
import { getMatchedContractors, isDeliveredQuote } from "../../src/domain/marketplace";
import { deriveRisk } from "../../src/domain/risk";
import { useActiveGuide, useActiveParcelSummary, useActiveProject, useAppStore } from "../../src/state/appStore";
import { useAuthStore } from "../../src/state/authStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const QUOTE_PACKET_TOTAL = 4;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const guide = useActiveGuide();
  const createProject = useAppStore((state) => state.createProject);
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const concepts = useAppStore((state) => state.concepts);

  const { currentUser, setAuthModalOpen } = useAuthStore();
  const isGuest = !currentUser || currentUser.isAnonymous;
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
  const estimateInput = project?.lastEstimateInput ?? defaultEstimateInput;
  const estimate = project?.lastEstimate ?? estimateAduValue(estimateInput);
  const hasEstimate = Boolean(project?.lastEstimate);
  const projectQuotes = project ? quoteRequests.filter((request) => request.projectId === project.id) : [];
  const projectConcepts = project ? concepts.filter((concept) => concept.projectId === project.id) : [];
  const packetReady = useMemo(
    () => derivePacketReady({ hasEstimate, hasConcept: projectConcepts.length > 0, hasParcel: Boolean(parcel), hasGuide: Boolean(guide) }),
    [hasEstimate, projectConcepts.length, parcel, guide],
  );
  const risk = useMemo(() => deriveRisk({ guide, parcel }), [guide, parcel]);
  const nextActions = useMemo(
    () => deriveNextActions({ parcel, guide, hasEstimate, hasConcept: projectConcepts.length > 0, packetReady, hasProject: Boolean(project) }),
    [parcel, guide, hasEstimate, projectConcepts.length, packetReady, project],
  );
  const costLow = estimate.totalCost * 0.9;
  const costHigh = estimate.totalCost * 1.1;
  const packetPercent = Math.round((Math.min(packetReady, QUOTE_PACKET_TOTAL) / QUOTE_PACKET_TOTAL) * 100);
  const matchedContractors = useMemo(
    () => (project ? getMatchedContractors(contractors, project.jurisdiction) : []),
    [contractors, project],
  );
  const deliveredQuotes = projectQuotes.filter(isDeliveredQuote);
  const needsLocalReview = project?.jurisdiction === "local-review";
  const topContractor = useMemo(
    () => [...matchedContractors].sort((a, b) => b.matchScore - a.matchScore)[0],
    [matchedContractors],
  );

  return (
    <Screen scroll>
      <View style={styles.appBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          onPress={() => setAuthModalOpen(true)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Feather name="user" size={20} color={isGuest ? colors.muted : colors.emerald} />
          {!isGuest ? <View style={styles.activeUserDot} /> : null}
        </Pressable>
        <LotFoundryLogo size={34} />
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="bell" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push("/wizard/step-1")} style={({ pressed }) => [styles.propertyControl, pressed && styles.pressed]}>
        <View style={styles.propertyLeft}>
          <Feather name="home" size={21} color={colors.muted} />
          <View style={styles.propertyText}>
            <Text style={styles.propertyAddress} numberOfLines={1}>{project?.address ?? "Add a supported-market property"}</Text>
            <Text style={styles.propertyMeta} numberOfLines={1}>{project?.name ?? "Start with earning potential"}</Text>
          </View>
        </View>
        <Feather name="edit-2" size={20} color={colors.accentDark} />
      </Pressable>

      <RevenueSnapshot
        builderMatches={matchedContractors.length}
        estimate={estimate}
        estimateInput={estimateInput}
        assumptionsLabel={needsLocalReview ? "Estimate only - verify local inputs" : hasEstimate ? "Modeled estimate - verify assumptions" : undefined}
        quotePacketReady={packetReady}
        sentQuotes={deliveredQuotes.length}
        wide={isWide}
        onAdjust={() => router.push("/estimate")}
      />

      <View style={[styles.financeGrid, isWide && styles.financeGridWide]}>
        <ValueTile label="Est. total cost" value={`${formatCurrencyCompact(costLow)}-${formatCurrencyCompact(costHigh)}`} wide={isWide} />
        <ValueTile label="Est. payback" value={`${estimate.paybackYears.toFixed(1)} years`} wide={isWide} />
        <ValueTile label="ROI" value={formatPercent(estimate.roi)} tone={estimate.roi > 0 ? "roi" : "default"} wide={isWide} />
        <ValueTile label="Value range" value={`${formatCurrencyCompact(estimate.lowValue)}-${formatCurrencyCompact(estimate.highValue)}`} wide={isWide} />
      </View>

      <View style={[styles.marketGrid, isWide && styles.marketGridWide]}>
        <View style={styles.builderPreview}>
          <View style={styles.builderPreviewHeader}>
            <View style={styles.builderTitleRow}>
              <Feather name="tool" size={20} color={colors.accentDark} />
              <View style={styles.previewCopy}>
                <Text style={styles.previewTitle}>Builder matches</Text>
                <Text style={styles.previewText}>
                  {!project
                    ? "Start a property study to see declared coverage."
                    : needsLocalReview
                      ? "Local builder coverage needs verification."
                      : matchedContractors.length
                        ? `${matchedContractors.length} qualified builders declared for this market.`
                        : "No declared builder matches for this market yet."}
                </Text>
              </View>
            </View>
            <Text style={styles.previewPill}>
              {!project ? "study first" : needsLocalReview ? "verify market" : `${matchedContractors.length} ready`}
            </Text>
          </View>
          <View style={styles.builderPreviewBody}>
            <View style={styles.initialStack}>
              {matchedContractors.slice(0, 3).map((contractor) => (
                <View key={contractor.id} style={styles.initialBubble}>
                  <Text style={styles.initialText}>{contractor.name.slice(0, 1)}</Text>
                </View>
              ))}
            </View>
            <Button style={styles.builderButton} onPress={() => router.push("/contractors")}>
              {needsLocalReview ? "Review coverage" : "View matches"}
            </Button>
          </View>
          {topContractor ? <Text style={styles.topMatchText}>{topContractor.name} leads at {topContractor.matchScore}% match.</Text> : null}
        </View>

        <View style={styles.packetPreview}>
          <View style={styles.packetHeader}>
            <Text style={styles.previewTitle}>Quote packet readiness</Text>
            <Text style={styles.packetPercent}>{packetPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${packetPercent}%` }]} />
          </View>
          <View style={styles.packetList}>
            <PacketChecklistItem label="Income model" ready={hasEstimate} />
            <PacketChecklistItem label="Parcel snapshot" ready={Boolean(parcel)} />
            <PacketChecklistItem label="Exterior concept" ready={projectConcepts.length > 0} />
            <PacketChecklistItem label="Permit notes" ready={Boolean(guide)} />
          </View>
          <Button variant="secondary" onPress={() => router.push("/contractors")}>
            Complete packet
          </Button>
        </View>
      </View>

      <View style={styles.studyStrip}>
        <View style={styles.studyStripHeader}>
          <Text style={styles.previewTitle}>Run another property study</Text>
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
      </View>

      <View style={styles.sectionBreak}>
        <Text style={styles.sectionBreakTitle}>Permit signal</Text>
        <Text style={styles.sectionBreakMeta}>
          {needsLocalReview ? "local verification" : parcel ? `verified ${parcel.verifiedAt}` : "needs a study"}
        </Text>
      </View>
      <RiskIndicator
        label={guide ? `${jurisdictionLabels[guide.jurisdiction]} review` : "Run a study to see permit risk"}
        level={risk.level}
        score={risk.score}
        drivers={risk.drivers}
        verifiedAt={parcel?.verifiedAt}
        verifyLabel={guide ? "Open permit guide" : undefined}
        onVerify={guide ? () => router.push("/guide") : undefined}
      />

      {nextActions.length > 0 ? (
        <>
          <View style={styles.sectionBreak}>
            <Text style={styles.sectionBreakTitle}>Next actions</Text>
            <Text style={styles.sectionBreakMeta}>{nextActions.length} open</Text>
          </View>
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

function ValueTile({
  label,
  value,
  tone = "default",
  wide = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "roi";
  wide?: boolean;
}) {
  return (
    <View style={[styles.valueTile, wide && styles.valueTileWide, tone === "roi" && styles.valueTileRoi]}>
      <Text style={[styles.valueTileLabel, tone === "roi" && styles.valueTileLabelRoi]}>{label}</Text>
      <Text style={[styles.valueTileValue, tone === "roi" && styles.valueTileValueRoi]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {value}
      </Text>
    </View>
  );
}

function PacketChecklistItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={[styles.packetItem, ready && styles.packetItemReady]}>
      <Feather name={ready ? "check-circle" : "circle"} size={16} color={ready ? colors.accent : colors.permit} />
      <Text style={[styles.packetItemText, !ready && styles.packetItemPending]}>{label}</Text>
    </View>
  );
}

function derivePacketReady({
  hasEstimate,
  hasConcept,
  hasParcel,
  hasGuide,
}: {
  hasEstimate: boolean;
  hasConcept: boolean;
  hasParcel: boolean;
  hasGuide: boolean;
}) {
  const items = [
    hasEstimate,
    hasConcept,
    hasParcel,
    hasGuide,
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
  if (packetReady < QUOTE_PACKET_TOTAL) {
    actions.push({
      label: `Complete quote packet (${packetReady}/${QUOTE_PACKET_TOTAL})`,
      icon: "file-text",
      impact: packetReady < 4 ? "High" : "Medium",
      cta: "Builders",
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
  appBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  activeUserDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.emerald,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  propertyControl: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.soft,
  },
  propertyLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    minWidth: 0,
  },
  propertyText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  propertyAddress: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
  },
  propertyMeta: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  financeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  financeGridWide: {
    flexWrap: "nowrap",
  },
  valueTile: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 112,
    padding: spacing.md,
    ...shadows.soft,
  },
  valueTileWide: {
    flexBasis: 0,
    minWidth: 0,
  },
  valueTileLabel: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  valueTileValue: {
    ...typography.mono,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  valueTileRoi: {
    backgroundColor: "#FBF7EE",
    borderColor: colors.capitalBrass,
  },
  valueTileLabelRoi: {
    color: colors.capitalBrass,
  },
  valueTileValueRoi: {
    color: colors.capitalBrass,
    fontFamily: typography.monoLarge.fontFamily,
  },
  marketGrid: {
    gap: spacing.md,
  },
  marketGridWide: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  builderPreview: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  builderPreviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  builderTitleRow: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
  },
  previewText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  previewPill: {
    ...typography.label,
    backgroundColor: colors.mint,
    borderColor: colors.successSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.accentDark,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "lowercase",
  },
  builderPreviewBody: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
  },
  initialStack: {
    flexDirection: "row",
  },
  initialBubble: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.canvas,
    borderRadius: radii.full,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    marginRight: -6,
    width: 36,
  },
  initialText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 13,
  },
  builderButton: {
    backgroundColor: colors.parcel,
    borderColor: colors.parcel,
    minHeight: 48,
  },
  topMatchText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  packetPreview: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  packetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  packetPercent: {
    ...typography.mono,
    color: colors.parcel,
    fontSize: 15,
    lineHeight: 20,
  },
  progressTrack: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.full,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.parcel,
    borderRadius: radii.full,
    height: "100%",
  },
  packetList: {
    gap: spacing.sm,
  },
  packetItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  packetItemReady: {
    opacity: 0.62,
  },
  packetItemText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  packetItemPending: {
    fontFamily: typography.h2.fontFamily,
  },
  studyStrip: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  studyStripHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  sectionBreak: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  sectionBreakTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
  },
  sectionBreakMeta: {
    ...typography.label,
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: 1,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
