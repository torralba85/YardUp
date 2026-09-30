import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveParcelData } from "@/lib/parcel-types";
import AppStudioOnboarding, { APP_GUIDE_SEEN_KEY } from "./AppStudioOnboarding";

const mocks = vi.hoisted(() => ({
  authState: { user: null as User | null },
  geocodeAddress: vi.fn(),
  fetchParcel: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.authState }));
vi.mock("@/lib/geocode-api", async () => ({
  ...await vi.importActual<typeof import("@/lib/geocode-api")>("@/lib/geocode-api"),
  geocodeAddress: mocks.geocodeAddress,
}));
vi.mock("@/lib/parcel-api", async () => ({
  ...await vi.importActual<typeof import("@/lib/parcel-api")>("@/lib/parcel-api"),
  fetchParcel: mocks.fetchParcel,
}));

// Keep the real provider at the onboarding seam: a type swap here destroys
// both its queued lookup ref and the Studio's unsaved design state.
vi.mock("@/components/FeasibilityStudio", async () => {
  const { useState } = await import("react");
  const { ParcelProvider, useParcel } = await import("@/lib/parcel-context");
  const { parcelPresets } = await import("@/lib/feasibility");

  function GuestWorkspace() {
    const { parcel, authRequired, searchByAddress, searchParcel } = useParcel();
    const [design, setDesign] = useState("");
    return (
      <div>
        Guest Studio Mock
        <input aria-label="Unsaved study" value={design} onChange={(event) => setDesign(event.target.value)} />
        <p>{parcel.address}</p>
        {authRequired && <p>Account required for queued lookup</p>}
        <button type="button" onClick={() => void searchByAddress("100 Main St")}>First lookup</button>
        <button type="button" onClick={() => void searchByAddress("200 Oak St")}>Another address</button>
        <button type="button" onClick={() => void searchParcel(34.06, -118.26, "200 Oak St")}>Another coordinate</button>
      </div>
    );
  }

  return {
    default: function MockFeasibilityStudio({ demoChosen }: { demoChosen?: boolean }) {
      if (demoChosen) return <div>Demo Studio Mock chosen {window.location.search}</div>;
      return <ParcelProvider initialPreset={parcelPresets[0]}><GuestWorkspace /></ParcelProvider>;
    },
  };
});

vi.mock("./SignedInStudioGate", () => ({
  default: function MockSignedInStudioGate() {
    return <div>Address Workspace Mock</div>;
  },
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: function MockAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: (reason: "signed-in" | "dismissed") => void }) {
    if (!isOpen) return null;
    return (
      <div role="dialog">
        <button type="button" onClick={() => onClose("dismissed")}>Dismiss</button>
        <button type="button" onClick={() => onClose("signed-in")}>Finish sign-in</button>
      </div>
    );
  },
}));

const member = { uid: "owner-1", getIdToken: async () => "member-token" } as User;
const liveParcel: LiveParcelData = {
  address: "100 Main St",
  city: "Los Angeles, CA 90012",
  lotArea: 5000,
  lotWidth: 40,
  lotLength: 125,
  existingHouseSqft: 1200,
  maxLotCoveragePercent: 40,
  setbacks: { front: 20, rear: 20, side: 5 },
  zoning: "R-1 (estimated)",
  boundaryGeoJson: null,
  lat: 34.05,
  lng: -118.25,
  source: "fallback",
  state: "CA",
  zip: "90012",
};

function goBack() {
  act(() => {
    window.history.back();
  });
}

describe("AppStudioOnboarding", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/studio");
    window.localStorage.clear();
    mocks.authState.user = null;
    mocks.geocodeAddress.mockReset().mockResolvedValue({ lat: 34.05, lng: -118.25, formattedAddress: "100 Main St" });
    mocks.fetchParcel.mockReset().mockResolvedValue(liveParcel);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens the guest address workspace through the guide without sign-in", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    expect(screen.getByRole("heading", { name: "A little more room for life." })).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    expect(screen.getByRole("heading", { name: "How the Studio works." })).toHaveFocus();
    expect(screen.getByText("Find your lot")).toBeInTheDocument();

    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(APP_GUIDE_SEEN_KEY)).toBe("1");
  });

  it("opens a demo city without an account and starts past the find step", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    expect(screen.getByText("Start in Portland, OR")).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));

    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a shared design for the same demo lot", async () => {
    const clicker = userEvent.setup();
    window.history.replaceState(null, "", "/studio?parcel=corner-lot&size=800");
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot&size=800")).toBeInTheDocument();
  });

  it("steps back through the screens with the history back gesture", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Austin, TX/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText(/Demo Studio Mock/)).toBeInTheDocument();

    goBack();
    expect(await screen.findByTestId("app-guide")).toBeInTheDocument();
    goBack();
    expect(await screen.findByTestId("app-welcome")).toBeInTheDocument();
  });

  it("restores the screen and demo city when it remounts mid-flow", async () => {
    const clicker = userEvent.setup();
    const first = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    first.unmount();

    const second = render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Start in Portland, OR")).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    second.unmount();

    render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot")).toBeInTheDocument();
    goBack();
    expect(await screen.findByText("Start in Portland, OR")).toBeInTheDocument();
  });

  it("sends returning members straight to the workspace once they have read the guide", () => {
    const { unmount } = render(<AppStudioOnboarding user={member} />);
    expect(screen.getByTestId("app-guide")).toBeInTheDocument();
    unmount();

    // A later launch starts on a fresh history entry.
    window.history.replaceState(null, "", "/studio");
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
    render(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();
  });

  it("never shows the private workspace after the member signs out", () => {
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
    const { rerender } = render(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();

    rerender(<AppStudioOnboarding user={null} />);
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
  });

  it("preserves guest property entry on remount and Back without storing an address", async () => {
    const clicker = userEvent.setup();
    const first = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    first.unmount();
    render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.history.state.lfAppOnboardingStep).toBe("studio");
    goBack();
    expect(await screen.findByTestId("app-guide")).toBeInTheDocument();
    goBack();
    expect(await screen.findByTestId("app-welcome")).toBeInTheDocument();
  });

  it("keeps the signed-in property entry on the authenticated gate", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={member} />);
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();
    expect(screen.queryByText("Guest Studio Mock")).not.toBeInTheDocument();
  });

  it("keeps the active guest study mounted when signing in without a queued lookup", async () => {
    const clicker = userEvent.setup();
    const { rerender } = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    const study = screen.getByRole("textbox", { name: "Unsaved study" });
    await clicker.type(study, "400 sf flat roof");

    mocks.authState.user = member;
    rerender(<AppStudioOnboarding user={member} />);
    expect(screen.getByRole("textbox", { name: "Unsaved study" })).toBe(study);
    expect(study).toHaveValue("400 sf flat roof");
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
  });

  it.each(["Another address", "Another coordinate"])("retains the guest study and replays %s once after auth", async (nextLookup) => {
    const clicker = userEvent.setup();
    const { rerender } = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    await clicker.click(screen.getByRole("button", { name: "First lookup" }));
    expect(await screen.findByText("100 Main St")).toBeInTheDocument();
    const study = screen.getByRole("textbox", { name: "Unsaved study" });
    await clicker.type(study, "400 sf flat roof");
    mocks.geocodeAddress.mockClear().mockResolvedValue({ lat: 34.06, lng: -118.26, formattedAddress: "200 Oak St" });
    mocks.fetchParcel.mockClear().mockResolvedValue({ ...liveParcel, address: "200 Oak St", lat: 34.06, lng: -118.26 });

    await clicker.click(screen.getByRole("button", { name: nextLookup }));
    expect(screen.getByText("Account required for queued lookup")).toBeInTheDocument();
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    expect(mocks.fetchParcel).not.toHaveBeenCalled();
    expect(screen.getByText("100 Main St")).toBeInTheDocument();

    mocks.authState.user = member;
    rerender(<AppStudioOnboarding user={member} />);
    expect(screen.getByRole("textbox", { name: "Unsaved study" })).toBe(study);
    expect(study).toHaveValue("400 sf flat roof");
    expect(await screen.findByText("200 Oak St")).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchParcel).toHaveBeenCalledExactlyOnceWith(34.06, -118.26, "member-token", "200 Oak St"));
    if (nextLookup === "Another address") {
      expect(mocks.geocodeAddress).toHaveBeenCalledExactlyOnceWith("200 Oak St", "member-token");
    } else {
      expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    }
    expect(screen.queryByText("Account required for queued lookup")).not.toBeInTheDocument();
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();

    rerender(<AppStudioOnboarding user={{ ...member } as User} />);
    expect(mocks.fetchParcel).toHaveBeenCalledTimes(1);
  });

  it("uses the private gate when sign-in happens before the property Studio opens", async () => {
    const clicker = userEvent.setup();
    const { rerender } = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    mocks.authState.user = member;
    rerender(<AppStudioOnboarding user={member} />);
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();
    expect(screen.queryByText("Guest Studio Mock")).not.toBeInTheDocument();
  });

  it("starts a fresh guest workspace on private sign-out and keeps it through reauthentication", async () => {
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
    mocks.authState.user = member;
    const { rerender } = render(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();

    mocks.authState.user = null;
    rerender(<AppStudioOnboarding user={null} />);
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
    const study = screen.getByRole("textbox", { name: "Unsaved study" });
    expect(study).toHaveValue("");
    await userEvent.setup().type(study, "Fresh guest design");

    mocks.authState.user = member;
    rerender(<AppStudioOnboarding user={member} />);
    expect(screen.getByRole("textbox", { name: "Unsaved study" })).toBe(study);
    expect(study).toHaveValue("Fresh guest design");
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
  });
});
