import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookiePreferences } from "./CookiePreferences";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, readConsent } from "@/lib/analytics/consent";

function storeDecision(decision: "granted" | "denied") {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ decision, version: CONSENT_VERSION, decidedAt: "x" }),
  );
}

describe("CookiePreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing when no measurement ID is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    const { container } = render(<CookiePreferences />);

    expect(container).toBeEmptyDOMElement();
  });

  it("reports the current state to someone who accepted", async () => {
    storeDecision("granted");

    render(<CookiePreferences />);

    expect(await screen.findByText(/analytics and ads measurement cookies are on/i)).toBeInTheDocument();
  });

  it("reports the current state to someone who declined", async () => {
    storeDecision("denied");

    render(<CookiePreferences />);

    expect(await screen.findByText(/analytics and ads measurement cookies are off/i)).toBeInTheDocument();
  });

  it("lets a consenting visitor withdraw consent", async () => {
    // Withdrawal has to be as easy as granting, so the control is one click
    // from the privacy page rather than a re-prompt.
    storeDecision("granted");
    document.cookie = "_ga=GA1.1.123; path=/";
    const user = userEvent.setup();

    render(<CookiePreferences />);
    await user.click(await screen.findByRole("button", { name: /turn off measurement/i }));

    expect(readConsent()).toBe("denied");
    expect(document.cookie).not.toContain("_ga=");
  });

  it("lets a declining visitor opt back in", async () => {
    storeDecision("denied");
    const user = userEvent.setup();

    render(<CookiePreferences />);
    await user.click(await screen.findByRole("button", { name: /turn on measurement/i }));

    expect(readConsent()).toBe("granted");
  });

  it("offers only the opt-in path to an undecided visitor", async () => {
    render(<CookiePreferences />);

    expect(await screen.findByRole("button", { name: /turn on measurement/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /turn off measurement/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ask me again/i })).not.toBeInTheDocument();
  });

  it("can reset back to undecided so the banner reappears", async () => {
    storeDecision("granted");
    const user = userEvent.setup();

    render(<CookiePreferences />);
    await user.click(await screen.findByRole("button", { name: /ask me again/i }));

    expect(readConsent()).toBe("unset");
  });
});
