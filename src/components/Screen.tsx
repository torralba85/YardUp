import type { PropsWithChildren } from "react";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [pathname]);

  const content = (
    <View style={styles.content}>
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
    maxWidth: 760,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: -spacing.sm,
  },
});
