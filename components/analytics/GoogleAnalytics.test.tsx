import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "@/lib/analytics/consent";

const pageview = vi.hoisted(() => vi.fn());
const navigation = vi.hoisted(() => ({ pathname: "/", search: "" }));

// next/script renders through a runtime the jsdom suite does not boot; a plain
// script tag preserves what the assertions care about (src and inline body).
vi.mock("next/script", () => ({
  default: ({ src, children, id }: { src?: string; children?: string; id?: string }) => (
    <script data-testid={id ?? "gtag-loader"} data-src={src}>
      {children}
    </script>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@/lib/analytics/gtag", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics/gtag")>(
    "@/lib/analytics/gtag",
  );
  return { ...actual, pageview };
});

function grantConsent() {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ decision: "granted", version: CONSENT_VERSION, decidedAt: "x" }),
  );
}

function denyConsent() {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ decision: "denied", version: CONSENT_VERSION, decidedAt: "x" }),
  );
}

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pageview.mockClear();
    navigation.pathname = "/";
    navigation.search = "";
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "webdriver");
  });

  it("loads no tag before the visitor decides", () => {
    // The core promise of an opt-in banner: nothing reaches Google until the
    // visitor accepts, so an undecided visitor must produce no script at all.
    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
    expect(pageview).not.toHaveBeenCalled();
  });

  it("loads no tag when the visitor declined", () => {
    denyConsent();

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
    expect(pageview).not.toHaveBeenCalled();
  });

  it("loads no tag when no measurement ID is configured", () => {
    grantConsent();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
  });

  it("loads no measurement tags in an automated browser", () => {
    grantConsent();
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: true });

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
    expect(pageview).not.toHaveBeenCalled();
  });

  it("loads gtag.js for the configured property once consent is granted", async () => {
    grantConsent();

    render(<GoogleAnalytics />);

    const loader = await screen.findByTestId("gtag-loader");
    expect(loader).toHaveAttribute(
      "data-src",
      "https://www.googletagmanager.com/gtag/js?id=G-ABC1234567",
    );
  });

  it("disables automatic page views so the router does not double-count", async () => {
    grantConsent();

    render(<GoogleAnalytics />);

    const init = await screen.findByTestId("lf-gtag-init");
    expect(init.textContent).toContain("send_page_view: false");
    expect(init.textContent).toContain("G-ABC1234567");
  });

  it("grants advertising measurement only after the new disclosure is accepted", async () => {
    grantConsent();

    render(<GoogleAnalytics />);

    const init = await screen.findByTestId("lf-gtag-init");
    expect(init.textContent).toContain("ad_storage: 'granted'");
    expect(init.textContent).toContain("ad_user_data: 'granted'");
    expect(init.textContent).toContain("ad_personalization: 'denied'");
    expect(init.textContent).toContain("analytics_storage: 'granted'");
  });

  it("sends a page view for the current route", async () => {
    grantConsent();
    navigation.pathname = "/studio";

    render(<GoogleAnalytics />);

    await vi.waitFor(() => expect(pageview).toHaveBeenCalledWith("/studio"));
  });

  it("sanitizes the path and strips query parameters from page views", async () => {
    grantConsent();
    navigation.pathname = "/builder";
    navigation.search = "lead=r1";

    render(<GoogleAnalytics />);

    await vi.waitFor(() => expect(pageview).toHaveBeenCalledWith("/builder"));
  });

  it("configures the Ads account alongside GA4 for conversion measurement", async () => {
    grantConsent();

    render(<GoogleAnalytics />);

    const init = await screen.findByTestId("lf-gtag-init");
    expect(init.textContent).toContain("gtag('config', 'AW-18350405574', { send_page_view: false })");
  });
});
