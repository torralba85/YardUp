import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { InspirationItem } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { Button } from "./Button";

interface IdeaCardProps {
  item: InspirationItem;
  saved?: boolean;
  variant?: "feature" | "tile";
  imageShape?: "wide" | "tall";
  onSave: () => void;
  onAdapt: () => void;
}

export function IdeaCard({
  item,
  saved = false,
  variant = "feature",
  imageShape = "wide",
  onSave,
  onAdapt,
}: IdeaCardProps) {
  const tile = variant === "tile";

  return (
    <View style={[styles.card, tile && styles.tileCard]}>
      <Image
        source={{ uri: item.imageUrl }}
        style={[styles.image, tile && styles.tileImage, tile && imageShape === "tall" && styles.tallImage]}
        contentFit="cover"
        transition={300}
        accessibilityLabel={`${item.title} ADU reference image`}
      />
      <View style={[styles.body, tile && styles.tileBody]}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={[styles.title, tile && styles.tileTitle]}>{item.title}</Text>
            <Text style={[styles.meta, tile && styles.tileMeta]}>
              {item.sqft} sqft - {item.style}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? "Idea saved" : "Save idea"}
            onPress={onSave}
            style={[styles.saveButton, saved && styles.saveButtonSaved]}
          >
            <Feather name="bookmark" size={19} color={saved ? colors.background : colors.accent} />
          </Pressable>
        </View>
        {tile ? null : <Text style={styles.summary}>{item.summary}</Text>}
        <View style={styles.tags}>
          {item.tags.slice(0, tile ? 2 : 3).map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
        <Button icon="edit-3" variant={tile ? "ghost" : "secondary"} onPress={onAdapt}>
          {tile ? "Adapt" : "Adapt to my lot"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.medium,
  },
  tileCard: {
    flexBasis: "47.5%",
    flexGrow: 1,
    minWidth: 154,
  },
  image: {
    aspectRatio: 1.25,
    backgroundColor: colors.surfaceStrong,
    width: "100%",
  },
  tileImage: {
    aspectRatio: 0.94,
  },
  tallImage: {
    aspectRatio: 0.78,
  },
  body: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  tileBody: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  titleText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  tileTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  meta: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  tileMeta: {
    fontSize: 10,
    lineHeight: 14,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  saveButtonSaved: {
    backgroundColor: colors.ink,
    borderColor: colors.highlighter,
  },
  summary: {
    ...typography.body,
    color: colors.muted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    ...typography.label,
    fontSize: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: 1,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
