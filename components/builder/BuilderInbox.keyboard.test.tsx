import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuilderInbox from "./BuilderInbox";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";

vi.mock("@/lib/marketplace-firestore", () => ({
  fetchUnlockedContact: vi.fn(),
}));
vi.mock("@/lib/lead-unlock-api", () => ({
  startLeadUnlock: vi.fn(),
  leadUnlockPayLabel: (hasCredits: boolean) =>
    hasCredits ? "Unlock with 1 Credit" : "Pay with Stripe",
  leadUnlockSecureNote: () => "Secure checkout — Stripe",
}));
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

afterEach(() => {
  Reflect.deleteProperty(window, "getDigitalGoodsService");
});

describe("BuilderInbox table view keyboard access", () => {
  it("renders credit-pack prices from the shared web catalog", async () => {
    render(<BuilderInbox profile={profile} items={[item]} onRespond={vi.fn()} />);

    expect(await screen.findByText("$175")).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.getByText("$35 / lead")).toBeInTheDocument();
    expect(screen.getByText("$30 / lead")).toBeInTheDocument();
  });

  it("renders localized Google Play prices instead of the web catalog", async () => {
    Object.defineProperty(window, "getDigitalGoodsService", {
      configurable: true,
      value: vi.fn(async () => ({
        getDetails: vi.fn(async () => [
          {
            itemId: STORE_PRODUCTS.builder5.id,
            price: { value: "219.99", currency: "USD" },
          },
          {
            itemId: STORE_PRODUCTS.builder10.id,
            price: { value: "399.99", currency: "USD" },
          },
        ]),
      })),
    });

    render(<BuilderInbox profile={profile} items={[item]} onRespond={vi.fn()} />);

    expect(await screen.findByText("$219.99")).toBeInTheDocument();
    expect(screen.getByText("$399.99")).toBeInTheDocument();
    expect(screen.queryByText("$175")).not.toBeInTheDocument();
  });

  it("selects a ledger row with Enter and opens the detail panel", async () => {
    render(<BuilderInbox profile={profile} items={[item]} onRespond={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /table/i }));

    const row = screen.getByText("LF-AB12CD").closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(row!, { key: "Enter" });

    expect(
      screen.getByRole("heading", { name: /feasibility certificate locked/i }),
    ).toBeInTheDocument();
    expect(row).toHaveAttribute("aria-selected", "true");
  });
});
