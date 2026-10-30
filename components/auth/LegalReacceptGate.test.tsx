import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LegalReacceptGate } from "./LegalReacceptGate";

const authMocks = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  profile: null as { uid: string; email: string; role: string; legalConsentCurrent?: boolean } | null,
  loading: false,
  acceptCurrentLegalTerms: vi.fn(),
  logout: vi.fn(),
}));

const navMocks = vi.hoisted(() => ({
  pathname: "/studio",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navMocks.pathname,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authMocks.user,
    profile: authMocks.profile,
    loading: authMocks.loading,
    acceptCurrentLegalTerms: authMocks.acceptCurrentLegalTerms,
    logout: authMocks.logout,
  }),
}));

describe("LegalReacceptGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.user = null;
    authMocks.profile = null;
    authMocks.loading = false;
    authMocks.acceptCurrentLegalTerms.mockResolvedValue(undefined);
    authMocks.logout.mockResolvedValue(undefined);
    navMocks.pathname = "/studio";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing for guests", () => {
    authMocks.user = null;
    authMocks.profile = null;
    const { container } = render(<LegalReacceptGate />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing while auth state is loading", () => {
    authMocks.loading = true;
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    const { container } = render(<LegalReacceptGate />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when stored legal consent is current", () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: true };
    const { container } = render(<LegalReacceptGate />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders blocking dialog when legal consent is outdated", () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    render(<LegalReacceptGate />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "We updated our Terms and Privacy Policy" })).toBeInTheDocument();
    expect(
      screen.getByText(/Please review and accept the updated Terms & Conditions and Privacy Policy/),
    ).toBeInTheDocument();

    const termsLink = screen.getByRole("link", { name: "Terms & Conditions" });
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(termsLink).toHaveAttribute("target", "_blank");
    expect(termsLink).toHaveAttribute("rel", "noopener");

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener");

    const deleteLink = screen.getByRole("link", { name: "Delete my account instead" });
    expect(deleteLink).toHaveAttribute("href", "/delete-account");
  });

  it("keeps the primary button disabled until checkbox is checked", async () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    render(<LegalReacceptGate />);

    const button = screen.getByRole("button", { name: "Accept and continue" });
    const checkbox = screen.getByRole("checkbox");

    expect(checkbox).not.toBeChecked();
    expect(button).toBeDisabled();

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(button).toBeEnabled();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(button).toBeDisabled();
  });

  it("calls acceptCurrentLegalTerms when accepted and continue is clicked", async () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    render(<LegalReacceptGate />);

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    const button = screen.getByRole("button", { name: "Accept and continue" });
    await userEvent.click(button);

    expect(authMocks.acceptCurrentLegalTerms).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error if saving acceptance fails", async () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    authMocks.acceptCurrentLegalTerms.mockRejectedValueOnce(new Error("Network failure"));
    render(<LegalReacceptGate />);

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    const button = screen.getByRole("button", { name: "Accept and continue" });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't save your acceptance. Please try again.",
      );
    });
  });

  it("does not render on /delete-account route", () => {
    navMocks.pathname = "/delete-account";
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };

    const { container } = render(<LegalReacceptGate />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls logout when Sign out is clicked", async () => {
    authMocks.user = { uid: "user-1" };
    authMocks.profile = { uid: "user-1", email: "user@example.com", role: "user", legalConsentCurrent: false };
    render(<LegalReacceptGate />);

    const signOutBtn = screen.getByRole("button", { name: "Sign out" });
    await userEvent.click(signOutBtn);

    expect(authMocks.logout).toHaveBeenCalledTimes(1);
  });
});
