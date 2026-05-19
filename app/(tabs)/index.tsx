import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../src/components/Button";
import { ProjectSummary } from "../../src/components/ProjectSummary";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { inferJurisdiction } from "../../src/data/regulations";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { colors, radii, shadows, spacing, typography } from "../../src/theme";

const heroImage =
  "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1400&q=80";

export default function HomeScreen() {
  const project = useActiveProject();
  const createProject = useAppStore((state) => state.createProject);
  const storageMode = useAppStore((state) => state.storageMode);
  const [address, setAddress] = useState("");

  const startProject = async () => {
    const cleanAddress = address.trim() || "1420 Baxter St, Los Angeles, CA";
    const nextProject = await createProject(cleanAddress, inferJurisdiction(cleanAddress));
    router.push("/estimate");
    setAddress("");
    return nextProject;
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ADU Advisor</Text>
          <Text style={styles.tagline}>Feasibility, design, build.</Text>
        </View>
        <View style={styles.status}>
          <Feather name={storageMode === "sqlite" ? "database" : "wifi-off"} size={16} color={colors.accent} />
          <Text style={styles.statusText}>{storageMode === "sqlite" ? "Offline ready" : "Memory mode"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" transition={200} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Know what your lot can carry before the first contractor call.</Text>
          <Text style={styles.heroText}>Model value, test a footprint, and package the project for builders.</Text>
        </View>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchLabel}>Property address</Text>
        <View style={styles.searchRow}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Property address"
            onChangeText={setAddress}
            placeholder="Enter address or city"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={address}
          />
        </View>
        <Button onPress={startProject}>Start estimate</Button>
      </View>

      {project ? <ProjectSummary project={project} onPress={() => router.push("/estimate")} /> : null}

      <SectionHeader title="Quick actions" />
      <View style={styles.actions}>
        <QuickAction icon="bar-chart-2" label="Run ROI" detail="Offline calculator" onPress={() => router.push("/estimate")} />
        <QuickAction icon="layout" label="Test fit" detail="Parcel and model" onPress={() => router.push("/ideas")} />
        <QuickAction icon="users" label="Quote packet" detail="Builder matches" onPress={() => router.push("/contractors")} />
      </View>
    </Screen>
  );
}

function QuickAction({
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
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      <View style={styles.actionIcon}>
        <Feather name={icon} size={19} color={colors.accent} />
      </View>
      <View style={styles.actionTextGroup}>
        <Text style={styles.actionText}>{label}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  brand: {
    ...typography.h1,
    color: colors.text,
  },
  tagline: {
    ...typography.body,
    color: colors.muted,
  },
  status: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.label,
    color: colors.text,
  },
  hero: {
    borderRadius: radii.md,
    minHeight: 300,
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  heroTitle: {
    ...typography.editorial,
    color: colors.card,
  },
  heroText: {
    ...typography.body,
    color: colors.card,
    opacity: 0.92,
    marginTop: spacing.sm,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
    gap: spacing.md,
    padding: spacing.md,
  },
  searchLabel: {
    ...typography.label,
    color: colors.text,
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minWidth: 0,
  },
  actions: {
    gap: spacing.sm,
  },
  action: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actionTextGroup: {
    flex: 1,
    gap: 2,
  },
  actionText: {
    ...typography.h2,
    fontSize: 15,
    lineHeight: 19,
    color: colors.text,
  },
  actionDetail: {
    ...typography.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
