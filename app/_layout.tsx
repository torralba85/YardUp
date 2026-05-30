import "react-native-gesture-handler";

import {
  Fraunces_600SemiBold,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  InterTight_400Regular,
  InterTight_700Bold,
  InterTight_800ExtraBold,
  useFonts as useInterTight,
} from "@expo-google-fonts/inter-tight";
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  useFonts as useIBMPlex,
} from "@expo-google-fonts/ibm-plex-mono";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthModal } from "../src/components/AuthModal";
import { FeedbackButton } from "../src/components/FeedbackButton";
import { LotFoundryLogo } from "../src/components/LotFoundryLogo";
import { useAppStore } from "../src/state/appStore";
import { useAuthStore } from "../src/state/authStore";
import { colors, spacing, typography } from "../src/theme";

export default function RootLayout() {
  const initialized = useAppStore((state) => state.initialized);
  const initialize = useAppStore((state) => state.initialize);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const [interTightLoaded, interTightError] = useInterTight({
    InterTight_400Regular,
    InterTight_700Bold,
    InterTight_800ExtraBold,
  });
  const [fraunesLoaded, fraunesError] = useFraunces({ Fraunces_600SemiBold });
  const [plexLoaded, plexError] = useIBMPlex({ IBMPlexMono_500Medium, IBMPlexMono_600SemiBold });

  // Fonts are ready when loaded — or we move on if a load failed so the app
  // never gets stuck on the splash. Native falls back to platform sans/serif.
  const fontsReady =
    (interTightLoaded || Boolean(interTightError)) &&
    (fraunesLoaded || Boolean(fraunesError)) &&
    (plexLoaded || Boolean(plexError));
  const ready = initialized && fontsReady;

  useEffect(() => {
    void initialize();
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initialize, initializeAuth]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wizard" />
        </Stack>
        {ready ? <FeedbackButton /> : null}
        {ready ? <AuthModal /> : null}
        {!ready ? (
          <View style={styles.loading} pointerEvents="auto">
            <LotFoundryLogo size={38} />
            <Text style={styles.loadingText}>
              {fontsReady ? "Preparing income and builder data" : "Loading typography"}
            </Text>
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
