import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ children, icon, variant = "primary", style, ...props }: ButtonProps) {
  const disabled = Boolean(props.disabled);
  const labelColor =
    variant === "primary" && !disabled
      ? colors.background
      : disabled
        ? colors.accentDark
        : variant === "ghost"
          ? colors.accentDark
          : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {icon ? <Feather name={icon} size={16} color={labelColor} /> : null}
        <Text
          style={[
            styles.label,
            variant === "primary" && !disabled ? styles.primaryLabel : styles.secondaryLabel,
            disabled && styles.disabledLabel,
          ]}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.full,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.emerald,
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  secondary: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  disabled: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }, { scale: 0.985 }],
  },
  label: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryLabel: {
    color: colors.canvas,
  },
  secondaryLabel: {
    color: colors.forestDeep,
  },
  disabledLabel: {
    color: colors.accentDark,
  },
});
