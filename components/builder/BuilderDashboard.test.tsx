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
  fetchUnlockedContact: vi.fn(),
}));

const unlockApi = vi.hoisted(() => ({ startLeadUnlock: vi.fn() }));

vi.mock("@/lib/marketplace-firestore", () => firestore);
vi.mock("@/lib/lead-unlock-api", () => unlockApi);
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { uid: "builder-1", getIdToken: async () => "tok" } }),
}));

const profile: BuilderProfile = {
  id: "builder-1",
  ownerUid: "builder-1",
  companyName: "Seattle ADU Works",
  contactEmail: "team@seattle.example",
  phone: null,
  licenseNumber: null,
  serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
  active: true,
  credits: 0,
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
  unlocked: false,
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

    // Redacted preview is visible: serial, neighborhood, locked contact.
    expect(await screen.findByText(/LF-AB12CD/)).toBeInTheDocument();
    expect(screen.getAllByText("Seattle, WA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/contact locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlock lead/i })).toBeInTheDocument();
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
    // The triage label now also reads "Interested" alongside the button.
    expect((await screen.findAllByText("Interested")).length).toBeGreaterThanOrEqual(2);
  });

  it("unlocks a lead via the demo grant and reveals the owner contact", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]);
    unlockApi.startLeadUnlock.mockResolvedValue({ kind: "granted", demo: true });
    firestore.fetchUnlockedContact.mockResolvedValue({
      ownerContact: { name: "Jane Owner", email: "jane@example.com", phone: "555-0100", message: null },
      streetAddress: "1234 Oak Street",
      exactAPN: null,
      snapshot: { reportText: "LotFoundry certificate" },
    });

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    await userEvent.click(await screen.findByRole("button", { name: /Unlock lead/i }));
    // The slip opens; confirm the purchase.
    await userEvent.click(await screen.findByRole("button", { name: /Pay with Stripe/i }));

    // Contact is revealed in place, stamped demo, with the street address.
    expect(await screen.findByText("Jane Owner")).toBeInTheDocument();
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/access recorded · demo/i)).toBeInTheDocument();
    expect(unlockApi.startLeadUnlock).toHaveBeenCalledWith("request-1", "tok");
  });

  it("renders the money band and triage tabs with counts", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]); // one NEW lead

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    expect(await screen.findByText("New leads")).toBeInTheDocument();
    expect(screen.getByText(/pipeline value/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All · 1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /New · 1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Archived · 0/ })).toBeInTheDocument();
  });

  it("filters to an empty archived tab without showing the new lead", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([item]);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    await userEvent.click(await screen.findByRole("tab", { name: /Archived · 0/ }));
    expect(screen.getByText(/nothing archived yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/LF-AB12CD/)).not.toBeInTheDocument();
  });

  it("shows the zero-ever empty state with an example card and no unlock CTA", async () => {
    firestore.fetchBuilderProfile.mockResolvedValue(profile);
    firestore.fetchBuilderInbox.mockResolvedValue([]);

    render(<BuilderDashboard uid="builder-1" email="builder@example.com" displayName="Builder" />);

    expect(await screen.findByText(/no matched leads yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Example lead")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unlock lead/i })).not.toBeInTheDocument();
  });
});
