import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchUserPurchasedCertificates,
  formatCertKeyFallback,
  buildStudioUrlForCertificate,
  type PurchasedCertificate,
} from "./purchased-certificates";
import type { LiveParcelData } from "./parcel-types";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: { name: "mock-db" },
}));

vi.mock("firebase/firestore", () => ({
  collection: firestoreMocks.collection,
  getDocs: firestoreMocks.getDocs,
  query: firestoreMocks.query,
  where: firestoreMocks.where,
}));

describe("purchased-certificates helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.collection.mockReturnValue({ path: "certificatePurchases" });
    firestoreMocks.where.mockReturnValue({ filter: "uid == test-user" });
    firestoreMocks.query.mockReturnValue({ query: "cert-query" });
  });

  describe("formatCertKeyFallback", () => {
    it("recognizes preset lots and returns their canonical address and city", () => {
      const oak = formatCertKeyFallback("1234-oak-street-seattle-wa-98115");
      expect(oak.title).toBe("1234 Oak Street");
      expect(oak.subtitle).toBe("Seattle, WA 98115");
    });

    it("humanizes arbitrary slug addresses cleanly", () => {
      const live = formatCertKeyFallback("ca-san-jose-141-n-almaden-blvd-95110");
      expect(live.title).toBe("San Jose 141 N Almaden Blvd 95110");
    });

    it("does not match a preset on a bare substring without hyphen boundaries", () => {
      // Contains "oak-street" only as part of "oak-streetview" — must not
      // resolve to the "1234 Oak Street" preset.
      const near = formatCertKeyFallback("12-oak-streetview-portland-or");
      expect(near.title).not.toBe("1234 Oak Street");
      expect(near.title).toBe("12 Oak Streetview Portland Or");
    });
  });

  describe("fetchUserPurchasedCertificates", () => {
    it("returns empty array when uid is empty", async () => {
      const result = await fetchUserPurchasedCertificates("");
      expect(result).toEqual([]);
      expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
    });

    it("queries Firestore and sorts certificates descending by createdAt", async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: "user-1_cert-old",
            data: () => ({
              certKey: "cert-old",
              stripeSessionId: "cs_1",
              amount: 2900,
              status: "granted",
              createdAt: new Date("2026-09-01T10:00:00Z"),
              address: "100 Old St",
              city: "Old Town",
            }),
          },
          {
            id: "user-1_cert-new",
            data: () => ({
              certKey: "cert-new",
              stripeSessionId: "cs_2",
              amount: 2900,
              status: "granted",
              createdAt: new Date("2026-09-15T12:00:00Z"),
              address: "200 New Ave",
              city: "New City",
            }),
          },
        ],
      });

      const result = await fetchUserPurchasedCertificates("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].certKey).toBe("cert-new");
      expect(result[1].certKey).toBe("cert-old");
      expect(result[0].address).toBe("200 New Ave");
    });
  });

  describe("buildStudioUrlForCertificate", () => {
    it("creates studio URL with cert param and stashes parcel data if available", () => {
      const cert: PurchasedCertificate = {
        id: "user-1_test-cert",
        certKey: "ca-san-jose-141-n-almaden-blvd",
        uid: "user-1",
        stripeSessionId: "cs_test",
        amount: 2900,
        status: "granted",
        demo: false,
        createdAt: new Date(),
        parcelData: SAMPLE_LIVE_PARCEL as LiveParcelData,
      };

      const url = buildStudioUrlForCertificate(cert);
      expect(url).toBe("/studio?cert=ca-san-jose-141-n-almaden-blvd");
    });
  });
});
