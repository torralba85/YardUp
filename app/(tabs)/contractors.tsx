import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import type { ContractorProfile } from "../../src/domain/types";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function ContractorsScreen() {
  const project = useActiveProject();
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const requestQuote = useAppStore((state) => state.requestQuote);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const projectRequests = useMemo(
    () => quoteRequests.filter((request) => request.projectId === project?.id),
    [project?.id, quoteRequests],
  );

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
      <Screen title="Build Network" subtitle="Start a project on Home to prepare a quote packet.">
        <View style={styles.emptyState}>
          <Feather name="users" size={42} color={colors.faint} />
          <Text style={styles.emptyTitle}>No active project</Text>
          <Text style={styles.emptyText}>Create a project to match ADU builders against your lot, ROI, and concept.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Builder bench" subtitle="Compare ADU-ready teams and send a packet that already carries the lot, ROI, and design story.">
      <LinearGradient colors={[colors.ink, "#26372F"]} style={styles.packetCard}>
        <View style={styles.packetHeader}>
          <View>
            <Text style={styles.packetLabel}>Quote packet</Text>
            <Text style={styles.packetTitle}>{projectRequests.length ? `${projectRequests.length} sent` : "Ready to send"}</Text>
          </View>
          <View style={styles.packetIcon}>
            <Feather name="send" size={18} color={colors.ink} />
          </View>
        </View>
        <Text style={styles.packetText}>{project.address}</Text>
        <View style={styles.packetItems}>
          {["ROI model", "Lot summary", "Design concept", "Permit notes"].map((item) => (
            <View key={item} style={styles.packetItem}>
              <Feather name="check" size={13} color={colors.accent} />
              <Text style={styles.packetItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <SectionHeader title="Best matches" action={`${contractors.length} vetted`} />
      <View style={styles.list}>
        {contractors.map((contractor) => {
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

      <SectionHeader title="Advisor review" />
      <View style={styles.advisorCard}>
        <View style={styles.advisorIcon}>
          <Feather name="clipboard" size={20} color={colors.permit} />
        </View>
        <View style={styles.advisorText}>
          <Text style={styles.cardTitle}>Scope check before outreach</Text>
          <Text style={styles.cardText}>Review builder fit, missing documents, and permit risk before you schedule site walks.</Text>
        </View>
        <Button variant="secondary" onPress={() => {}}>
          Review
        </Button>
      </View>
    </Screen>
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
      <View style={styles.cardTop}>
        <ContractorImage contractor={contractor} />
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{contractor.name}</Text>
            <Text style={styles.matchBadge}>{contractor.matchScore}%</Text>
          </View>
          <Text style={styles.specialty}>{contractor.specialty}</Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={13} color={colors.permit} />
            <Text style={styles.ratingText}>
              {contractor.rating.toFixed(1)} ({contractor.reviews} reviews)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.trustRow}>
        <TrustBadge label="License" verified={contractor.licenseStatus === "verified"} />
        <TrustBadge label="Insurance" verified={contractor.insuranceStatus === "verified"} />
        <TrustBadge label="Permits" verified={contractor.permitSupport} />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Range" value={contractor.priceRange} wide />
        <Stat label="Timeline" value={`${contractor.timelineWeeks} wk`} />
        <Stat label="ADUs" value={`${contractor.aduCount}`} />
      </View>

      <Text style={styles.reviewText}>"{contractor.reviewExcerpt}"</Text>

      <View style={styles.tagRow}>
        {contractor.tags.map((tag) => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>

      <Button variant={quoteSent ? "secondary" : "primary"} onPress={onRequest} disabled={quoteSent || sending}>
        {quoteSent ? "Quote sent" : sending ? "Sending" : "Request quote"}
      </Button>
    </View>
  );
}

function ContractorImage({ contractor }: { contractor: ContractorProfile }) {
  const [failed, setFailed] = useState(false);
  const initials = contractor.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <View style={styles.imageFrame}>
      {!failed ? (
        <Image
          source={{ uri: contractor.imageUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.initials}>{initials}</Text>
      )}
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
  packetCard: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  packetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  packetLabel: {
    ...typography.label,
    color: colors.faint,
  },
  packetTitle: {
    ...typography.h1,
    color: colors.background,
  },
  packetIcon: {
    alignItems: "center",
    backgroundColor: colors.highlighter,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  packetText: {
    ...typography.body,
    color: colors.faint,
  },
  packetItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  packetItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  packetItemText: {
    ...typography.label,
    color: colors.background,
    fontSize: 10,
  },
  list: {
    gap: spacing.md,
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
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  imageFrame: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    height: 82,
    justifyContent: "center",
    overflow: "hidden",
    width: 82,
  },
  avatar: {
    height: "100%",
    width: "100%",
  },
  initials: {
    ...typography.h2,
    color: colors.accent,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  name: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  matchBadge: {
    ...typography.label,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    color: colors.background,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  specialty: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  ratingText: {
    ...typography.mono,
    color: colors.text,
    fontSize: 12,
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
    fontSize: 10,
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
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    flex: 1,
    gap: 2,
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
    ...typography.h2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
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
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    color: colors.muted,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  advisorCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    borderLeftColor: colors.clay,
    borderLeftWidth: 3,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  advisorIcon: {
    alignItems: "center",
    backgroundColor: colors.permitSoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  advisorText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
  },
  cardText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
