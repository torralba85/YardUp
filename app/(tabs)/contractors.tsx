import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";

import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { getMatchedContractors, isDeliveredQuote } from "../../src/domain/marketplace";
import type { ContractorProfile, QuoteRequest } from "../../src/domain/types";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";
import { useAuthStore } from "../../src/state/authStore";
import {
  getStripeOnboardingUrl,
  checkStripeStatus,
  fetchStripeStatusFromFirestore,
} from "../../src/services/stripeService";

const PACKET_ITEMS: { label: string; key: "estimate" | "lot" | "concept" | "permit" }[] = [
  { label: "ROI model", key: "estimate" },
  { label: "Lot summary", key: "lot" },
  { label: "Design concept", key: "concept" },
  { label: "Permit notes", key: "permit" },
];

export default function ContractorsScreen() {
  const { currentUser, currentRole, builderId } = useAuthStore();
  const [stripeStatus, setStripeStatus] = useState<"idle" | "pending" | "active">("idle");
  const [loadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    if (currentUser && currentRole === "builder") {
      setLoadingStripe(true);
      fetchStripeStatusFromFirestore(currentUser.uid)
        .then((status) => setStripeStatus(status))
        .catch((err) => console.error("Error fetching stripe status:", err))
        .finally(() => setLoadingStripe(false));
    }
  }, [currentUser, currentRole]);

  const handleConnectStripe = async () => {
    if (!currentUser) return;
    setLoadingStripe(true);
    try {
      // stripeService is a pure data fetcher — it returns the URL and the
      // caller (this component) is responsible for opening it. This keeps
      // the service composable and testable, while still actually routing
      // the user into Stripe's Express Connect flow.
      const url = await getStripeOnboardingUrl(currentUser.uid);
      if (url) {
        setStripeStatus("pending");
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error("Error starting Stripe onboarding:", err);
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleCheckStripeStatus = async () => {
    if (!currentUser) return;
    setLoadingStripe(true);
    try {
      const newStatus = await checkStripeStatus(currentUser.uid);
      setStripeStatus(newStatus);
    } catch (err) {
      console.error("Error checking Stripe status:", err);
    } finally {
      setLoadingStripe(false);
    }
  };

  const project = useActiveProject();
  const contractors = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const concepts = useAppStore((state) => state.concepts);
  const parcelSummaries = useAppStore((state) => state.parcelSummaries);
  const regulationGuides = useAppStore((state) => state.regulationGuides);
  const requestQuote = useAppStore((state) => state.requestQuote);
  const deliverQuote = useAppStore((state) => state.deliverQuote);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Resolve the builder profile from the server-issued builderId on
  // userProfiles/{uid}. Replaces the previous email-substring matching,
  // which could surface the wrong dashboard whenever an email happened to
  // contain a keyword like "state" or "studio". If builderId is unset or
  // points at an unknown contractor, return undefined and let
  // BuilderDashboard render its "profile not matched" empty state — never
  // fall back to contractors[0], which would silently show one builder's
  // pipeline to another.
  const builderProfile = useMemo(() => {
    if (currentRole !== "builder" || !builderId) return undefined;
    return contractors.find((c) => c.id === builderId);
  }, [currentRole, builderId, contractors]);


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
  const deliveredRequests = projectRequests.filter(isDeliveredQuote);
  const submittedRequests = projectRequests.filter((request) => request.status === "submitted");
  const savedRequests = projectRequests.filter((request) => request.status === "saved");
  const matchedContractors = useMemo(
    () => (project ? getMatchedContractors(contractors, project.jurisdiction) : []),
    [contractors, project],
  );

  const sortedContractors = useMemo(
    () => [...matchedContractors].sort((a, b) => b.matchScore - a.matchScore),
    [matchedContractors],
  );
  const topContractor = sortedContractors[0];
  const topAlreadyQuoted = topContractor
    ? projectRequests.some((request) => request.contractorId === topContractor.id && isDeliveredQuote(request))
    : false;
  const topAwaitingDelivery = topContractor
    ? projectRequests.some((request) => request.contractorId === topContractor.id && request.status === "submitted")
    : false;

  const handleRequestQuote = async (contractorId: string) => {
    if (!project) return;
    setSendingId(contractorId);
    try {
      await requestQuote(project.id, contractorId, true);
    } finally {
      setSendingId(null);
    }
  };

  // If role is builder, render the Builder Dashboard
  if (currentRole === "builder") {
    if (contractors.length === 0) {
      return (
        <Screen title="Builder Dashboard" subtitle="Loading builder profile...">
          <View style={styles.emptyState}>
            <Feather name="loader" size={24} color={colors.muted} />
          </View>
        </Screen>
      );
    }
    return (
      <BuilderDashboard
        builder={builderProfile}
        quoteRequests={quoteRequests}
        onVerifyDelivery={deliverQuote}
        stripeStatus={stripeStatus}
        loadingStripe={loadingStripe}
        onConnectStripe={handleConnectStripe}
        onCheckStripeStatus={handleCheckStripeStatus}
      />
    );
  }

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
        topAwaitingDelivery={topAwaitingDelivery}
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
            <Text style={styles.packetTitle}>
              {!sortedContractors.length
                ? "Awaiting builder coverage"
                : deliveredRequests.length
                  ? `${deliveredRequests.length} delivered`
                  : submittedRequests.length
                    ? `${submittedRequests.length} awaiting delivery`
                    : savedRequests.length
                      ? `${savedRequests.length} saved for retry`
                      : "Ready to submit"}
            </Text>
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

      <SectionHeader title="Best matches" action={`${sortedContractors.length} declared`} />
      {sortedContractors.length ? (
        <View style={styles.list}>
          {sortedContractors.map((contractor) => {
            const quoteRequest = projectRequests.find((request) => request.contractorId === contractor.id);
            const sending = sendingId === contractor.id;

            return (
              <ContractorCard
                key={contractor.id}
                contractor={contractor}
                quoteRequest={quoteRequest}
                sending={sending}
                onRequest={() => void handleRequestQuote(contractor.id)}
              />
            );
          })}
        </View>
      ) : (
        <View style={[styles.nextMove, styles.nextMovePending]}>
          <View style={styles.nextMoveLabel}>
            <Feather name="map-pin" size={14} color={colors.permit} />
            <Text style={styles.nextMoveLabelText}>Market coverage</Text>
          </View>
          <Text style={styles.nextMoveTitle}>Local builder coverage needs verification</Text>
          <Text style={styles.nextMoveBody}>
            YardUp can model earning potential here, but no builder match is declared for this jurisdiction yet.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function NextMoveCard({
  contractor,
  topAlreadyQuoted,
  topAwaitingDelivery,
  packetReady,
  packetTotal,
  onSend,
  onCompletePacket,
  sending,
}: {
  contractor?: ContractorProfile;
  topAlreadyQuoted: boolean;
  topAwaitingDelivery: boolean;
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
          {packetReady} of {packetTotal} sections ready. Builders typically respond faster when ROI, lot, concept, and permit notes are all attached.
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

  if (topAwaitingDelivery) {
    return (
      <View style={[styles.nextMove, styles.nextMoveDone]}>
        <View style={styles.nextMoveLabel}>
          <Feather name="clock" size={14} color={colors.permit} />
          <Text style={styles.nextMoveLabelText}>Next move</Text>
        </View>
        <Text style={styles.nextMoveTitle}>Packet recorded; delivery pending</Text>
        <Text style={styles.nextMoveBody}>
          Your packet has been recorded for {contractor.name}. You'll hear back once the builder confirms receipt.
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
      <Text style={styles.nextMoveTitle}>Submit the packet for {contractor.name}</Text>
      <Text style={styles.nextMoveBody}>
        {contractor.matchScore}% match · {contractor.specialty} · {contractor.aduCount} ADUs delivered
      </Text>
      <Text style={styles.disclosure}>
        By continuing, you consent to submit this packet for builder outreach. No homeowner fee is charged here; a builder fee applies only after verified delivery.
      </Text>
      {onSend ? (
        <Button icon="send" onPress={onSend} disabled={sending}>
          {sending ? "Submitting" : "Consent and submit packet"}
        </Button>
      ) : null}
    </View>
  );
}

function ContractorCard({
  contractor,
  quoteRequest,
  sending,
  onRequest,
}: {
  contractor: ContractorProfile;
  quoteRequest?: QuoteRequest;
  sending: boolean;
  onRequest: () => void;
}) {
  const delivered = quoteRequest ? isDeliveredQuote(quoteRequest) : false;
  const submitted = quoteRequest?.status === "submitted";
  const saved = quoteRequest?.status === "saved";

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

      <Text style={styles.disclosure}>
        By consenting, your packet is shared with this builder for an introduction. No charge to you.
      </Text>
      <Button
        variant={delivered || submitted ? "secondary" : "primary"}
        style={!delivered && !submitted ? styles.builderCta : undefined}
        onPress={onRequest}
        disabled={delivered || submitted || sending}
      >
        {delivered ? "Packet delivered" : submitted ? "Delivery pending" : sending ? "Submitting" : saved ? "Retry submission" : "Consent and submit packet"}
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

interface BuilderDashboardProps {
  builder: ContractorProfile | undefined;
  quoteRequests: QuoteRequest[];
  onVerifyDelivery: (projectId: string, contractorId: string) => Promise<QuoteRequest>;
  stripeStatus: "idle" | "pending" | "active";
  loadingStripe: boolean;
  onConnectStripe: () => void;
  onCheckStripeStatus: () => void;
}

function BuilderDashboard({
  builder,
  quoteRequests,
  onVerifyDelivery,
  stripeStatus,
  loadingStripe,
  onConnectStripe,
  onCheckStripeStatus,
}: BuilderDashboardProps) {
  const projects = useAppStore((state) => state.projects);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Filter requests that target this builder
  const builderRequests = useMemo(() => {
    if (!builder) return [];
    return quoteRequests.filter((q) => q.contractorId === builder.id);
  }, [builder, quoteRequests]);

  // Calculate statistics
  const totalSent = useMemo(() => {
    return builderRequests.filter((q) => q.status === "sent").length;
  }, [builderRequests]);

  const totalPending = useMemo(() => {
    return builderRequests.filter((q) => q.status === "submitted").length;
  }, [builderRequests]);

  const totalFees = useMemo(() => {
    return builderRequests
      .filter((q) => q.status === "sent" && q.commercialStatus === "eligible_for_builder_fee")
      .reduce((sum, q) => sum + (q.introductionFee || 0), 0);
  }, [builderRequests]);

  // Map billing tier details
  const tierName = builder?.billingTier || "starter";
  const tierDisplay = tierName.charAt(0).toUpperCase() + tierName.slice(1);
  
  let tierFeeText = "$49 per sent packet";
  if (tierName === "growth") tierFeeText = "$99 per sent packet";
  if (tierName === "premium") tierFeeText = "$149 per sent packet";

  const handleVerify = async (projectId: string, contractorId: string) => {
    setVerifyingId(projectId + "-" + contractorId);
    try {
      await onVerifyDelivery(projectId, contractorId);
    } catch (err) {
      console.error("Failed to verify delivery:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  if (!builder) {
    return (
      <Screen title="Builder Dashboard" subtitle="No matching builder profile found.">
        <View style={styles.emptyState}>
          <Feather name="alert-triangle" size={42} color={colors.warning} />
          <Text style={styles.emptyTitle}>Profile not matched</Text>
          <Text style={styles.emptyText}>
            We could not find an active builder profile for this account. Contact support at support@aduadvisor.app.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Builder Dashboard" subtitle="Manage incoming project packets, check billing tier, and track introduction fees.">
      <View style={styles.builderProfileHeader}>
        <View style={styles.avatarContainer}>
          <Feather name="briefcase" size={24} color={colors.accentDark} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.builderDashboardName}>{builder.name}</Text>
          <Text style={styles.builderSpecialtyText}>{builder.specialty} · {builder.serviceArea}</Text>
          <View style={styles.licenseRow}>
            <Feather name="shield" size={13} color={colors.emerald} />
            <Text style={styles.licenseText}>License: {builder.licenseStatus === "verified" ? "Verified" : "Pending"}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.stripeCard, stripeStatus === "active" ? styles.stripeCardActive : stripeStatus === "pending" ? styles.stripeCardPending : stripeStatus === "idle" ? styles.stripeCardIdle : undefined]}>
        <View style={styles.stripeHeader}>
          <View style={[styles.stripeIconContainer, stripeStatus === "active" ? styles.stripeIconActive : stripeStatus === "pending" ? styles.stripeIconPending : stripeStatus === "idle" ? styles.stripeIconIdle : undefined]}>
            <Feather
              name={stripeStatus === "active" ? "check-circle" : stripeStatus === "pending" ? "clock" : "credit-card"}
              size={24}
              color={stripeStatus === "active" ? colors.emerald : stripeStatus === "pending" ? colors.permit : colors.muted}
            />
          </View>
          <View style={styles.stripeTitleContainer}>
            <Text style={styles.stripeLabel}>Stripe Connect</Text>
            <Text style={styles.stripeStatusText}>
              {stripeStatus === "active"
                ? "Connected"
                : stripeStatus === "pending"
                  ? "Onboarding pending"
                  : "Not Connected"}
            </Text>
          </View>
        </View>

        <Text style={styles.stripeDescription}>
          {stripeStatus === "active"
            ? "Your Stripe Connect express account is active. Payouts will be routed automatically."
            : stripeStatus === "pending"
              ? "We've generated your express onboarding link, but your account is not yet active. Please finish the Stripe form."
              : "Connect your Stripe account to enable direct payout routing and receive authenticated homeowner leads."}
        </Text>

        {loadingStripe ? (
          <ActivityIndicator size="small" color={colors.emerald} style={{ marginVertical: spacing.sm }} />
        ) : (
          <View style={styles.stripeActions}>
            {stripeStatus === "idle" && (
              <Button icon="credit-card" onPress={onConnectStripe}>
                Connect Stripe Account
              </Button>
            )}
            {stripeStatus === "pending" && (
              <View style={styles.actionRow}>
                <Button icon="refresh-cw" onPress={onCheckStripeStatus} style={{ flex: 1 }}>
                  Verify Connection
                </Button>
                <Button variant="secondary" icon="external-link" onPress={onConnectStripe} style={{ flex: 1 }}>
                  Resume Onboarding
                </Button>
              </View>
            )}
            {stripeStatus === "active" && (
              <View style={styles.connectedBadge}>
                <Feather name="check" size={16} color={colors.emerald} style={{ marginRight: 6 }} />
                <Text style={styles.connectedBadgeText}>Account Ready for Payouts</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.tierBanner}>
        <View style={styles.tierBannerLeft}>
          <Text style={styles.tierLabel}>CURRENT BILLING TIER</Text>
          <Text style={styles.tierTitle}>{tierDisplay} Tier</Text>
          <Text style={styles.tierSubtext}>{tierFeeText}</Text>
        </View>
        <View style={styles.tierBadge}>
          <Feather name="award" size={20} color={colors.canvas} />
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderLeftColor: colors.emerald, borderLeftWidth: 4 }]}>
          <Text style={styles.metricLabel}>Total Fees</Text>
          <Text style={styles.metricValueLarge}>${totalFees}</Text>
          <Text style={styles.metricSubtext}>Pending payment</Text>
        </View>
        
        <View style={[styles.metricCard, { borderLeftColor: colors.parcel, borderLeftWidth: 4 }]}>
          <Text style={styles.metricLabel}>Sent Packets</Text>
          <Text style={styles.metricValueLarge}>{totalSent}</Text>
          <Text style={styles.metricSubtext}>Verified deliveries</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: colors.permit, borderLeftWidth: 4 }]}>
          <Text style={styles.metricLabel}>Pending Packets</Text>
          <Text style={styles.metricValueLarge}>{totalPending}</Text>
          <Text style={styles.metricSubtext}>Awaiting delivery confirmation</Text>
        </View>
      </View>

      <SectionHeader title="Project Packets" action={builderRequests.length + " total"} />
      {builderRequests.length > 0 ? (
        <View style={styles.list}>
          {builderRequests.map((request) => {
            const project = projects.find((p) => p.id === request.projectId);
            const isSent = request.status === "sent";
            const isPending = request.status === "submitted";
            const formattedDate = new Date(request.createdAt).toLocaleDateString();
            const formattedDeliveredDate = request.deliveredAt ? new Date(request.deliveredAt).toLocaleDateString() : undefined;
            const verifying = verifyingId === (request.projectId + "-" + request.contractorId);

            return (
              <View key={request.id} style={styles.packetListItem}>
                <View style={styles.packetItemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packetAddress} numberOfLines={1}>{project?.address || "Address details hidden"}</Text>
                    <Text style={styles.packetDateText}>Received: {formattedDate}</Text>
                    {formattedDeliveredDate && (
                      <Text style={styles.packetDateText}>Delivered: {formattedDeliveredDate}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, isSent ? styles.statusBadgeSent : styles.statusBadgePending]}>
                    <Text style={[styles.statusBadgeText, isSent ? styles.statusBadgeTextSent : styles.statusBadgeTextPending]}>
                      {isSent ? "Delivered" : "Pending Delivery"}
                    </Text>
                  </View>
                </View>

                <View style={styles.packetDetailsDivider} />

                <View style={styles.packetMetaInfoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packetDetailsLabel}>PACKET CONTENTS</Text>
                    <Text style={styles.packetContentsText}>{request.packetItems.join(" · ")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.packetDetailsLabel}>INTRO FEE</Text>
                    <Text style={styles.packetFeeValue}>
                      {request.introductionFee ? "$" + request.introductionFee : "-"}
                    </Text>
                  </View>
                </View>

                {isPending && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.verifyButton,
                      pressed && styles.verifyButtonPressed,
                    ]}
                    onPress={() => handleVerify(request.projectId, request.contractorId)}
                    disabled={verifying}
                  >
                    <Feather name="check" size={14} color={colors.canvas} style={{ marginRight: 6 }} />
                    <Text style={styles.verifyButtonText}>
                      {verifying ? "Verifying..." : "Verify Delivery"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyDashboardState}>
          <Feather name="file-text" size={32} color={colors.faint} />
          <Text style={styles.emptyTitle}>No packets yet</Text>
          <Text style={styles.emptyText}>When homeowners choose you for quote requests, the packets will appear here.</Text>
        </View>
      )}
    </Screen>
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
  disclosure: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
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
  builderDashboard: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dashboardTitle: {
    ...typography.h1,
    color: colors.text,
  },
  dashboardText: {
    ...typography.body,
    color: colors.muted,
  },
  stripeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.crisp,
    marginBottom: spacing.md,
  },
  stripeCardIdle: {
    borderColor: colors.border,
  },
  stripeCardPending: {
    borderColor: colors.permit,
    backgroundColor: colors.permitSoft,
  },
  stripeCardActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.accentSoft,
  },
  stripeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stripeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stripeIconIdle: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  stripeIconPending: {
    borderColor: colors.permit,
    backgroundColor: colors.canvas,
  },
  stripeIconActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.canvas,
  },
  stripeTitleContainer: {
    flex: 1,
  },
  stripeLabel: {
    ...typography.label,
    color: colors.muted,
  },
  stripeStatusText: {
    ...typography.h2,
    color: colors.text,
  },
  stripeDescription: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  stripeActions: {
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    borderColor: colors.emerald,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  connectedBadgeText: {
    ...typography.label,
    color: colors.emerald,
  },
  builderProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  builderDashboardName: {
    ...typography.h1,
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
  },
  builderSpecialtyText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
  },
  tierBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.accentDark,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.medium,
    marginBottom: spacing.md,
  },
  tierBannerLeft: {
    gap: 2,
  },
  tierLabel: {
    ...typography.label,
    color: colors.highlighter,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tierTitle: {
    ...typography.display,
    color: colors.canvas,
    fontSize: 24,
    lineHeight: 30,
  },
  tierSubtext: {
    ...typography.body,
    color: colors.accentSoft,
    fontSize: 13,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
    ...shadows.soft,
  },
  metricLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  metricValueLarge: {
    ...typography.monoLarge,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  metricSubtext: {
    ...typography.body,
    color: colors.faint,
    fontSize: 10,
  },
  packetListItem: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  packetItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  packetAddress: {
    ...typography.h2,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  packetDateText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  statusBadgeSent: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  statusBadgePending: {
    backgroundColor: colors.permitSoft,
    borderColor: colors.permit,
  },
  statusBadgeText: {
    ...typography.label,
    fontSize: 10,
  },
  statusBadgeTextSent: {
    color: colors.emerald,
  },
  statusBadgeTextPending: {
    color: colors.permit,
  },
  packetDetailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  packetMetaInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  packetDetailsLabel: {
    ...typography.label,
    color: colors.faint,
    fontSize: 9,
  },
  packetContentsText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
  },
  packetFeeValue: {
    ...typography.mono,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  verifyButton: {
    flexDirection: "row",
    backgroundColor: colors.parcel,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  verifyButtonPressed: {
    backgroundColor: "#0a4b96",
  },
  verifyButtonText: {
    ...typography.label,
    color: colors.canvas,
    fontSize: 12,
  },
  emptyDashboardState: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
});
