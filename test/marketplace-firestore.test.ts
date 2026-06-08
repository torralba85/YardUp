import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FieldPath,
  getDoc,
  getDocs,
  DocumentSnapshot,
  QuerySnapshot,
  doc,
  writeBatch,
} from "firebase/firestore";
import {
  fetchBuilderInbox,
  updateBuilderResponse,
} from "../lib/marketplace-firestore";
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

  class MockFieldPath {
    segments: string[];

    constructor(...segments: string[]) {
      this.segments = segments;
    }
  }

  return { MockTimestamp, MockFieldPath };
});

vi.mock("firebase/firestore", async () => {
  return {
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    doc: vi.fn((_, ...segments: string[]) => ({ path: segments.join("/") })),
    writeBatch: vi.fn(),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
    Timestamp: mocks.MockTimestamp,
    FieldPath: mocks.MockFieldPath,
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

describe("updateBuilderResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the parent inline status through a nested builder-specific field path", async () => {
    const batch = {
      update: vi.fn(),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(writeBatch).mockReturnValue(batch as unknown as ReturnType<typeof writeBatch>);

    await updateBuilderResponse("request-1", "builder.with.dot", "interested");

    expect(batch.update).toHaveBeenCalledTimes(2);
    expect(batch.set).not.toHaveBeenCalled();

    expect(batch.update.mock.calls[0][0]).toEqual({
      path: "connectionRequests/request-1/builderResponses/builder.with.dot",
    });
    expect(batch.update.mock.calls[0][1]).toMatchObject({
      status: "interested",
      updatedAt: "SERVER_TIMESTAMP",
    });

    const parentUpdate = batch.update.mock.calls[1];
    expect(parentUpdate[0]).toEqual({ path: "connectionRequests/request-1" });
    expect(parentUpdate[1]).toBeInstanceOf(FieldPath);
    expect((parentUpdate[1] as unknown as { segments: string[] }).segments).toEqual([
      "builderResponseStatuses",
      "builder.with.dot",
    ]);
    expect(parentUpdate[2]).toBe("interested");
    expect(parentUpdate[3]).toBe("updatedAt");
    expect(parentUpdate[4]).toBe("SERVER_TIMESTAMP");
    expect(doc).toHaveBeenCalledWith(
      {},
      "connectionRequests",
      "request-1",
    );
  });
});
