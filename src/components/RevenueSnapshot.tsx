import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { formatCurrency } from "../domain/estimator";
import type { EstimateInput, EstimateResult } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";

// Motion is minimal-functional (DESIGN.md): we only animate the revenue
// figures recalculating and a single sparing "rise" entrance. Durations sit in
// the sanctioned 250-400ms recalculation band; the rise uses the 600ms first-
// paint window. Nothing decorative moves.
const RECALC_MS = 360;
const RISE_MS = 600;
const RISE_OFFSET = 8;

/** Tracks the OS "reduce motion" setting so we can skip straight to final values. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Counts a money figure up to `target` — from 0 on first paint, from the prior
 * value on recalculation. When motion is reduced it renders the target
 * immediately. Returns the live value to format with `formatCurrency`.
 */
function useCountUp(target: number, animate: boolean): number {
  const animated = useRef(new Animated.Value(animate ? 0 : target)).current;
  const [display, setDisplay] = useState(animate ? 0 : target);
  const prev = useRef(animate ? 0 : target);

  useEffect(() => {
    const id = animated.addListener(({ value }) => setDisplay(value));
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    if (!animate) {
      animated.stopAnimation();
      animated.setValue(target);
      setDisplay(target);
      prev.current = target;
      return;
    }
    if (prev.current === target) return;
    const anim = Animated.timing(animated, {
      toValue: target,
      duration: RECALC_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    prev.current = target;
    return () => anim.stop();
  }, [animated, target, animate]);

  return display;
}

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

export function RevenueSnapshot({
  estimate,
  estimateInput,
  assumptionsLabel = "Starter supported-market estimate",
  wide,
  onAdjust,
}: RevenueSnapshotProps) {
  const rentLow = estimateInput.monthlyRent * 0.9;
  const rentHigh = estimateInput.monthlyRent * 1.1;

  const reduceMotion = useReduceMotion();
  const animate = !reduceMotion;

  // Sparing first-paint "rise": 8px translateY + fade, native-driven.
  const enterOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const enterTranslate = useRef(new Animated.Value(animate ? RISE_OFFSET : 0)).current;
  useEffect(() => {
    if (!animate) {
      enterOpacity.setValue(1);
      enterTranslate.setValue(0);
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(enterOpacity, { toValue: 1, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(enterTranslate, { toValue: 0, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [animate, enterOpacity, enterTranslate]);

  const displayRentLow = useCountUp(rentLow, animate);
  const displayRentHigh = useCountUp(rentHigh, animate);
  const displayNOI = useCountUp(estimate.annualNOI, animate);

  return (
    <Animated.View
      style={[styles.revenuePanel, wide && styles.revenuePanelWide, { opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }]}
    >
      <View pointerEvents="none" style={styles.mintWash} />
      <Text style={styles.revenueEyebrow}>Estimated monthly rent</Text>
      <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {formatCurrency(displayRentLow)}
        <Text style={styles.revenueDash}> - </Text>
        {formatCurrency(displayRentHigh)}
      </Text>

      <View style={styles.incomeRow}>
        <View style={styles.incomeRail} />
        <View style={styles.incomeCopy}>
          <Text style={styles.incomeLabel}>Net annual income</Text>
          <Text style={styles.incomeValue}>
            +{formatCurrency(displayNOI)}
            <Text style={styles.incomeUnit}> avg/yr</Text>
          </Text>
        </View>
      </View>

      <View style={styles.assumptionsRow}>
        <View style={styles.assumptionsCopy}>
          <Feather name="check-circle" size={16} color={colors.accent} />
          <Text style={styles.assumptionsText} numberOfLines={1}>
            {assumptionsLabel}
          </Text>
        </View>
        {onAdjust ? (
          <Pressable accessibilityRole="button" accessibilityLabel="View proforma" onPress={onAdjust} style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}>
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
    opacity: 0.22,
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
