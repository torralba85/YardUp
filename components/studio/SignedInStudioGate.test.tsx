import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignedInStudioGate from "./SignedInStudioGate";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  consumeAddressQuery: vi.fn<() => string | null>(() => null),
  geocodeAddress: vi.fn(),
  fetchParcel: vi.fn(),
  stashInitialParcel: vi.fn(() => true),
}));

vi.mock("@/components/FeasibilityStudio", () => ({
  default: function MockFeasibilityStudio() {
    return <div>Real Parcel Studio</div>;
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ logout: mocks.logout }),
}));

vi.mock("@/lib/address-handoff", () => ({
  consumeAddressQuery: mocks.consumeAddressQuery,
}));

vi.mock("@/lib/geocode-api", () => ({
  GeocodeError: class GeocodeError extends Error {
    constructor(
      message: string,
      public readonly userMessage: string,
    ) {
      super(message);
    }
  },
  geocodeAddress: mocks.geocodeAddress,
}));

vi.mock("@/lib/parcel-api", () => ({
  ParcelFetchError: class ParcelFetchError extends Error {
    constructor(
      message: string,
      public readonly userMessage: string,
    ) {
      super(message);
    }
  },
  fetchParcel: mocks.fetchParcel,
}));

vi.mock("@/lib/parcel-handoff", () => ({
  stashInitialParcel: mocks.stashInitialParcel,
}));

vi.mock("./AddressSearch", () => ({
  default: function MockAddressSearch({
    onSubmitText,
  }: {
    onSubmitText: (query: string) => void;
  }) {
    return (
      <button type="button" onClick={() => onSubmitText("123 Main St")}>Search address</button>
    );
  },
}));

const user = {
  email: "owner@example.com",
  displayName: "Owner",
  getIdToken: vi.fn().mockResolvedValue("token"),
} as unknown as User;

const parcel = {
  address: "123 Main St",
  city: "San Diego, CA",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 15, rear: 4, side: 4 },
  zoning: "RS-1-7",
  boundaryGeoJson: null,
  lat: 32.7157,
  lng: -117.1611,
  source: "regrid" as const,
};

describe("SignedInStudioGate", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/studio");
    window.sessionStorage.clear();
    mocks.logout.mockClear();
    mocks.consumeAddressQuery.mockReset();
    mocks.consumeAddressQuery.mockReturnValue(null);
    mocks.geocodeAddress.mockReset();
    mocks.fetchParcel.mockReset();
    mocks.stashInitialParcel.mockReset();
    mocks.stashInitialParcel.mockReturnValue(true);
    vi.mocked(user.getIdToken).mockClear();
  });

  it("shows a true blank slate before any property is selected", () => {
    render(<SignedInStudioGate user={user} />);

    expect(screen.getByRole("heading", { name: "Start with your property." })).toBeInTheDocument();
    expect(screen.getByText("No property loaded")).toBeInTheDocument();
    expect(screen.queryByText("Real Parcel Studio")).not.toBeInTheDocument();
    expect(screen.queryByText(/Seattle|Austin|San Diego/i)).not.toBeInTheDocument();
  });

  it("mounts the studio only after a real parcel resolves", async () => {
    const clicker = userEvent.setup();
    mocks.geocodeAddress.mockResolvedValue({
      lat: parcel.lat,
      lng: parcel.lng,
      formattedAddress: parcel.address,
    });
    mocks.fetchParcel.mockResolvedValue(parcel);

    render(<SignedInStudioGate user={user} />);
    await clicker.click(screen.getByRole("button", { name: "Search address" }));

    expect(await screen.findByText("Real Parcel Studio")).toBeInTheDocument();
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("123 Main St", "token");
    expect(mocks.fetchParcel).toHaveBeenCalledWith(
      parcel.lat,
      parcel.lng,
      "token",
      parcel.address,
    );
    expect(mocks.stashInitialParcel).toHaveBeenCalledWith(parcel);
  });

  it("prefers an explicit ?q= URL address over a stale landing-page handoff", async () => {
    window.history.replaceState(null, "", "/studio?q=456+Oak+Ave");
    mocks.consumeAddressQuery.mockReturnValue("123 Main St");
    mocks.geocodeAddress.mockResolvedValue({
      lat: parcel.lat,
      lng: parcel.lng,
      formattedAddress: "456 Oak Ave",
    });
    mocks.fetchParcel.mockResolvedValue(parcel);

    render(<SignedInStudioGate user={user} />);

    expect(await screen.findByText("Real Parcel Studio")).toBeInTheDocument();
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("456 Oak Ave", "token");
  });
});
