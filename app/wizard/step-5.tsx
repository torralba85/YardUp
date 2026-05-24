import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../src/components/Button";
import { WizardHeader } from "../../src/components/WizardHeader";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

export default function WizardStepFive() {
  const project = useActiveProject();
  const contractorProfiles = useAppStore((state) => state.contractorProfiles);
  const quoteRequests = useAppStore((state) => state.quoteRequests);
  const requestQuote = useAppStore((state) => state.requestQuote);

  const handleRequestQuote = async (contractorId: string, name: string) => {
    if (!project) return;
    await requestQuote(project.id, contractorId);
    Alert.alert("Quote request sent", `Your packet was sent to ${name}.`);
  };

  if (!project) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={5} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.subhead}>Send the project packet</Text>
          <Text style={styles.body}>
            Package the lot summary, fit sketch, design concept, and ROI model for matched builders.
          </Text>
        </View>

        <View style={styles.packetCard}>
          <View style={styles.packetIcon}>
            <Feather name="file-text" size={22} color={colors.accent} />
          </View>
          <View style={styles.packetText}>
            <Text style={styles.cardTitle}>ADU feasibility packet</Text>
            <Text style={styles.bodySmall}>Lot facts, selected model, style direction, ROI model, and builder notes.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Builder matches</Text>
        {contractorProfiles.map((builder) => {
          const isSent = quoteRequests.some(
            (request) => request.projectId === project.id && request.contractorId === builder.id,
          );

          return (
            <View key={builder.id} style={styles.card}>
              <View style={styles.builderHeader}>
                <View style={styles.builderText}>
                  <Text style={styles.builderName}>{builder.name}</Text>
                  <Text style={styles.bodySmall}>{builder.specialty}</Text>
                </View>
                <View style={styles.rating}>
                  <Feather name="star" size={14} color={colors.permit} />
                  <Text style={styles.ratingText}>
                    {builder.rating} ({builder.reviews})
                  </Text>
                </View>
              </View>

              <Text style={styles.excerpt}>{builder.reviewExcerpt}</Text>

              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.metaLabel}>Timeline</Text>
                  <Text style={styles.metaValue}>{builder.timelineWeeks} weeks</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Budget</Text>
                  <Text style={styles.metaValue}>{builder.priceRange}</Text>
                </View>
              </View>

              <Button disabled={isSent} onPress={() => handleRequestQuote(builder.id, builder.name)} variant={isSent ? "secondary" : "primary"}>
                {isSent ? "Request sent" : "Send packet"}
              </Button>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button variant="secondary" onPress={() => router.back()}>
          Back
        </Button>
        <Button onPress={() => router.replace("/")}>Finish</Button>
      </View>
    </View>
  );
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
  packetCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  packetIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  packetText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  builderHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  builderText: {
    flex: 1,
  },
  builderName: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  rating: {
    alignItems: "center",
    backgroundColor: colors.permitSoft,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ratingText: {
    ...typography.label,
    color: colors.text,
    fontSize: 10,
    lineHeight: 14,
  },
  excerpt: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  metaLabel: {
    ...typography.label,
    color: colors.muted,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
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
