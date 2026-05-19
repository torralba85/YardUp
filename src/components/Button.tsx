import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ children, variant = "primary", style, ...props }: ButtonProps) {
  const disabled = Boolean(props.disabled);

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
      <Text
        style={[
          styles.label,
          variant === "primary" && !disabled ? styles.primaryLabel : styles.secondaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  disabled: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  label: {
    ...typography.label,
    fontSize: 13,
  },
  primaryLabel: {
    color: colors.background,
  },
  secondaryLabel: {
    color: colors.text,
  },
  disabledLabel: {
    color: colors.accentDark,
  },
});
