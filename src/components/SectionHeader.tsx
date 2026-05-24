import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

interface SectionHeaderProps {
  title: string;
  action?: string;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: -spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
  },
  action: {
    ...typography.label,
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: 1,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
