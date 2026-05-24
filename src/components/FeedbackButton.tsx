import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "../theme";
import { submitFeedback } from "../services/advisorServices";

interface FeedbackButtonProps {
  pageIdentifier?: string;
  clientVersion?: string;
}

type FeedbackCategory = "general" | "bug" | "feature_request" | "data_issue" | "other";

export function FeedbackButton({ pageIdentifier = "AppRoot", clientVersion = "1.0.0" }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setCategory("general");
    setRating(undefined);
    setMessage("");
    setSubmitStatus("idle");
    setErrorMessage("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (message.trim().length < 5) {
      setErrorMessage("Message must be at least 5 characters.");
      return;
    }
    if (message.length > 1000) {
      setErrorMessage("Message cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await submitFeedback({
        category,
        message: message.trim(),
        rating,
        pageIdentifier,
        clientVersion,
        deviceInfo: {
          os: Platform.OS,
          osVersion: String(Platform.Version),
          brand: Platform.select({ ios: "Apple", android: "Android", default: "Web Browser" }),
          model: Platform.select({ ios: "iPhone/iPad", android: "Device Model", default: "Desktop" }),
        },
      });

      if (result) {
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setErrorMessage("Could not submit feedback. You may have exceeded the limit of 20 requests per hour.");
      }
    } catch (err) {
      setSubmitStatus("error");
      setErrorMessage("A network error occurred. Please verify your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { value: FeedbackCategory; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { value: "general", label: "General", icon: "message-circle" },
    { value: "bug", label: "Bug", icon: "alert-triangle" },
    { value: "feature_request", label: "Feature", icon: "plus-circle" },
    { value: "data_issue", label: "Data Issue", icon: "database" },
  ];

  return (
    <>
      {/* Floating Action Button (FAB) - Touch Target is 56x56px (ideal) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open feedback form"
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.pressed,
        ]}
        onPress={() => setIsOpen(true)}
      >
        <Feather name="message-square" size={22} color={colors.canvas} />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header Section */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>YardUp Feedback</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close feedback form"
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.pressedIcon,
                  ]}
                  onPress={handleClose}
                >
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              {submitStatus === "success" ? (
                /* Success Feedback Screen */
                <View style={styles.resultContainer}>
                  <View style={styles.successIconWrapper}>
                    <Feather name="check-circle" size={54} color={colors.emerald} />
                  </View>
                  <Text style={styles.resultTitle}>Feedback Received!</Text>
                  <Text style={styles.resultBody}>
                    Thank you. Your suggestions help us improve ADU feasibility and value calculations for all homeowners.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleClose}
                  >
                    <Text style={styles.actionButtonText}>Done</Text>
                  </Pressable>
                </View>
              ) : (
                /* Form Entry Screen */
                <ScrollView contentContainerStyle={styles.formScroll}>
                  {/* Category Options */}
                  <Text style={styles.sectionLabel}>What is this feedback about?</Text>
                  <View style={styles.categoryGrid}>
                    {categories.map((item) => {
                      const isSelected = category === item.value;
                      return (
                        <Pressable
                          key={item.value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          style={({ pressed }) => [
                            styles.categoryChip,
                            isSelected && styles.categoryChipSelected,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setCategory(item.value)}
                        >
                          <Feather
                            name={item.icon}
                            size={16}
                            color={isSelected ? colors.canvas : colors.muted}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              isSelected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Rating Selector */}
                  <Text style={styles.sectionLabel}>Rate your experience (optional)</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isSelected = rating !== undefined && star <= rating;
                      return (
                        <Pressable
                          key={star}
                          accessibilityRole="button"
                          accessibilityLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          style={({ pressed }) => [
                            styles.starWrapper,
                            pressed && styles.pressedIcon,
                          ]}
                          onPress={() => setRating(star === rating ? undefined : star)}
                        >
                          <Feather
                            name="star"
                            size={28}
                            color={isSelected ? colors.highlighter : colors.border}
                            style={isSelected ? styles.starFilled : null}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Multiline Message Text Box */}
                  <Text style={styles.sectionLabel}>Message</Text>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Tell us what's working, what's broken, or what metrics you'd like to see..."
                    placeholderTextColor={colors.faint}
                    value={message}
                    onChangeText={(text) => {
                      setMessage(text);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />

                  {/* Count & Validation Details */}
                  <View style={styles.inputFooter}>
                    {errorMessage ? (
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <Text style={styles.charCount}>{message.length}/1000</Text>
                  </View>

                  {/* Submit Trigger */}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting || message.trim().length < 5}
                    style={({ pressed }) => [
                      styles.actionButton,
                      (isSubmitting || message.trim().length < 5) && styles.actionButtonDisabled,
                      pressed && !isSubmitting && styles.pressed,
                    ]}
                    onPress={handleSubmit}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.canvas} />
                    ) : (
                      <Text style={styles.actionButtonText}>Submit Feedback</Text>
                    )}
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    backgroundColor: colors.forest,
    borderRadius: radii.full,
    bottom: spacing.lg,
    elevation: 5,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    width: 56,
    zIndex: 9999,
  },
  modalBackdrop: {
    backgroundColor: "rgba(14, 44, 32, 0.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "90%",
  },
  modalContent: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: spacing.md,
    shadowColor: "#0E2C20",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  closeButton: {
    alignItems: "center",
    height: 48, // 48x48px close target
    justifyContent: "center",
    width: 48,
  },
  formScroll: {
    paddingVertical: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48, // 48px touch target
    paddingHorizontal: spacing.md,
  },
  categoryChipSelected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  categoryChipText: {
    ...typography.body,
    color: colors.muted,
  },
  categoryChipTextSelected: {
    color: colors.canvas,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginBottom: spacing.xs,
  },
  starWrapper: {
    alignItems: "center",
    height: 48, // 48x48px target
    justifyContent: "center",
    width: 48,
  },
  starFilled: {
    textShadowColor: "rgba(14, 44, 32, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textInput: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16, // prevents automatic browser zoom when focused
    minHeight: 100,
    padding: spacing.md,
  },
  inputFooter: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    minHeight: 24,
  },
  charCount: {
    ...typography.mono,
    color: colors.faint,
    fontSize: 11,
  },
  errorText: {
    ...typography.body,
    color: colors.warning,
    fontSize: 12,
    flex: 1,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.emerald,
    borderRadius: radii.full,
    justifyContent: "center",
    minHeight: 52, // 52px touch target
    marginTop: spacing.md,
  },
  actionButtonDisabled: {
    backgroundColor: colors.surfaceStrong,
  },
  actionButtonText: {
    ...typography.label,
    color: colors.canvas,
    fontSize: 14,
  },
  resultContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  successIconWrapper: {
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
  },
  resultBody: {
    ...typography.body,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  pressedIcon: {
    opacity: 0.6,
  },
});
