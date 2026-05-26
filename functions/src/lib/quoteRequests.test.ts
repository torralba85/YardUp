import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn(),
  set: vi.fn(),
  now: vi.fn(),
  collectionGroup: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ doc: mocks.doc, collectionGroup: mocks.collectionGroup }),
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

    expect(mocks.doc).toHaveBeenCalledWith("users/user-1/projects/p1/quoteRequests/quote-user-1-p1-c1");
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

  // Helper that wires the collectionGroup query chain mock and returns the
  // ref that the implementation should call .set() on. Keeps each test honest
  // about what shape it's matching against without copying the chain four
  // times.
  function mockCollectionGroup(data: Record<string, unknown>): { ref: { set: typeof mocks.set } } {
    const ref = { set: mocks.set };
    const docSnap = { ref, data: () => data };
    const limit = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ empty: false, docs: [docSnap] }),
    });
    const where2 = vi.fn().mockReturnValue({ limit });
    const where1 = vi.fn().mockReturnValue({ where: where2 });
    mocks.collectionGroup.mockReturnValue({ where: where1 });
    return { ref };
  }

  function mockEmptyCollectionGroup(): void {
    const limit = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    const where2 = vi.fn().mockReturnValue({ limit });
    const where1 = vi.fn().mockReturnValue({ where: where2 });
    mocks.collectionGroup.mockReturnValue({ where: where1 });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.set.mockResolvedValue(undefined);
    mocks.now.mockReturnValue(timestamp);
  });

  it("transitions an existing quote to sent status and assigns builder fees based on tier", async () => {
    mockCollectionGroup({
      id: "quote-p1-apex-adu-builders",
      projectId: "p1",
      contractorId: "apex-adu-builders",
      packetItems: ["ROI model"],
      homeownerConsent: true,
      status: "submitted",
      homeownerConsentAt: timestamp,
      commercialStatus: "not_eligible",
    });

    const delivered = await deliverQuoteRequest(
      "builder-user-123",
      "apex-adu-builders",
      "p1",
      "quote-p1-apex-adu-builders",
    );

    expect(mocks.collectionGroup).toHaveBeenCalledWith("quoteRequests");
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        commercialStatus: "eligible_for_builder_fee",
        introductionFee: 149,
        billingTier: "premium",
        deliveredAt: timestamp,
        deliveredByBuilderUid: "builder-user-123",
      }),
      { merge: true },
    );
    expect(delivered.status).toBe("sent");
    expect(delivered.commercialStatus).toBe("eligible_for_builder_fee");
    expect(delivered.introductionFee).toBe(149);
    expect(delivered.billingTier).toBe("premium");
    expect(delivered.deliveredAt).toBe(recordedAt.toISOString());
    expect(delivered.deliveredByBuilderUid).toBe("builder-user-123");
  });

  it("refuses delivery when the caller's builderId does not match the quote", async () => {
    mockCollectionGroup({
      id: "quote-p1-apex-adu-builders",
      projectId: "p1",
      contractorId: "apex-adu-builders",
      packetItems: ["ROI model"],
      homeownerConsent: true,
      status: "submitted",
      homeownerConsentAt: timestamp,
      commercialStatus: "not_eligible",
    });

    await expect(
      deliverQuoteRequest("builder-user-123", "wrong-builder-id", "p1", "quote-p1-apex-adu-builders"),
    ).rejects.toThrow(/not the builder/i);

    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("throws when the quote is not found", async () => {
    mockEmptyCollectionGroup();

    await expect(
      deliverQuoteRequest("builder-user-123", "apex-adu-builders", "p1", "missing"),
    ).rejects.toThrow(/not found/i);

    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("rejects re-delivery of an already delivered quote", async () => {
    mockCollectionGroup({
      id: "quote-p1-apex-adu-builders",
      projectId: "p1",
      contractorId: "apex-adu-builders",
      packetItems: ["ROI model"],
      homeownerConsent: true,
      status: "sent",
      homeownerConsentAt: timestamp,
      commercialStatus: "eligible_for_builder_fee",
      introductionFee: 149,
    });

    await expect(
      deliverQuoteRequest("builder-user-123", "apex-adu-builders", "p1", "quote-p1-apex-adu-builders"),
    ).rejects.toThrow(/already been delivered/i);

    expect(mocks.set).not.toHaveBeenCalled();
  });
});
