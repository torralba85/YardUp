import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, writeConsent } from "@/lib/analytics/consent";

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

function commands(): unknown[][] {
  return (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

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
    window.sessionStorage.clear();
    delete window.gtag;
    delete window.dataLayer;
    pageview.mockClear();
    navigation.pathname = "/";
    navigation.search = "";
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "webdriver");
  });

  it.each(["unset", "denied"])("loads only GA4 with denied storage when consent is %s", (consent) => {
    if (consent === "denied") denyConsent();

    render(<GoogleAnalytics />);

    expect(screen.getByTestId("gtag-loader")).toBeInTheDocument();
    expect(commands()[0]).toEqual(["consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }]);
    expect(commands().filter(([command]) => command === "config").map((entry) => entry[1]))
      .toEqual(["G-ABC1234567"]);
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

    expect(commands()).toContainEqual(["config", "G-ABC1234567", expect.objectContaining({
      send_page_view: false,
    })]);
  });

  it("configures approved attribution with clean default URLs before early events flush", async () => {
    grantConsent();
    window.history.replaceState(null, "", "/adu-cost-calculator?utm_source=x&utm_medium=organic_social&utm_campaign=adu_size_comparison_20261111&address=private#secret");
    render(<GoogleAnalytics />);

    const body = JSON.stringify(commands());
    expect(body).toContain('"campaign_source":"x"');
    expect(body).toContain('"campaign_name":"adu_size_comparison_20261111"');
    expect(body).toContain('"page_location":"http://localhost:3000/adu-cost-calculator"');
    expect(body).not.toMatch(/private|#secret|utm_source/);
  });

  it("configures Ads on grant and preserves the GA loader on withdrawal", () => {
    render(<GoogleAnalytics />);

    act(() => writeConsent("granted"));
    expect(commands()).toContainEqual(["consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
    }]);
    expect(commands()).toContainEqual(["config", "AW-18350405574", expect.objectContaining({
      send_page_view: false,
    })]);

    document.cookie = "_ga=temporary; path=/";
    act(() => writeConsent("denied"));
    expect(commands()).toContainEqual(["consent", "update", expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
    })]);
    expect(document.cookie).not.toContain("_ga=");
    expect(screen.getByTestId("gtag-loader")).toBeInTheDocument();
  });

  it("sends a page view for the current route", async () => {
    grantConsent();
    navigation.pathname = "/studio";

    render(<GoogleAnalytics />);

    await vi.waitFor(() => expect(pageview).toHaveBeenCalledWith("/studio"));
  });

  it("cancels a pending page view if unmounted before the tick completes", async () => {
    grantConsent();
    navigation.pathname = "/about";

    const { unmount } = render(<GoogleAnalytics />);
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(pageview).not.toHaveBeenCalled();
  });

  it("waits briefly for document.title to populate on route transitions before sending", async () => {
    grantConsent();
    navigation.pathname = "/about";
    document.title = "";

    render(<GoogleAnalytics />);
    setTimeout(() => {
      document.title = "About LotFoundry";
    }, 20);

    await vi.waitFor(() => expect(pageview).toHaveBeenCalledWith("/about"));
    expect(document.title).toBe("About LotFoundry");
    document.title = "";
  });

  it("sanitizes the path and strips query parameters from page views", async () => {
    grantConsent();
    navigation.pathname = "/builder";
    navigation.search = "lead=r1";

    render(<GoogleAnalytics />);

    await vi.waitFor(() => expect(pageview).toHaveBeenCalledWith("/builder"));
  });

  it("announces readiness after configuring, so events held before init are sent", () => {
    grantConsent();
    const seen = vi.fn(() => commands().filter(([command]) => command === "config"));
    window.addEventListener("lf:gtag-ready", seen, { once: true });

    render(<GoogleAnalytics />);

    expect(seen).toHaveReturnedWith(expect.arrayContaining([
      expect.arrayContaining(["config", "G-ABC1234567"]),
      expect.arrayContaining(["config", "AW-18350405574"]),
    ]));
  });
});
