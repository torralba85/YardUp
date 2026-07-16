import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsClient } from "./SettingsClient";

const authState = vi.hoisted(() => ({
  user: {
    emailVerified: true,
    providerData: [{ providerId: "password" }],
    getIdToken: async () => "token",
  } as unknown,
  profile: {
    uid: "u1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
    role: "user" as const,
    createdAt: null,
  },
  loading: false,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    logout: vi.fn(),
    updateAccountName: vi.fn(),
    changeAccountEmail: vi.fn(),
    changeAccountPassword: vi.fn(),
    sendVerification: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

describe("SettingsClient", () => {
  it("shows every launch-required account action", () => {
    render(<SettingsClient />);
    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get help/i })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: /send feedback/i })).toHaveAttribute(
      "href",
      "/feedback",
    );
    expect(screen.getByRole("button", { name: /export my data/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
  });
});
