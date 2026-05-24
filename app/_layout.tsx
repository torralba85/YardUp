import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppStore } from "../src/state/appStore";
import { colors, spacing, typography } from "../src/theme";
import { YardUpLogo } from "../src/components/YardUpLogo";
import { FeedbackButton } from "../src/components/FeedbackButton";

export default function RootLayout() {
  const initialized = useAppStore((state) => state.initialized);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wizard" />
        </Stack>
        {initialized ? <FeedbackButton /> : null}
        {!initialized ? (
          <View style={styles.loading} pointerEvents="auto">
            <YardUpLogo size={38} />
            <Text style={styles.loadingText}>Preparing income and builder data</Text>
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.label,
    color: colors.muted,
  },
});
