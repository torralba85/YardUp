import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme";

interface WizardHeaderProps {
  currentStep: number;
}

const steps = ["Lot", "Fit", "Style", "ROI", "Build"];

export function WizardHeader({ currentStep }: WizardHeaderProps) {
  const progress = Math.max(0, Math.min(1, (currentStep - 1) / (steps.length - 1)));
  const title = steps[currentStep - 1] ?? steps[0];

  const handleExit = () => {
    Alert.alert("Exit wizard", "Your progress is saved locally.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () => router.replace("/"),
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.meta}>Guided build study - {currentStep}/5</Text>
            <Text style={styles.title}>{title} feasibility</Text>
          </View>
          <Pressable
            accessibilityLabel="Exit wizard"
            accessibilityRole="button"
            onPress={handleExit}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Feather name="x" size={22} color={colors.background} />
          </Pressable>
        </View>

        <View style={styles.stepper}>
          <View style={styles.track} />
          <View style={[styles.progressTrack, { width: `${progress * 100}%` }]} />
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;

            return (
              <View key={step} style={styles.step}>
                <View style={[styles.marker, isComplete && styles.completeMarker, isActive && styles.activeMarker]}>
                  {isComplete ? (
                    <Feather name="check" size={12} color={colors.background} />
                  ) : (
                    <Text style={[styles.markerText, isActive && styles.activeMarkerText]}>{stepNumber}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, (isActive || isComplete) && styles.activeStepLabel]}>{step}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.ink,
  },
  container: {
    backgroundColor: colors.ink,
    borderBottomColor: "rgba(255,255,255,0.12)",
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  titleGroup: {
    flex: 1,
  },
  meta: {
    ...typography.label,
    color: colors.faint,
  },
  title: {
    ...typography.h1,
    color: colors.background,
    fontSize: 21,
    lineHeight: 26,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.75,
  },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    position: "relative",
  },
  track: {
    backgroundColor: "rgba(255,255,255,0.18)",
    height: 2,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: 11,
  },
  progressTrack: {
    backgroundColor: colors.clay,
    height: 2,
    left: spacing.md,
    position: "absolute",
    top: 11,
  },
  step: {
    alignItems: "center",
    minWidth: 42,
  },
  marker: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: radii.full,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  activeMarker: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  completeMarker: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  markerText: {
    ...typography.label,
    color: colors.faint,
    fontSize: 10,
    lineHeight: 12,
  },
  activeMarkerText: {
    color: colors.background,
  },
  stepLabel: {
    ...typography.label,
    color: colors.faint,
    fontSize: 9,
    lineHeight: 12,
    marginTop: spacing.xs,
  },
  activeStepLabel: {
    color: colors.background,
  },
});
