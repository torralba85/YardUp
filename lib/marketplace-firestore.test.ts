import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "./feasibility";
import { buildConnectionSnapshot } from "./marketplace";
import type { OwnerContact } from "./marketplace-types";

/**
 * Records every Firestore write the adapter issues, with the document path and
 * payload, plus the call order so we can assert the root commits before the
 * batch (the rules depend on that ordering).
 */
const recorder = vi.hoisted(() => ({
  writes: [] as Array<{ path: string; data: Record<string, unknown>; via: "set" | "batch" }>,
  order: [] as string[],
  nextId: 0,
}));

vi.mock("./firebase", () => ({ db: {}, auth: { currentUser: null } }));

vi.mock("firebase/firestore", () => ({
  Timestamp: class {},
  serverTimestamp: () => "SERVER_TS",
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (...args: unknown[]) => {
    if (args.length === 1) {
      const ref = args[0] as { path: string };
      const id = `req-${++recorder.nextId}`;
      return { id, path: `${ref.path}/${id}` };
    }
    const segments = args.slice(1) as string[];
    return { id: segments[segments.length - 1], path: segments.join("/") };
  },
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    recorder.writes.push({ path: ref.path, data, via: "set" });
    recorder.order.push(`set:${ref.path}`);
  }),
  writeBatch: () => {
    const staged: Array<{ path: string; data: Record<string, unknown> }> = [];
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => {
        staged.push({ path: ref.path, data });
      },
      commit: vi.fn(async () => {
        for (const write of staged) {
          recorder.writes.push({ ...write, via: "batch" });
        }
        recorder.order.push("commit");
      }),
    };
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn(),
}));

import { getDocs } from "firebase/firestore";
import { createConnectionRequest, fetchBuilderLedger } from "./marketplace-firestore";

const contact: OwnerContact = {
  name: "Jane Owner",
  email: "jane@example.com",
  phone: "555-0100",
  message: "Looking for a local builder.",
};

const snapshot = buildConnectionSnapshot({
  parcelKey: "oak-street",
  parcel: parcelPresets[0],
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
  result: {
    aduSqft: 600,
    totalFootprint: 1980,
    allowedFootprint: 2000,
    remainingCapacity: 20,
    coveragePercent: 39.6,
    maxCoveragePercent: 40,
    zoningStatus: "Compliant",
    costLow: 218000,
    costHigh: 271000,
    costPerSqftLow: 363,
    costPerSqftHigh: 452,
    monthlyRent: 2080,
    annualNoi: 16605,
    paybackYears: 15.7,
    warnings: [],
    rentBasis: "Curated demo estimate",
    market: {
      source: "preset" as const,
      area: "Curated demo estimate",
      confidence: "medium" as const,
      verified: false,
    },
    operatingExpenseRatio: 0.325,
  },
});

describe("createConnectionRequest paywall split", () => {
  beforeEach(() => {
    recorder.writes = [];
    recorder.order = [];
    recorder.nextId = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function submit(snapshotOverride = snapshot) {
    await createConnectionRequest({
      ownerUid: "owner-1",
      ownerContact: contact,
      snapshot: snapshotOverride,
      matchedBuilderIds: ["builder-1", "builder-2"],
    });
    const root = recorder.writes.find((w) => w.path.match(/^connectionRequests\/[^/]+$/));
    const contactDoc = recorder.writes.find((w) => w.path.endsWith("/private/contact"));
    return { root, contactDoc };
  }

  it("writes a redacted root doc with no contact or street address", async () => {
    const { root } = await submit();

    expect(root).toBeDefined();
    expect(root!.data).toHaveProperty("preview");
    expect(root!.data).not.toHaveProperty("ownerContact");
    expect(root!.data).not.toHaveProperty("snapshot");

    const serialized = JSON.stringify(root!.data);
    expect(serialized).not.toContain(contact.email);
    expect(serialized).not.toContain(contact.name);
    expect(serialized).not.toContain(snapshot.parcelAddress);
    expect(serialized).not.toContain("advisorIntake");
    expect(serialized).not.toContain("studioScenarioJson");
  });

  it("isolates all PII in the gated private/contact subdoc", async () => {
    const { contactDoc } = await submit();

    expect(contactDoc).toBeDefined();
    expect(contactDoc!.data.ownerContact).toEqual(contact);
    expect(contactDoc!.data.streetAddress).toBe(snapshot.parcelAddress);
    expect(contactDoc!.data.snapshot).toBeDefined();
    expect(contactDoc!.data.snapshot).toMatchObject({ advisorIntake: snapshot.advisorIntake, studioScenarioJson: snapshot.studioScenarioJson });
  });

  it("strips provider-only GeoJSON before writing a live parcel snapshot", async () => {
    const liveSnapshot = {
      ...snapshot,
      parcel: {
        ...snapshot.parcel,
        source: "county-gis",
        boundaryGeoJson: {
          type: "Polygon",
          coordinates: [[[-122.31, 47.65], [-122.30, 47.65], [-122.31, 47.65]]],
        },
      },
    } as typeof snapshot;

    const { contactDoc } = await submit(liveSnapshot);
    const storedSnapshot = contactDoc!.data.snapshot as typeof snapshot;

    expect(storedSnapshot.parcel).not.toHaveProperty("boundaryGeoJson");
    expect(storedSnapshot.parcel).not.toHaveProperty("source");
    expect(storedSnapshot.parcel.address).toBe(snapshot.parcel.address);
  });

  it("commits the root before the batched subdocs (rules see committed state)", async () => {
    await submit();

    const rootIndex = recorder.order.findIndex((o) => o.startsWith("set:connectionRequests/"));
    const commitIndex = recorder.order.indexOf("commit");
    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(commitIndex).toBeGreaterThan(rootIndex);
  });

  it("stamps a random LF- preview serial, never the address", async () => {
    const { root } = await submit();
    const preview = root!.data.preview as { previewSerial: string };
    expect(preview.previewSerial).toMatch(/^LF-[A-Z0-9]+$/);
    expect(preview.previewSerial).not.toContain(snapshot.parcelAddress);
  });

  it("records ownerVerified from the verified email state instead of hardcoding true", async () => {
    const { root: unverifiedRoot } = await submit();
    expect(unverifiedRoot!.data.ownerVerified).toBe(false);

    recorder.writes = [];
    await createConnectionRequest({
      ownerUid: "owner-1",
      ownerContact: contact,
      snapshot,
      matchedBuilderIds: ["builder-1"],
      ownerVerified: true,
    });
    const verifiedRoot = recorder.writes.find((w) => w.path.match(/^connectionRequests\/[^/]+$/));
    expect(verifiedRoot!.data.ownerVerified).toBe(true);
  });
});

describe("fetchBuilderLedger", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("queries the builder ledger subcollection and maps entries correctly", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "entry-purchase",
          data: () => ({
            type: "purchase",
            creditsChange: 10,
            amountPaid: 300,
            referenceId: "cs_pack_10",
            description: "Purchased 10 Lead Credits",
            createdAt: "2026-09-11T12:00:00Z",
          }),
        },
        {
          id: "entry-unlock",
          data: () => ({
            type: "unlock",
            creditsChange: -1,
            amountPaid: 0,
            referenceId: "req-1",
            description: "Unlocked Lead req-1",
            createdAt: "2026-09-11T13:00:00Z",
          }),
        },
      ],
    } as unknown as Awaited<ReturnType<typeof getDocs>>);

    const entries = await fetchBuilderLedger("builder-1");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: "entry-purchase",
      builderId: "builder-1",
      type: "purchase",
      creditsChange: 10,
      amountPaid: 300,
      referenceId: "cs_pack_10",
      description: "Purchased 10 Lead Credits",
      createdAt: "2026-09-11T12:00:00Z",
    });
    expect(entries[1]).toEqual({
      id: "entry-unlock",
      builderId: "builder-1",
      type: "unlock",
      creditsChange: -1,
      amountPaid: 0,
      referenceId: "req-1",
      description: "Unlocked Lead req-1",
      createdAt: "2026-09-11T13:00:00Z",
    });
  });

  it("falls back to default values when fields are missing or unexpected", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "entry-minimal",
          data: () => ({}),
        },
      ],
    } as unknown as Awaited<ReturnType<typeof getDocs>>);

    const entries = await fetchBuilderLedger("builder-2");
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("entry-minimal");
    expect(entries[0].builderId).toBe("builder-2");
    expect(entries[0].type).toBe("purchase");
    expect(entries[0].creditsChange).toBe(0);
    expect(entries[0].amountPaid).toBe(0);
    expect(entries[0].referenceId).toBe("");
    expect(entries[0].description).toBe("");
    expect(entries[0].createdAt).toBeDefined();
  });
});

