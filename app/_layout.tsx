import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppStore } from "../src/state/appStore";
import { colors, spacing, typography } from "../src/theme";

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
        {initialized ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingTitle}>ADU Advisor</Text>
            <Text style={styles.loadingText}>Preparing offline project data</Text>
          </View>
        )}
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
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingTitle: {
    ...typography.title,
    color: colors.accent,
  },
  loadingText: {
    ...typography.label,
    color: colors.muted,
  },
});
