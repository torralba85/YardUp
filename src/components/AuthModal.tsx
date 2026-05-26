import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAuthStore, userRoleLabels, type UserRole } from "../state/authStore";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { Button } from "./Button";

const REGISTER_ROLES: UserRole[] = ["homeowner", "builder"];

export function AuthModal() {
  const {
    currentUser,
    currentRole,
    isAuthModalOpen,
    authModalTab,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    setAuthModalOpen,
    clearError,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("homeowner");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  const isGuest = !currentUser || currentUser.isAnonymous;
  const activeTab = authModalTab;
  const profileRole: UserRole | null =
    currentRole ?? ((currentUser as { role?: UserRole } | null)?.role ?? null);

  const handleClose = () => {
    setEmail("");
    setPassword("");
    clearError();
    setAuthModalOpen(false);
  };

  const handleTabChange = (tab: "login" | "register" | "profile") => {
    clearError();
    useAuthStore.setState({ authModalTab: tab });
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      useAuthStore.setState({ error: "Please fill in all fields." });
      return;
    }

    if (activeTab === "login") {
      await signIn(trimmedEmail, password);
    } else {
      await signUp(trimmedEmail, password, role);
    }
  };

  if (!isAuthModalOpen) return null;

  return (
    <Modal
      transparent
      visible={isAuthModalOpen}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {!isGuest ? "Your Account" : activeTab === "login" ? "Sign In" : "Create Account"}
              </Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-triangle" size={16} color={colors.coral} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
              {isGuest ? (
                // Authentication View (Sign In / Register)
                <View style={styles.authContainer}>
                  {/* Tabs */}
                  <View style={styles.tabsRow}>
                    <Pressable
                      onPress={() => handleTabChange("login")}
                      style={[styles.tab, activeTab === "login" && styles.activeTab]}
                    >
                      <Text style={[styles.tabLabel, activeTab === "login" && styles.activeTabLabel]}>
                        Sign In
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleTabChange("register")}
                      style={[styles.tab, activeTab === "register" && styles.activeTab]}
                    >
                      <Text style={[styles.tabLabel, activeTab === "register" && styles.activeTabLabel]}>
                        Create Account
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.tagline}>
                    {activeTab === "login"
                      ? "Sign in to manage cloud-backed builder outreach and account access."
                      : "Create an account to manage builder outreach and delivery history."}
                  </Text>

                  {/* Form Fields */}
                  <View style={styles.form}>
                    {activeTab === "register" ? (
                      <View style={styles.fieldGroup}>
                        <Text style={styles.inputLabel}>I am a…</Text>
                        <View style={styles.roleRow}>
                          {REGISTER_ROLES.map((option) => {
                            const selected = role === option;
                            return (
                              <Pressable
                                key={option}
                                onPress={() => setRole(option)}
                                disabled={loading}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                accessibilityLabel={userRoleLabels[option]}
                                style={[styles.roleOption, selected && styles.roleOptionSelected]}
                              >
                                <Feather
                                  name={option === "builder" ? "tool" : "home"}
                                  size={16}
                                  color={selected ? colors.emerald : colors.muted}
                                />
                                <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
                                  {userRoleLabels[option]}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.fieldGroup}>
                      <Text style={styles.inputLabel}>Email address</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          emailFocus && styles.inputContainerFocused,
                        ]}
                      >
                        <Feather name="mail" size={16} color={colors.faint} />
                        <TextInput
                          style={styles.input}
                          placeholder="name@example.com"
                          placeholderTextColor={colors.faint}
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          onFocus={() => setEmailFocus(true)}
                          onBlur={() => setEmailFocus(false)}
                          editable={!loading}
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          passwordFocus && styles.inputContainerFocused,
                        ]}
                      >
                        <Feather name="lock" size={16} color={colors.faint} />
                        <TextInput
                          style={styles.input}
                          placeholder="At least 6 characters"
                          placeholderTextColor={colors.faint}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          textContentType="password"
                          onFocus={() => setPasswordFocus(true)}
                          onBlur={() => setPasswordFocus(false)}
                          editable={!loading}
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                          <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.muted} />
                        </Pressable>
                      </View>
                    </View>

                    <Button
                      onPress={handleSubmit}
                      disabled={loading || !email.trim() || !password}
                      style={styles.submitButton}
                    >
                      {loading
                        ? activeTab === "login"
                          ? "Signing In..."
                          : "Creating Account..."
                        : activeTab === "login"
                          ? "Sign In"
                          : "Register"}
                    </Button>
                  </View>
                </View>
              ) : (
                // Profile View (User already authenticated)
                <View style={styles.profileContainer}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U"}
                      </Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileEmail} numberOfLines={1}>
                        {currentUser.email ?? "Anonymous Guest"}
                      </Text>
                      {profileRole ? (
                        <View style={styles.roleBadge}>
                          <Feather
                            name={profileRole === "builder" ? "tool" : "home"}
                            size={12}
                            color={colors.accentDark}
                          />
                          <Text style={styles.roleBadgeText}>{userRoleLabels[profileRole]}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.profileSubtitle}>
                        User ID: {currentUser.uid.slice(0, 8)}...
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusBox}>
                    <Feather name="shield" size={16} color={colors.emerald} />
                    <Text style={styles.statusText}>
                      Cloud-backed requests use your account when you choose to send them. Project studies remain stored locally by default.
                    </Text>
                  </View>

                  <Button
                    variant="secondary"
                    onPress={signOut}
                    disabled={loading}
                    style={styles.signOutButton}
                  >
                    {loading ? "Signing Out..." : "Sign Out"}
                  </Button>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14, 44, 32, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  keyboardView: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.medium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    backgroundColor: colors.warningSoft,
    borderColor: colors.coral,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  errorText: {
    ...typography.body,
    fontSize: 12,
    color: colors.coral,
    flex: 1,
  },
  authContainer: {
    gap: spacing.md,
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: colors.emerald,
  },
  tabLabel: {
    ...typography.label,
    color: colors.muted,
  },
  activeTabLabel: {
    color: colors.forestDeep,
  },
  tagline: {
    ...typography.body,
    color: colors.muted,
    lineHeight: 18,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    minHeight: 46,
  },
  inputContainerFocused: {
    borderColor: colors.emerald,
    backgroundColor: colors.canvas,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  profileContainer: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.h1,
    color: colors.emerald,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileEmail: {
    ...typography.h2,
    color: colors.text,
  },
  profileSubtitle: {
    ...typography.mono,
    color: colors.muted,
    fontSize: 11,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mintSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
  },
  statusText: {
    ...typography.body,
    fontSize: 13,
    color: colors.forestDeep,
    flex: 1,
  },
  signOutButton: {
    width: "100%",
  },
  roleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  roleOptionSelected: {
    borderColor: colors.emerald,
    backgroundColor: colors.mintSoft,
  },
  roleLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 12,
  },
  roleLabelSelected: {
    color: colors.forestDeep,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.mintSoft,
    borderWidth: 1,
    borderColor: colors.mint,
    marginTop: 2,
  },
  roleBadgeText: {
    ...typography.label,
    fontSize: 11,
    color: colors.accentDark,
  },
});
