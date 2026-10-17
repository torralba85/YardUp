import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudioPage from "./page";
import { TYPICAL_MARKET } from "@/lib/typical-market";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  nativeApp: false,
  pendingAddress: null as string | null,
  pendingParcel: null as object | null,
  analyticsOrder: [] as string[],
  trackStudioOpened: vi.fn(),
  authState: {
    loading: false,
    user: null as null | { uid: string },
    profile: null as null | { role: "user" | "builder" },
  },
}));

vi.mock("@/components/FeasibilityStudio", () => ({
  default: function MockFeasibilityStudio({ demoChosen }: { demoChosen?: boolean }) {
    mocks.analyticsOrder.push("feasibility");
    return <div>Feasibility Studio Mock{demoChosen && <span>Demo selected</span>}</div>;
  },
}));

vi.mock("@/lib/analytics/events", () => ({
  trackStudioOpened: (...args: unknown[]) => {
    mocks.analyticsOrder.push("studio");
    mocks.trackStudioOpened(...args);
  },
}));

vi.mock("@/components/studio/SignedInStudioGate", () => ({
  default: function MockSignedInStudioGate() {
    return <div>Signed-in Blank Slate Mock</div>;
  },
}));

vi.mock("@/components/studio/EmailedScenarioEntry", () => ({
  default: function MockEmailedScenarioEntry({ token }: { token: string }) {
    const [mountId] = useState(() => Math.random().toString(36));
    return <div>Emailed layout {token}<span data-testid="emailed-mount">{mountId}</span></div>;
  },
}));

vi.mock("@/components/studio/AppStudioOnboarding", () => ({
  default: function MockAppStudioOnboarding({ user }: { user: { uid: string } | null }) {
    const [mountId] = useState(() => Math.random().toString(36));
    return (
      <div>
        App Onboarding Mock {user ? "member" : "guest"}
        <span data-testid="onboarding-mount">{mountId}</span>
      </div>
    );
  },
}));

vi.mock("@/lib/commerce/purchase-channel", () => ({
  isNativeAppShell: () => mocks.nativeApp,
}));

vi.mock("@/lib/address-handoff", () => ({ peekAddressQuery: () => mocks.pendingAddress }));
vi.mock("@/lib/parcel-handoff", () => ({ peekInitialParcel: () => mocks.pendingParcel }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

describe("StudioPage", () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.authState.loading = false;
    mocks.authState.user = null;
    mocks.authState.profile = null;
    mocks.nativeApp = false;
    mocks.pendingAddress = null;
    mocks.pendingParcel = null;
    mocks.analyticsOrder.length = 0;
    mocks.trackStudioOpened.mockReset();
    window.history.replaceState(null, "", "/studio");
  });

  it("records Studio entry before mounting a result-producing workspace", () => {
    render(<StudioPage />);

    expect(mocks.analyticsOrder.slice(0, 2)).toEqual(["studio", "feasibility"]);
    expect(mocks.trackStudioOpened).toHaveBeenCalledTimes(1);
  });

  it("runs the app onboarding for guests and members only inside the native app", () => {
    mocks.nativeApp = true;
    const { unmount } = render(<StudioPage />);
    expect(screen.getByText("App Onboarding Mock guest")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    unmount();

    mocks.authState.user = { uid: "user-1" };
    render(<StudioPage />);
    expect(screen.getByText("App Onboarding Mock member")).toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
  });

  it("keeps the app onboarding mounted while a later auth event resolves", () => {
    mocks.nativeApp = true;
    const { rerender } = render(<StudioPage />);
    const mountId = screen.getByTestId("onboarding-mount").textContent;

    mocks.authState.loading = true;
    rerender(<StudioPage />);
    mocks.authState.loading = false;
    rerender(<StudioPage />);

    expect(screen.getByTestId("onboarding-mount").textContent).toBe(mountId);
  });

  it("keeps an emailed study mounted through URL edits and sign-in token updates", () => {
    const token = "a".repeat(48);
    window.history.replaceState(null, "", `/studio?layout=${token}`);
    const { rerender } = render(<StudioPage />);
    const mountId = screen.getByTestId("emailed-mount").textContent;
    window.history.replaceState(null, "", `/studio?layout=${token}&width=24`);
    mocks.authState.loading = true;
    rerender(<StudioPage />);
    expect(screen.getByTestId("emailed-mount").textContent).toBe(mountId);
    mocks.authState.loading = false;
    mocks.authState.user = { uid: "user-1" };
    mocks.authState.profile = { role: "user" };
    rerender(<StudioPage />);
    expect(screen.getByTestId("emailed-mount").textContent).toBe(mountId);
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
  });

  it("opens homeowner onboarding for existing builders inside the native app", () => {
    mocks.nativeApp = true;
    mocks.authState.user = { uid: "builder-1" };
    mocks.authState.profile = { role: "builder" };
    render(<StudioPage />);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByText("App Onboarding Mock member")).toBeInTheDocument();
  });

  it("renders the exploratory studio for guests without redirecting", () => {
    render(<StudioPage />);

    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows the dawn arrival plate with the typical money band while auth resolves", () => {
    mocks.authState.loading = true;

    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    // Seam rule (DESIGN.md): a money-green figure must be visible on arrival —
    // never a bare "Loading studio..." spinner state.
    expect(screen.queryByText("Loading studio...")).not.toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.rentBand)).toBeInTheDocument();
    expect(screen.getByText(/typical supported markets/i)).toBeInTheDocument();
  });

  it("renders an empty address-first workspace for signed-in users", () => {
    mocks.authState.user = { uid: "user-1" };

    render(<StudioPage />);

    expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
  });

  it("opens the selected example for signed-in owners", () => {
    window.history.replaceState(null, "", "/studio?parcel=oak-street");
    mocks.authState.user = { uid: "user-1" };
    render(<StudioPage />);
    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
  });

  // demoChosen skips the mobile Find reveal; the URL restore must decide that,
  // so a default-scenario link still begins at Find.
  it.each([null, { uid: "user-1" }])("does not force the demo choice from a sample URL (user %o)", (user) => {
    window.history.replaceState(null, "", "/studio?parcel=oak-street&size=600&roof=flat");
    mocks.authState.user = user;
    render(<StudioPage />);
    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(screen.queryByText("Demo selected")).not.toBeInTheDocument();
  });

  it.each(["parcel=unknown", "size=600", "v=unsupported&parcel=oak-street"])(
    "keeps owner property entry for invalid or incomplete sample params: %s", (query) => {
      window.history.replaceState(null, "", `/studio?${query}`);
      mocks.authState.user = { uid: "user-1" };
      render(<StudioPage />);
      expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
    },
  );

  it.each(["address", "parcel"])("preserves a real %s handoff ahead of a sample URL", (kind) => {
    window.history.replaceState(null, "", "/studio?parcel=oak-street");
    mocks.authState.user = { uid: "user-1" };
    if (kind === "address") mocks.pendingAddress = "123 Main St";
    else mocks.pendingParcel = { address: "123 Main St" };
    const { rerender } = render(<StudioPage />);
    expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
    mocks.pendingAddress = null;
    mocks.pendingParcel = null;
    rerender(<StudioPage />);
    expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
  });

  it("keeps builder redirection ahead of an explicit example", () => {
    window.history.replaceState(null, "", "/studio?parcel=oak-street");
    mocks.authState.user = { uid: "builder-1" };
    mocks.authState.profile = { role: "builder" };
    render(<StudioPage />);
    expect(mocks.replace).toHaveBeenCalledWith("/builder");
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
  });

  it("keeps native onboarding ahead of web example routing", () => {
    mocks.nativeApp = true;
    window.history.replaceState(null, "", "/studio?parcel=oak-street");
    render(<StudioPage />);
    expect(screen.getByText("App Onboarding Mock guest")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
  });

  it("allows builders to view shared layout links without redirecting to /builder", () => {
    const token = "a".repeat(48);
    window.history.replaceState(null, "", `/studio?layout=${token}`);
    mocks.authState.user = { uid: "builder-1" };
    mocks.authState.profile = { role: "builder" };
    render(<StudioPage />);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByText(`Emailed layout ${token}`)).toBeInTheDocument();
  });

  it("classifies shared layout links as live parcel mode in analytics", () => {
    const token = "a".repeat(48);
    window.history.replaceState(null, "", `/studio?layout=${token}`);
    render(<StudioPage />);
    expect(mocks.trackStudioOpened).toHaveBeenCalledWith(
      expect.objectContaining({ parcel_mode: "live" }),
    );
  });
});
