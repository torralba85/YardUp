import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDoc, getDocs, DocumentSnapshot, QuerySnapshot } from "firebase/firestore";
import { fetchBuilderInbox } from "../lib/marketplace-firestore";
import type { BuilderResponseStatus } from "../lib/marketplace-types";

// Helper type to mock the document
interface MockDocument {
  id: string;
  data: () => {
    matchedBuilderIds: string[];
    createdAt: string;
    builderResponseStatuses?: Record<string, BuilderResponseStatus>;
  };
}

const mocks = vi.hoisted(() => {
  class MockTimestamp {
    static now() {
      return new MockTimestamp();
    }
    toDate() {
      return new Date();
    }
  }
  return { MockTimestamp };
});

vi.mock("firebase/firestore", async () => {
  return {
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    doc: vi.fn(),
    Timestamp: mocks.MockTimestamp,
  };
});

vi.mock("../lib/firebase", () => ({
  db: {},
}));

describe("fetchBuilderInbox Performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("baseline: fetches subcollections if builderResponseStatuses map is missing (N+1 queries)", async () => {
    const builderId = "builder-1";

    // Mock getDocs to return 3 connection requests missing the new map
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "req-1",
          data: () => ({ matchedBuilderIds: [builderId], createdAt: "2024-01-01T00:00:00.000Z" }),
        },
        {
          id: "req-2",
          data: () => ({ matchedBuilderIds: [builderId], createdAt: "2024-01-02T00:00:00.000Z" }),
        },
        {
          id: "req-3",
          data: () => ({ matchedBuilderIds: [builderId], createdAt: "2024-01-03T00:00:00.000Z" }),
        },
      ] as MockDocument[],
    } as unknown as QuerySnapshot);

    // Mock getDoc to return subcollection documents
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ builderId, status: "interested" }),
    } as unknown as DocumentSnapshot);

    await fetchBuilderInbox(builderId);

    // 1 getDocs call + 3 getDoc calls
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(getDoc).toHaveBeenCalledTimes(3);
  });

  it("optimized: uses inline builderResponseStatuses if available (0 getDoc calls)", async () => {
    const builderId = "builder-1";

    // Mock getDocs to return 3 connection requests with the new inline map
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "req-1",
          data: () => ({
            matchedBuilderIds: [builderId],
            builderResponseStatuses: { [builderId]: "interested" },
            createdAt: "2024-01-01T00:00:00.000Z"
          }),
        },
        {
          id: "req-2",
          data: () => ({
            matchedBuilderIds: [builderId],
            builderResponseStatuses: { [builderId]: "new" },
            createdAt: "2024-01-02T00:00:00.000Z"
          }),
        },
        {
          id: "req-3",
          data: () => ({
            matchedBuilderIds: [builderId],
            builderResponseStatuses: { [builderId]: "not-a-fit" },
            createdAt: "2024-01-03T00:00:00.000Z"
          }),
        },
      ] as MockDocument[],
    } as unknown as QuerySnapshot);

    await fetchBuilderInbox(builderId);

    // 1 getDocs call + 0 getDoc calls
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(getDoc).toHaveBeenCalledTimes(0);
  });

  it("mixed: correctly falls back to getDoc only for legacy documents", async () => {
    const builderId = "builder-1";

    // Mock getDocs to return 1 optimized, 2 legacy
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "req-opt",
          data: () => ({
            matchedBuilderIds: [builderId],
            builderResponseStatuses: { [builderId]: "interested" },
            createdAt: "2024-01-01T00:00:00.000Z"
          }),
        },
        {
          id: "req-leg-1",
          data: () => ({ matchedBuilderIds: [builderId], createdAt: "2024-01-02T00:00:00.000Z" }),
        },
        {
          id: "req-leg-2",
          data: () => ({ matchedBuilderIds: [builderId], createdAt: "2024-01-03T00:00:00.000Z" }),
        },
      ] as MockDocument[],
    } as unknown as QuerySnapshot);

    // Mock getDoc to return subcollection documents
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ builderId, status: "new" }),
    } as unknown as DocumentSnapshot);

    await fetchBuilderInbox(builderId);

    // 1 getDocs call + 2 getDoc calls
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(getDoc).toHaveBeenCalledTimes(2);
  });
});
