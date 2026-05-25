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

import { saveQuoteRequest } from "./quoteRequests";

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
