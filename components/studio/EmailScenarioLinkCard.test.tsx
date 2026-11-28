import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmailScenarioLinkCard from "./EmailScenarioLinkCard";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "@/lib/scenario-url";
import { GTAG_READY_EVENT } from "@/lib/analytics/gtag";
import { writeConsent } from "@/lib/analytics/consent";

const appCheck = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/app-check-token", () => ({ limitedUseAppCheckToken: appCheck.token }));

const fetchMock = vi.fn();
const scenarioUrl = buildScenarioShareUrl(EMAIL_SCENARIO, "a".repeat(48));
function fillAndSubmit() {
  fireEvent.change(screen.getByRole("textbox", { name: "Email address for your 3D lot link" }), { target: { value: "Owner@Example.COM" } });
  fireEvent.click(screen.getByRole("button", { name: "Email my 3D link" }));
}
beforeEach(() => {
  vi.clearAllMocks(); window.sessionStorage.clear(); window.localStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
  delete window.gtag;
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, delivery: "queued", scenarioUrl }) });
  appCheck.token.mockResolvedValue("limited-use-token");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); delete window.gtag; });

describe("EmailScenarioLinkCard", () => {
  it("keeps marketing unchecked and shows submitting, queued confirmation and copy fallback", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fillAndSubmit();
    expect(screen.getByRole("button", { name: "Email my 3D link" })).toBeDisabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ marketingOptIn: false, address: EMAIL_SCENARIO.liveParcel!.address });
    await act(async () => resolve({ ok: true, json: async () => ({ ok: true, delivery: "queued", scenarioUrl }) }));
    expect(screen.getByRole("status")).toHaveTextContent("couldn't email it right now");
    expect(screen.queryByRole("button", { name: "Email my 3D link" })).toBeNull();
    expect(window.sessionStorage.getItem("lotfoundry_captured_email")).toBe("owner@example.com");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    const fallback = await screen.findByLabelText("Select and copy your link");
    expect(fallback).toHaveValue(scenarioUrl);
  });
  it("sends a fresh single-use App Check token with each request, and still submits without one", async () => {
    render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    fillAndSubmit();
    await screen.findByRole("status");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json", "X-Firebase-AppCheck": "limited-use-token" });
    window.sessionStorage.clear();
    appCheck.token.mockResolvedValue(null);
    render(<EmailScenarioLinkCard scenario={{ ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel!, address: "456 Different Street" } }} />);
    fillAndSubmit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ "Content-Type": "application/json" });
  });
  it("handles sent state and clipboard success, and remembers submission only for the active address", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, delivery: "sent", scenarioUrl }) });
    const { unmount } = render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    fillAndSubmit();
    expect(await screen.findByRole("status")).toHaveTextContent("Sent! Check your inbox");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(scenarioUrl);
    unmount();
    const again = render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    expect(screen.getByRole("status")).toHaveTextContent("Sent!");
    again.unmount();
    const differentAddress = render(<EmailScenarioLinkCard scenario={{ ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel!, address: "456 Different Street" } }} />);
    expect(screen.getByRole("button", { name: "Email my 3D link" })).toBeVisible();
    differentAddress.unmount();
    render(<EmailScenarioLinkCard scenario={{ ...EMAIL_SCENARIO, config: { ...EMAIL_SCENARIO.config, footprint: 800 } }} />);
    expect(screen.getByRole("button", { name: "Email my 3D link" })).toBeVisible();
  });
  it("retains editable form on API failure without storing the email or firing analytics", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Please try again later." }) });
    const gtag = vi.fn(); window.gtag = gtag;
    render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later.");
    expect(screen.getByRole("button", { name: "Email my 3D link" })).toBeEnabled();
    expect(window.sessionStorage.getItem("lotfoundry_captured_email")).toBeNull();
    expect(gtag).not.toHaveBeenCalled();
  });
  it("captures independently of declined analytics consent and never sends the event", async () => {
    writeConsent("denied");
    const gtag = vi.fn(); window.gtag = gtag;
    render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fillAndSubmit();
    await screen.findByRole("status");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).marketingOptIn).toBe(true);
    expect(gtag).not.toHaveBeenCalled();
  });
  it("holds a consented event until tag initialization without leaking email, address or link", async () => {
    writeConsent("granted");
    render(<EmailScenarioLinkCard scenario={EMAIL_SCENARIO} />);
    fillAndSubmit();
    await screen.findByRole("status");
    const gtag = vi.fn(); window.gtag = gtag;
    act(() => window.dispatchEvent(new Event(GTAG_READY_EVENT)));
    await waitFor(() => expect(gtag).toHaveBeenCalledWith("event", "studio_lead_email_captured", expect.objectContaining({ delivery: "queued", marketing_opt_in: false })));
    const measured = JSON.stringify(gtag.mock.calls);
    expect(measured).not.toContain("owner@example.com");
    expect(measured).not.toContain(EMAIL_SCENARIO.liveParcel!.address);
    expect(measured).not.toContain("layout=");
  });
});
