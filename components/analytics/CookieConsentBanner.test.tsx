import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { CONSENT_VERSION, CONSENT_STORAGE_KEY, readConsent } from "@/lib/analytics/consent";

function storeDecision(decision: "granted" | "denied") {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ decision, version: CONSENT_VERSION, decidedAt: "2026-08-31T00:00:00Z" }),
  );
}

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asks for consent when the visitor has not decided", async () => {
    render(<CookieConsentBanner />);

    expect(await screen.findByRole("region", { name: /cookie consent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  it("renders nothing when no measurement ID is configured", () => {
    // Nothing would be loaded either way, so prompting would be a consent
    // dialog for a decision that changes nothing.
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    const { container } = render(<CookieConsentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden once the visitor has accepted", () => {
    storeDecision("granted");

    const { container } = render(<CookieConsentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden once the visitor has declined", () => {
    storeDecision("denied");

    const { container } = render(<CookieConsentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("records consent and dismisses when Accept is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: /accept/i }));

    expect(readConsent()).toBe("granted");
    expect(screen.queryByRole("region", { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it("records refusal and dismisses when Decline is clicked", async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: /decline/i }));

    // A refusal must persist; otherwise the banner nags on every page view.
    expect(readConsent()).toBe("denied");
    expect(screen.queryByRole("region", { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it("clears analytics cookies when the visitor declines", async () => {
    document.cookie = "_ga=GA1.1.123; path=/";
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole("button", { name: /decline/i }));

    expect(document.cookie).not.toContain("_ga=");
  });

  it("links to the privacy policy", async () => {
    render(<CookieConsentBanner />);

    const link = await screen.findByRole("link", { name: /privacy policy/i });
    expect(link).toHaveAttribute("href", "/privacy");
  });
});
