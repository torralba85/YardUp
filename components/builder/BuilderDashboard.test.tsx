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
    preview: {
      neighborhood: "Seattle, WA",
      zip: "98115",
      state: "WA",
      lotSqft: 5000,
      config: {
        footprint: 600,
        width: 20,
        length: 30,
        height: 12,
        roof: "shed",
        finish: "cedar",
        includeOpenings: true,
      },
      aduSqft: 600,
      buildBandLow: 200000,
      buildBandHigh: 275000,
      rentBand: 2000,
      paybackYears: 15.7,
      zoningStatus: "Compliant",
      matchReasons: ["In your service area: Seattle, WA"],
      previewSerial: "LF-AB12CD",
    },
    matchedBuilderIds: ["builder-1"],
    status: "submitted",
    ownerVerified: true,
    headStartUntil: null,
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

  it("shows the redacted preview and keeps contact locked", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    // Redacted preview is visible: serial, neighborhood, banded values.
    expect(await screen.findByText("LF-AB12CD")).toBeInTheDocument();
    expect(screen.getAllByText("Seattle, WA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/contact & exact address locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Interested/i })).toBeInTheDocument();

    // PII the v1 card leaked must NOT be in the redacted payload's DOM.
    expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Owner")).not.toBeInTheDocument();
    expect(screen.queryByText(/jane@example\.com/)).not.toBeInTheDocument();
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
