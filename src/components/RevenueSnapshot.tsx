import { useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { formatCurrency } from "../domain/estimator";
import type { EstimateInput, EstimateResult } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";

interface RevenueSnapshotProps {
  builderMatches: number;
  estimate: EstimateResult;
  estimateInput: EstimateInput;
  assumptionsLabel?: string;
  quotePacketReady: number;
  sentQuotes: number;
  wide: boolean;
  onAdjust?: () => void;
}

const EASE_OUT = Easing.out(Easing.cubic);

export function RevenueSnapshot({
  estimate,
  estimateInput,
  assumptionsLabel = "Starter supported-market estimate",
  wide,
  onAdjust,
}: RevenueSnapshotProps) {
  const rentLow = estimateInput.monthlyRent * 0.9;
  const rentHigh = estimateInput.monthlyRent * 1.1;

  const panelOpacity = useSharedValue(0);
  const panelTranslate = useSharedValue(10);
  const washOpacity = useSharedValue(0);
  const valueOpacity = useSharedValue(0);
  const valueTranslate = useSharedValue(8);
  const railScale = useSharedValue(0);
  const incomeOpacity = useSharedValue(0);

  // Entrance sequence on mount
  useEffect(() => {
    panelOpacity.value = withTiming(1, { duration: 350, easing: EASE_OUT });
    panelTranslate.value = withTiming(0, { duration: 350, easing: EASE_OUT });
    washOpacity.value = withDelay(80, withTiming(0.22, { duration: 400, easing: EASE_OUT }));
    valueOpacity.value = withDelay(140, withTiming(1, { duration: 320, easing: EASE_OUT }));
    valueTranslate.value = withDelay(140, withTiming(0, { duration: 320, easing: EASE_OUT }));
    railScale.value = withDelay(280, withSpring(1, { damping: 14, stiffness: 180 }));
    incomeOpacity.value = withDelay(340, withTiming(1, { duration: 300, easing: EASE_OUT }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-flash value section when the estimate changes
  const prevRentRef = useRef(rentLow);
  useEffect(() => {
    if (prevRentRef.current === rentLow) return;
    prevRentRef.current = rentLow;
    valueOpacity.value = withSequence(
      withTiming(0.25, { duration: 90 }),
      withTiming(1, { duration: 300, easing: EASE_OUT }),
    );
    valueTranslate.value = withSequence(
      withTiming(6, { duration: 90 }),
      withTiming(0, { duration: 300, easing: EASE_OUT }),
    );
    incomeOpacity.value = withSequence(
      withTiming(0.25, { duration: 90 }),
      withTiming(1, { duration: 300, easing: EASE_OUT }),
    );
  }, [rentLow, valueOpacity, valueTranslate, incomeOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslate.value }],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: washOpacity.value,
  }));

  const valueContainerStyle = useAnimatedStyle(() => ({
    opacity: valueOpacity.value,
    transform: [{ translateY: valueTranslate.value }],
  }));

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: railScale.value }],
  }));

  const incomeStyle = useAnimatedStyle(() => ({
    opacity: incomeOpacity.value,
  }));

  return (
    <Animated.View style={[styles.revenuePanel, wide && styles.revenuePanelWide, panelStyle]}>
      <Animated.View pointerEvents="none" style={[styles.mintWash, washStyle]} />
      <Text style={styles.revenueEyebrow}>Estimated monthly rent</Text>
      <Animated.View style={valueContainerStyle}>
        <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {formatCurrency(rentLow)}
          <Text style={styles.revenueDash}> - </Text>
          {formatCurrency(rentHigh)}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.incomeRow, incomeStyle]}>
        <Animated.View style={[styles.incomeRail, railStyle]} />
        <View style={styles.incomeCopy}>
          <Text style={styles.incomeLabel}>Net annual income</Text>
          <Text style={styles.incomeValue}>
            +{formatCurrency(estimate.annualNOI)}
            <Text style={styles.incomeUnit}> avg/yr</Text>
          </Text>
        </View>
      </Animated.View>

      <View style={styles.assumptionsRow}>
        <View style={styles.assumptionsCopy}>
          <Feather name="check-circle" size={16} color={colors.accent} />
          <Text style={styles.assumptionsText} numberOfLines={1}>
            {assumptionsLabel}
          </Text>
        </View>
        {onAdjust ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View proforma"
            onPress={onAdjust}
            style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}
          >
            <Text style={styles.adjustText}>View proforma</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  revenuePanel: {
    alignSelf: "stretch",
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    ...shadows.soft,
  },
  revenuePanelWide: {
    flex: 1,
  },
  mintWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mint,
  },
  revenueEyebrow: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  revenueValue: {
    ...typography.display,
    color: colors.forestDeep,
    fontSize: 38,
    lineHeight: 44,
  },
  revenueDash: {
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
    fontSize: 23,
    lineHeight: 29,
  },
  incomeRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
  },
  incomeRail: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    width: 4,
  },
  incomeCopy: {
    gap: 2,
  },
  incomeLabel: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
  },
  incomeValue: {
    ...typography.monoLarge,
    color: colors.accentDark,
    fontSize: 20,
    lineHeight: 25,
  },
  incomeUnit: {
    ...typography.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  assumptionsRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.md,
  },
  assumptionsCopy: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
  },
  assumptionsText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  adjustButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  adjustPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  adjustText: {
    ...typography.label,
    color: colors.accentDark,
    fontSize: 13,
  },
});
