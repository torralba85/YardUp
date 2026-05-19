import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../theme";

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
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  action: {
    ...typography.label,
    color: colors.accent,
  },
});
