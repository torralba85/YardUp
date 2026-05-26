import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn(),
  set: vi.fn(),
  now: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ doc: mocks.doc }),
  Timestamp: { now: mocks.now },
}));

import { saveQuoteRequest, deliverQuoteRequest } from "./quoteRequests";

describe("saveQuoteRequest", () => {
  const recordedAt = new Date("2026-05-25T12:00:00.000Z");
  const timestamp = { toDate: () => recordedAt };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.doc.mockReturnValue({ set: mocks.set });
    mocks.set.mockResolvedValue(undefined);
    mocks.now.mockReturnValue(timestamp);
  });

  it("does not create a delivered record without an authenticated user", async () => {
    await expect(
      saveQuoteRequest({
        projectId: "p1",
        contractorId: "c1",
        packetItems: ["ROI model"],
        homeownerConsent: true,
      }),
    ).rejects.toThrow("User ID is required");

    expect(mocks.doc).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("persists a consented submission without claiming builder delivery", async () => {
    const saved = await saveQuoteRequest({
      projectId: "p1",
      contractorId: "c1",
      packetItems: ["ROI model"],
      homeownerConsent: true,
      userId: "user-1",
    });

    expect(mocks.doc).toHaveBeenCalledWith("users/user-1/projects/p1/quoteRequests/quote-p1-c1");
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        homeownerConsent: true,
        status: "submitted",
        homeownerConsentAt: timestamp,
        commercialStatus: "not_eligible",
      }),
      { merge: true },
    );
    expect(saved).toEqual(
      expect.objectContaining({
        homeownerConsent: true,
        status: "submitted",
        homeownerConsentAt: recordedAt.toISOString(),
        commercialStatus: "not_eligible",
      }),
    );
    expect(saved).not.toHaveProperty("deliveredAt");
  });
});


describe("deliverQuoteRequest backend transition", () => {
  const recordedAt = new Date("2026-05-25T12:00:00.000Z");
  const timestamp = { toDate: () => recordedAt };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.doc.mockReturnValue({ set: mocks.set, get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        id: "quote-p1-apex-adu-builders",
        projectId: "p1",
        contractorId: "apex-adu-builders",
        packetItems: ["ROI model"],
        homeownerConsent: true,
        status: "submitted",
        homeownerConsentAt: timestamp,
        commercialStatus: "not_eligible",
      })
    }) });
    mocks.set.mockResolvedValue(undefined);
    mocks.now.mockReturnValue(timestamp);
  });

  it("transitions an existing quote to sent status and assigns builder fees based on tier", async () => {
    const delivered = await deliverQuoteRequest("user-123", "p1", "quote-p1-apex-adu-builders");

    expect(mocks.doc).toHaveBeenCalledWith("users/user-123/projects/p1/quoteRequests/quote-p1-apex-adu-builders");
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        commercialStatus: "eligible_for_builder_fee",
        introductionFee: 149,
        billingTier: "premium",
        deliveredAt: timestamp,
      }),
      { merge: true }
    );
    expect(delivered.status).toBe("sent");
    expect(delivered.commercialStatus).toBe("eligible_for_builder_fee");
    expect(delivered.introductionFee).toBe(149);
    expect(delivered.billingTier).toBe("premium");
    expect(delivered.deliveredAt).toBe(recordedAt.toISOString());
  });
});
