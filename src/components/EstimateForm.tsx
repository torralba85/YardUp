import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { defaultEstimateInput } from "../domain/estimator";
import { estimateInputSchema, type EstimateInputForm } from "../domain/schemas";
import type { EstimateInput } from "../domain/types";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { Button } from "./Button";

interface EstimateFormProps {
  initialValues?: EstimateInput;
  onSubmit: (input: EstimateInput) => void;
}

const fieldGroups: Array<{
  title: string;
  fields: Array<{ name: keyof EstimateInputForm; label: string; suffix?: string }>;
}> = [
  {
    title: "Build scope",
    fields: [
      { name: "aduSqFt", label: "ADU size", suffix: "sqft" },
      { name: "buildCostPerSqFt", label: "Build cost", suffix: "/sqft" },
    ],
  },
  {
    title: "Income",
    fields: [{ name: "monthlyRent", label: "Monthly rent", suffix: "mo" }],
  },
  {
    title: "Risk and rates",
    fields: [
      { name: "softCostRate", label: "Soft cost rate", suffix: "decimal" },
      { name: "contingencyRate", label: "Contingency", suffix: "decimal" },
      { name: "opExRate", label: "Operating expense", suffix: "decimal" },
      { name: "capRate", label: "Cap rate", suffix: "decimal" },
    ],
  },
];

export function EstimateForm({ initialValues = defaultEstimateInput, onSubmit }: EstimateFormProps) {
  const { control, handleSubmit, setError, formState } = useForm<EstimateInputForm>({
    defaultValues: initialValues,
  });

  const submitValues = (values: EstimateInputForm) => {
    const parsed = estimateInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0] as keyof EstimateInputForm;
        setError(fieldName, { message: issue.message });
      }
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <View style={styles.form}>
      {fieldGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupFields}>
            {group.fields.map((field) => (
              <Controller
                key={field.name}
                control={control}
                name={field.name}
                render={({ field: formField }) => (
                  <View style={styles.field}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>{field.label}</Text>
                      {field.suffix ? <Text style={styles.suffix}>{field.suffix}</Text> : null}
                    </View>
                    <TextInput
                      accessibilityLabel={field.label}
                      keyboardType="decimal-pad"
                      onBlur={formField.onBlur}
                      onChangeText={formField.onChange}
                      style={styles.input}
                      value={String(formField.value)}
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.accent}
                    />
                    {formState.errors[field.name] ? <Text style={styles.error}>{formState.errors[field.name]?.message}</Text> : null}
                  </View>
                )}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.submitContainer}>
        <Button icon="save" onPress={handleSubmit(submitValues)}>Save assumptions</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  group: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    borderLeftColor: colors.blueprint,
    borderLeftWidth: 3,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.soft,
  },
  groupTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  groupFields: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  suffix: {
    ...typography.label,
    color: colors.muted,
    textTransform: "none",
  },
  input: {
    ...typography.body,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  error: {
    ...typography.body,
    color: colors.warning,
    fontSize: 13,
    paddingHorizontal: spacing.xs,
  },
  submitContainer: {
    marginTop: spacing.sm,
  }
});
