import type { PropsWithChildren } from "react";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "../theme";

interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
}

export function Screen({ children, title, subtitle, scroll = true }: ScreenProps) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const narrow = width < 560;
  const pageMargin = narrow ? spacing.md : spacing.xl;
  const maxContentWidth = wide ? 1180 : width < 560 ? 326 : width - pageMargin * 2;
  const contentWidth = Math.max(0, Math.min(width - pageMargin * 2, maxContentWidth));

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [pathname]);

  const content = (
    <View
      style={[
        styles.content,
        wide && styles.contentWide,
        {
          alignSelf: narrow ? "flex-start" : "center",
          marginLeft: narrow ? pageMargin : undefined,
          width: contentWidth,
        },
      ]}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: -spacing.sm,
    maxWidth: 560,
  },
});
