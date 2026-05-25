import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import type { ContractorProfile } from "../../src/domain/types";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const PACKET_ITEMS: { label: string; key: "estimate" | "lot" | "concept" | "permit" }[] = [
  { label: "ROI model", key: "estimate" },
  { label: "Lot summary", key: "lot" },
  { label: "Design concept", key: "concept" },
  { label: "Permit notes", key: "permit" },
];

export default function ContractorsScreen() {
  const project = useActiveProject();
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const concepts = useAppStore((state) => state.concepts);
  const parcelSummaries = useAppStore((state) => state.parcelSummaries);
  const regulationGuides = useAppStore((state) => state.regulationGuides);
  const requestQuote = useAppStore((state) => state.requestQuote);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const projectRequests = useMemo(
    () => quoteRequests.filter((request) => request.projectId === project?.id),
    [project?.id, quoteRequests],
  );
  const projectConcepts = useMemo(
    () => concepts.filter((concept) => concept.projectId === project?.id),
    [concepts, project?.id],
  );
  const parcel = project ? parcelSummaries.find((p) => p.jurisdiction === project.jurisdiction) : undefined;
  const guide = project ? regulationGuides[project.jurisdiction] : undefined;

  const packetStatus = {
    estimate: Boolean(project?.lastEstimate),
    lot: Boolean(parcel),
    concept: projectConcepts.length > 0,
    permit: Boolean(guide),
  };
  const packetReady = Object.values(packetStatus).filter(Boolean).length;

  const sortedContractors = useMemo(
    () => [...contractors].sort((a, b) => b.matchScore - a.matchScore),
    [contractors],
  );
  const topContractor = sortedContractors[0];
  const topAlreadyQuoted = topContractor ? projectRequests.some((r) => r.contractorId === topContractor.id) : false;

  const handleRequestQuote = async (contractorId: string) => {
    if (!project) return;
    setSendingId(contractorId);
    try {
      await requestQuote(project.id, contractorId);
    } finally {
      setSendingId(null);
    }
  };

  if (!project) {
    return (
      <Screen title="Build" subtitle="Start a project on Home to prepare a quote packet.">
        <View style={styles.emptyState}>
          <Feather name="users" size={42} color={colors.faint} />
          <Text style={styles.emptyTitle}>No active project</Text>
          <Text style={styles.emptyText}>Create a project to match ADU builders against your lot, ROI, and concept.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Builder Matches" subtitle="Qualified builders, match score, start window, and quote-packet readiness.">
      <NextMoveCard
        contractor={topContractor}
        topAlreadyQuoted={topAlreadyQuoted}
        packetReady={packetReady}
        packetTotal={PACKET_ITEMS.length}
        onSend={topContractor ? () => void handleRequestQuote(topContractor.id) : undefined}
        onCompletePacket={packetReady < PACKET_ITEMS.length ? () => router.push(packetStatus.estimate ? (packetStatus.permit ? "/ideas" : "/guide") : "/estimate") : undefined}
        sending={topContractor ? sendingId === topContractor.id : false}
      />

      <LinearGradient colors={[colors.canvas, colors.parcelSoft]} style={styles.packetCard}>
        <View style={styles.packetHeader}>
          <View>
            <Text style={styles.packetLabel}>Quote packet</Text>
            <Text style={styles.packetTitle}>{projectRequests.length ? `${projectRequests.length} sent` : "Ready to send"}</Text>
          </View>
          <View style={styles.packetIcon}>
            <Feather name="send" size={18} color={colors.canvas} />
          </View>
        </View>
        <Text style={styles.packetText}>{project.address}</Text>
        <View style={styles.packetItems}>
          {PACKET_ITEMS.map((item) => {
            const ready = packetStatus[item.key];
            return (
              <View key={item.label} style={[styles.packetItem, ready && styles.packetItemReady]}>
                <Feather name={ready ? "check" : "circle"} size={13} color={ready ? colors.accent : colors.muted} />
                <Text style={[styles.packetItemText, !ready && styles.packetItemTextPending]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>

      <SectionHeader title="Best matches" action={`${sortedContractors.length} vetted`} />
      <View style={styles.list}>
        {sortedContractors.map((contractor) => {
          const quoteSent = projectRequests.some((request) => request.contractorId === contractor.id);
          const sending = sendingId === contractor.id;

          return (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              quoteSent={quoteSent}
              sending={sending}
              onRequest={() => void handleRequestQuote(contractor.id)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

function NextMoveCard({
  contractor,
  topAlreadyQuoted,
  packetReady,
  packetTotal,
  onSend,
  onCompletePacket,
  sending,
}: {
  contractor?: ContractorProfile;
  topAlreadyQuoted: boolean;
  packetReady: number;
  packetTotal: number;
  onSend?: () => void;
  onCompletePacket?: () => void;
  sending: boolean;
}) {
  const packetComplete = packetReady >= packetTotal;

  if (!contractor) {
    return null;
  }

  if (!packetComplete) {
    return (
      <View style={[styles.nextMove, styles.nextMovePending]}>
        <View style={styles.nextMoveLabel}>
          <Feather name="file-text" size={14} color={colors.permit} />
          <Text style={styles.nextMoveLabelText}>Next move</Text>
        </View>
        <Text style={styles.nextMoveTitle}>Finish the quote packet first</Text>
        <Text style={styles.nextMoveBody}>
          {packetReady} of {packetTotal} sections ready. Builders respond faster when ROI, lot, concept, and permit notes are all attached.
        </Text>
        {onCompletePacket ? (
          <Button icon="arrow-right" onPress={onCompletePacket}>
            Complete packet
          </Button>
        ) : null}
      </View>
    );
  }

  if (topAlreadyQuoted) {
    return (
      <View style={[styles.nextMove, styles.nextMoveDone]}>
        <View style={styles.nextMoveLabel}>
          <Feather name="check-circle" size={14} color={colors.accent} />
          <Text style={[styles.nextMoveLabelText, { color: colors.accent }]}>Next move</Text>
        </View>
        <Text style={styles.nextMoveTitle}>Packet sent to your top match</Text>
        <Text style={styles.nextMoveBody}>
          {contractor.name} typically responds in {contractor.timelineWeeks} weeks. Send to a second match while you wait.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.nextMove, styles.nextMoveReady]}>
      <View style={styles.nextMoveLabel}>
        <Feather name="send" size={14} color={colors.accentDark} />
        <Text style={[styles.nextMoveLabelText, { color: colors.accentDark }]}>Next move</Text>
      </View>
      <Text style={styles.nextMoveTitle}>Send the packet to {contractor.name}</Text>
      <Text style={styles.nextMoveBody}>
        {contractor.matchScore}% match · {contractor.specialty} · {contractor.aduCount} ADUs delivered
      </Text>
      {onSend ? (
        <Button icon="send" onPress={onSend} disabled={sending}>
          {sending ? "Sending" : "Send packet"}
        </Button>
      ) : null}
    </View>
  );
}

function ContractorCard({
  contractor,
  quoteSent,
  sending,
  onRequest,
}: {
  contractor: ContractorProfile;
  quoteSent: boolean;
  sending: boolean;
  onRequest: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.builderHeader}>
        <View style={styles.builderNameBlock}>
          <Text style={styles.name}>{contractor.name}</Text>
          <View style={styles.licenseRow}>
            <Feather name="check-circle" size={15} color={colors.accentDark} />
            <Text style={styles.licenseText}>
              {contractor.licenseStatus === "verified" && contractor.insuranceStatus === "verified" ? "Licensed & insured" : "Credentials pending"}
            </Text>
          </View>
        </View>
        <View style={styles.matchScoreBlock}>
          <Text style={styles.matchScoreLarge}>{contractor.matchScore}%</Text>
          <Text style={styles.matchScoreLabel}>Match score</Text>
        </View>
      </View>

      <View style={styles.builderDivider} />

      <View style={styles.statsRow}>
        <Stat label="Estimated start" value={`${contractor.timelineWeeks} weeks`} />
        <Stat label="Specialty" value={contractor.specialty} />
      </View>

      <View style={styles.builderMetaRow}>
        <Feather name="map-pin" size={14} color={colors.muted} />
        <Text style={styles.builderMetaText}>
          {contractor.aduCount} ADUs delivered in {contractor.serviceArea}
        </Text>
      </View>

      <View style={styles.trustRow}>
        <TrustBadge label={contractor.priceRange} verified />
        <TrustBadge label={`${contractor.rating.toFixed(1)} rating`} verified />
        <TrustBadge label={contractor.permitSupport ? "Permit support" : "Permit review"} verified={contractor.permitSupport} />
      </View>

      <Button
        variant={quoteSent ? "secondary" : "primary"}
        style={!quoteSent ? styles.builderCta : undefined}
        onPress={onRequest}
        disabled={quoteSent || sending}
      >
        {quoteSent ? "Quote sent" : sending ? "Sending" : "Request quote"}
      </Button>
    </View>
  );
}

function TrustBadge({ label, verified }: { label: string; verified: boolean }) {
  return (
    <View style={[styles.trustBadge, verified && styles.trustBadgeVerified]}>
      <Feather name={verified ? "check-circle" : "clock"} size={13} color={verified ? colors.accent : colors.muted} />
      <Text style={[styles.trustText, verified && styles.trustTextVerified]}>{label}</Text>
    </View>
  );
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.stat, wide && styles.statWide]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
        {value}
      </Text>
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
  nextMove: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.crisp,
  },
  nextMoveReady: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  nextMovePending: {
    backgroundColor: colors.permitSoft,
    borderColor: colors.permit,
  },
  nextMoveDone: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
  },
  nextMoveLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  nextMoveLabelText: {
    ...typography.label,
    color: colors.permit,
  },
  nextMoveTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
  },
  nextMoveBody: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  packetCard: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  packetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  packetLabel: {
    ...typography.label,
    color: colors.muted,
  },
  packetTitle: {
    ...typography.h1,
    color: colors.text,
  },
  packetIcon: {
    alignItems: "center",
    backgroundColor: colors.parcel,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  packetText: {
    ...typography.body,
    color: colors.muted,
  },
  packetItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  packetItem: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  packetItemReady: {
    backgroundColor: colors.mint,
    borderColor: colors.successSoft,
  },
  packetItemText: {
    ...typography.label,
    color: colors.text,
    fontSize: 11,
  },
  packetItemTextPending: {
    color: colors.muted,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  builderHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  builderNameBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.h1,
    color: colors.text,
    flex: 1,
    fontSize: 22,
    lineHeight: 27,
  },
  licenseRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  licenseText: {
    ...typography.label,
    color: colors.accentDark,
    fontSize: 13,
  },
  matchScoreBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  matchScoreLarge: {
    ...typography.display,
    color: colors.accentDark,
    fontSize: 35,
    lineHeight: 38,
  },
  matchScoreLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 10,
    textAlign: "right",
    textTransform: "uppercase",
  },
  builderDivider: {
    backgroundColor: colors.border,
    height: 1,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  trustBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trustBadgeVerified: {
    backgroundColor: colors.accentSoft,
  },
  trustText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 12,
  },
  trustTextVerified: {
    color: colors.accentDark,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    flex: 1,
    gap: 2,
    minWidth: 132,
    padding: spacing.sm,
  },
  statWide: {
    flexBasis: "100%",
  },
  statLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  statValue: {
    ...typography.mono,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  builderMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  builderMetaText: {
    ...typography.body,
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  builderCta: {
    backgroundColor: colors.parcel,
    borderColor: colors.parcel,
  },
  reviewText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    ...typography.label,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
