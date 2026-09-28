import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuilderInbox from "./BuilderInbox";
import { writeConsent } from "@/lib/analytics/consent";
import * as events from "@/lib/analytics/events";
import * as leadTracking from "@/lib/analytics/lead-unlock-tracking";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";

const unlockApi = vi.hoisted(() => ({
  startLeadUnlock: vi.fn(),
  leadUnlockPayLabel: (hasCredits: boolean) =>
    hasCredits ? "Unlock with 1 Credit" : "Pay with Stripe",
  leadUnlockSecureNote: (hasCredits: boolean) =>
    hasCredits ? "Uses 1 credit" : "Secure checkout",
}));

const firestore = vi.hoisted(() => ({
  fetchUnlockedContact: vi.fn(),
}));

vi.mock("@/lib/lead-unlock-api", () => unlockApi);
vi.mock("@/lib/marketplace-firestore", () => firestore);
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { uid: "builder-1", getIdToken: async () => "token-123" } }),
}));

const profile: BuilderProfile = {
  id: "builder-1",
  ownerUid: "builder-1",
  companyName: "Seattle Builders",
  contactEmail: "seattle@example.com",
  phone: null,
  licenseNumber: null,
  serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
  active: true,
  credits: 0,
  createdAt: null,
  updatedAt: null,
};

const lockedLead: BuilderInboxItem = {
  request: {
    id: "req-1",
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
      buildBandLow: 250000,
      buildBandHigh: 300000,
      rentBand: 2200,
      paybackYears: 14.5,
      zoningStatus: "Compliant",
      matchReasons: ["Service area: Seattle, WA"],
      previewSerial: "LF-TEST01",
    },
    matchedBuilderIds: ["builder-1"],
    status: "submitted",
    ownerVerified: true,
    headStartUntil: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  response: {
    builderId: "builder-1",
    status: "new",
    createdAt: null,
    updatedAt: null,
  },
  unlocked: false,
};

describe("BuilderInbox analytics", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    leadTracking._resetLeadUnlockDedupeForTesting();
    writeConsent("granted");
    vi.clearAllMocks();
    firestore.fetchUnlockedContact.mockResolvedValue({
      ownerContact: { name: "Jane Doe", email: "jane@example.com", phone: null, message: null },
      streetAddress: "123 Main St",
      exactAPN: null,
      snapshot: { reportText: "Sample" },
    });
  });

  it("tracks builder_lead_preview_viewed when leads are rendered", async () => {
    const previewSpy = vi.spyOn(events, "trackBuilderLeadPreviewViewed");

    render(
      <BuilderInbox
        profile={profile}
        items={[lockedLead]}
        ledger={[]}
        onRespond={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(previewSpy).toHaveBeenCalledWith({
        triage_status: "new",
        access_status: "locked",
        project_value_bucket: "200000_299999",
        match_reason_count_bucket: "one",
      });
    });
  });

  it("tracks builder_unlock_checkout_started and records pending attempt on paid redirect", async () => {
    const checkoutStartedSpy = vi.spyOn(events, "trackBuilderUnlockCheckoutStarted");
    const pendingSpy = vi.spyOn(leadTracking, "recordPendingLeadUnlockAttempt");

    unlockApi.startLeadUnlock.mockResolvedValue({
      kind: "redirect",
      url: "https://checkout.stripe.com/test",
    });

    // Mock window.location.assign
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignMock, href: "http://localhost/builder" },
    });

    render(
      <BuilderInbox
        profile={profile}
        items={[lockedLead]}
        ledger={[]}
        onRespond={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Unlock lead/i }));
    await userEvent.click(screen.getByRole("button", { name: /Pay with Stripe/i }));

    expect(checkoutStartedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purchase_channel: "web_stripe",
      }),
    );
    expect(pendingSpy).toHaveBeenCalledWith({
      requestId: "req-1",
      triageStatus: "new",
    });
    expect(assignMock).toHaveBeenCalledWith("https://checkout.stripe.com/test");
  });

  it("tracks builder_lead_unlocked on demo grant in-place unlock", async () => {
    const unlockedSpy = vi.spyOn(events, "trackBuilderLeadUnlocked");

    unlockApi.startLeadUnlock.mockResolvedValue({
      kind: "granted",
      demo: true,
    });

    render(
      <BuilderInbox
        profile={profile}
        items={[lockedLead]}
        ledger={[]}
        onRespond={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Unlock lead/i }));
    await userEvent.click(screen.getByRole("button", { name: /Pay with Stripe/i }));

    await waitFor(() => {
      expect(unlockedSpy).toHaveBeenCalledWith({
        unlock_mode: "demo",
        triage_status: "new",
      });
    });
  });

  it("tracks builder_lead_unlocked on credit in-place unlock", async () => {
    const unlockedSpy = vi.spyOn(events, "trackBuilderLeadUnlocked");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ newCredits: 0 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BuilderInbox
        profile={{ ...profile, credits: 1 }}
        items={[lockedLead]}
        ledger={[]}
        onRespond={vi.fn()}
      />,
    );

    const openSlipBtn = screen.getByRole("button", { name: /Unlock with 1 Credit/i });
    await userEvent.click(openSlipBtn);

    const slipConfirmBtn = screen.getAllByRole("button", { name: /Unlock with 1 Credit/i });
    await userEvent.click(slipConfirmBtn[slipConfirmBtn.length - 1]);

    await waitFor(() => {
      expect(unlockedSpy).toHaveBeenCalledWith({
        unlock_mode: "credit",
        triage_status: "new",
      });
    });

    vi.unstubAllGlobals();
  });
});
