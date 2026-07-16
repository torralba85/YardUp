import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsClient } from "./SettingsClient";

interface MockAuthState {
  user: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  loading: boolean;
}

const authState = vi.hoisted<MockAuthState>(() => ({
  user: null,
  profile: null,
  loading: false,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    logout: vi.fn(),
    deleteAccount: vi.fn(),
    updateAccountName: vi.fn(),
    changeAccountEmail: vi.fn(),
    changeAccountPassword: vi.fn(),
    sendVerification: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

function signIn(role: "user" | "builder" = "user") {
  authState.user = {
    uid: "user-1",
    email: "owner@example.com",
    emailVerified: true,
    providerData: [{ providerId: "password" }],
  };
  authState.profile = {
    uid: "user-1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
    role,
    createdAt: null,
  };
}

describe("SettingsClient", () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
    authState.loading = false;
  });

  it("shows every launch-required account action when signed in", () => {
    signIn();
    render(<SettingsClient />);

    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get help/i })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(screen.getByRole("link", { name: /send feedback/i })).toHaveAttribute(
      "href",
      "/feedback",
    );
    expect(
      screen.getByRole("link", { name: /terms & conditions/i }),
    ).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(
      screen.getByRole("button", { name: /export my data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete account/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("offers a sign-in action to signed-out visitors", () => {
    render(<SettingsClient />);

    expect(
      screen.getByRole("heading", { name: /sign in to manage your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("links builders to the builder dashboard", () => {
    signIn("builder");
    render(<SettingsClient />);

    expect(
      screen.getByRole("link", { name: /open the builder dashboard/i }),
    ).toHaveAttribute("href", "/builder");
  });

  it("hides the builder section for homeowners", () => {
    signIn("user");
    render(<SettingsClient />);

    expect(
      screen.queryByRole("link", { name: /open the builder dashboard/i }),
    ).not.toBeInTheDocument();
  });
});
