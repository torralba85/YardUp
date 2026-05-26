import type { PropsWithChildren } from "react";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "../theme";

interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  accent?: "value" | "builder" | "permit";
  scroll?: boolean;
}

export function Screen({ children, title, subtitle, eyebrow, accent = "value", scroll = true }: ScreenProps) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const narrow = width < 560;
  const sideRail = Platform.OS === "web" && wide;
  const railWidth = sideRail ? 208 : 0;
  const pageMargin = narrow ? spacing.md : spacing.xl;
  const availableWidth = width - railWidth;
  const maxContentWidth = wide ? 1180 : availableWidth - pageMargin * 2;
  const contentWidth = Math.max(0, Math.min(availableWidth - pageMargin * 2, maxContentWidth));

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [pathname]);

  const content = (
    <View
      style={[
        styles.content,
        wide && styles.contentWide,
        {
          width: contentWidth,
        },
      ]}
    >
      {title ? (
        <View style={styles.heading}>
          <View
            style={[
              styles.headingRule,
              accent === "builder" && styles.headingRuleBuilder,
              accent === "permit" && styles.headingRulePermit,
            ]}
          />
          <View style={styles.headingCopy}>
            {eyebrow ? (
              <Text
                style={[
                  styles.eyebrow,
                  accent === "builder" && styles.eyebrowBuilder,
                  accent === "permit" && styles.eyebrowPermit,
                ]}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 176,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    alignSelf: "center",
  },
  contentWide: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  heading: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.md,
  },
  headingRule: {
    backgroundColor: colors.emerald,
    borderRadius: 9999,
    width: 4,
  },
  headingRuleBuilder: {
    backgroundColor: colors.parcel,
  },
  headingRulePermit: {
    backgroundColor: colors.permit,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.emerald,
  },
  eyebrowBuilder: {
    color: colors.parcel,
  },
  eyebrowPermit: {
    color: colors.permit,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 560,
  },
});
