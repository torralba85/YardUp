import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuilderDashboard from "./BuilderDashboard";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";

const firestore = vi.hoisted(() => ({
  fetchBuilderInbox: vi.fn(),
  fetchBuilderProfile: vi.fn(),
  saveBuilderProfile: vi.fn(),
  updateBuilderResponse: vi.fn(),
}));

vi.mock("@/lib/marketplace-firestore", () => firestore);

const profile: BuilderProfile = {
  id: "builder-1",
  ownerUid: "builder-1",
  companyName: "Seattle ADU Works",
  contactEmail: "team@seattle.example",
  phone: null,
  licenseNumber: null,
  serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
  active: true,
  createdAt: null,
  updatedAt: null,
};

const item: BuilderInboxItem = {
  request: {
    id: "request-1",
    ownerUid: "owner-1",
    ownerContact: {
      name: "Jane Owner",
      email: "jane@example.com",
      phone: "555-0100",
      message: "Looking for a local builder.",
    },
    snapshot: {
      parcel: {
        address: "1234 Oak Street",
        city: "Seattle, WA 98115",
        lotArea: 5000,
        lotWidth: 40,
        lotLength: 125,
        existingHouseSqft: 1380,
        maxLotCoveragePercent: 40,
        setbacks: { front: 20, rear: 25, side: 5 },
      },
      parcelKey: "oak-street",
      parcelAddress: "1234 Oak Street",
      parcelCity: "Seattle",
      parcelState: "WA",
      config: {
        footprint: 600,
        width: 20,
        length: 30,
        height: 12,
        roof: "shed",
        finish: "cedar",
        includeOpenings: true,
      },
      assumptions: {
        costPerSqft: { cedar: 340, lap: 315, stucco: 330, board: 355 },
        softCostMultiplier: 1.18,
        operatingExpenseRatio: 0.325,
        rentScenario: "conservative",
      },
      result: {
        aduSqft: 600,
        totalFootprint: 1980,
        allowedFootprint: 2000,
        remainingCapacity: 20,
        coveragePercent: 39.6,
        maxCoveragePercent: 40,
        zoningStatus: "Compliant",
        costLow: 220000,
        costHigh: 270000,
        costPerSqftLow: 367,
        costPerSqftHigh: 450,
        monthlyRent: 2050,
        annualNoi: 16605,
        paybackYears: 15.7,
        warnings: [],
      },
      reportText: "LotFoundry report",
    },
    matchedBuilderIds: ["builder-1"],
    status: "submitted",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z",
  },
  response: {
    builderId: "builder-1",
    status: "new",
    createdAt: null,
    updatedAt: null,
  },
};

describe("BuilderDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the builder profile form when no profile exists", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(null);
    firestore.fetchBuilderInbox.mockResolvedValue([]);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    expect(await screen.findByRole("heading", { name: "Builder profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save builder profile/i })).toBeInTheDocument();
  });

  it("shows matched requests when a profile exists", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    expect(await screen.findByText("1234 Oak Street")).toBeInTheDocument();
    expect(screen.getByText("Jane Owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Interested/i })).toBeInTheDocument();
  });

  it("updates a request response to interested", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]);
    firestore.updateBuilderResponse.mockResolvedValue(undefined);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    await userEvent.click(await screen.findByRole("button", { name: /Interested/i }));

    expect(firestore.updateBuilderResponse).toHaveBeenCalledWith(
      "request-1",
      "builder-1",
      "interested",
    );
    expect(await screen.findByText("Status: Interested")).toBeInTheDocument();
  });
});
