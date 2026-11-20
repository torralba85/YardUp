import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_ADDRESS_KEY,
  RESOLVED_PARCEL_KEY,
  clearInitialParcel,
  consumeAddressQuery,
  hasPendingStudioHandoff,
  peekAddressQuery,
  peekInitialParcel,
  publishResolvedParcel,
  stageCertificateLinkHandoff,
  stashAddressQuery,
  stashInitialParcel,
  takeIncomingAddress,
  takeStudioEntry,
} from "./studio-handoff";
import type { LiveParcelData } from "./parcel-types";

const parcel: LiveParcelData = {
  address: "123 Main St",
  city: "San Diego, CA",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 15, rear: 4, side: 4 },
  zoning: "RS-1-7",
  boundaryGeoJson: null,
  lat: 32.7157,
  lng: -117.1611,
  source: "regrid",
  state: "CA",
  zip: "",
};

describe("studio-handoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearInitialParcel();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    clearInitialParcel();
  });

  it("preserves the legacy storage keys", () => {
    expect(PENDING_ADDRESS_KEY).toBe("lf:pending-address");
    expect(RESOLVED_PARCEL_KEY).toBe("lf:initial-live-parcel");
    stashAddressQuery("  1 A St ");
    stashInitialParcel(parcel);
    expect(window.sessionStorage.getItem("lf:pending-address")).toBe("1 A St");
    expect(window.sessionStorage.getItem("lf:initial-live-parcel")).toBe(JSON.stringify(parcel));
  });

  it("gives a pending address precedence at the gate without consuming the parcel", () => {
    expect(takeStudioEntry()).toEqual({ kind: "none" });
    expect(hasPendingStudioHandoff()).toBe(false);
    stashInitialParcel(parcel);
    expect(hasPendingStudioHandoff()).toBe(true);
    expect(takeStudioEntry()).toEqual({ kind: "parcel" });
    stashAddressQuery("1 A St");
    expect(takeStudioEntry()).toEqual({ kind: "address", address: "1 A St" });
    expect(peekAddressQuery()).toBeNull();
    expect(peekInitialParcel()).toEqual(parcel);
  });

  it("lets an explicit resolved selection supersede a stale address", () => {
    stashAddressQuery("stale address");
    expect(publishResolvedParcel(parcel)).toBe(true);
    expect(peekAddressQuery()).toBeNull();
    expect(takeStudioEntry()).toEqual({ kind: "parcel" });
  });

  it("never resurrects stale storage when writes fail", () => {
    const stale = { ...parcel, address: "stale" };
    stashInitialParcel(stale);
    stashAddressQuery("stale address");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    publishResolvedParcel(parcel);
    expect(peekInitialParcel()).toEqual(parcel);
    expect(peekAddressQuery()).toBeNull();
    stashAddressQuery("fresh");
    expect(peekAddressQuery()).toBe("fresh");
    expect(consumeAddressQuery()).toBe("fresh");
    expect(peekAddressQuery()).toBeNull();
  });
  it("consumes the address once and replays via the ?q fallback only when absent", () => {
    stashAddressQuery("1 A St");
    expect(takeIncomingAddress("?q=ignored")).toBe("1 A St");
    expect(peekAddressQuery()).toBeNull();
    expect(takeIncomingAddress("?q=%20from%20url ")).toBe("from url");
    expect(takeIncomingAddress(new URLSearchParams(""))).toBeNull();
    expect(consumeAddressQuery()).toBeNull();
  });

  it("keeps the parcel peekable (Strict Mode) until cleared, and survives storage failure", () => {
    stashInitialParcel(parcel);
    expect(peekInitialParcel()).toEqual(parcel);
    expect(peekInitialParcel()).toEqual(parcel);
    clearInitialParcel();
    expect(peekInitialParcel()).toBeNull();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(stashInitialParcel(parcel)).toBe(true);
    expect(peekInitialParcel()).toEqual(parcel);
  });

  it("ignores a malformed stored parcel", () => {
    window.sessionStorage.setItem(RESOLVED_PARCEL_KEY, JSON.stringify({ address: 1 }));
    expect(peekInitialParcel()).toBeNull();
  });

  describe("stageCertificateLinkHandoff", () => {
    it("stashes a live parcel and rolls it back to nothing", () => {
      const rollback = stageCertificateLinkHandoff({ parcel, parcelName: "x" });
      expect(peekInitialParcel()).toEqual(parcel);
      rollback();
      expect(peekInitialParcel()).toBeNull();
      expect(window.sessionStorage.getItem(RESOLVED_PARCEL_KEY)).toBeNull();
    });

    it("restores a previously pending parcel and address instead of clearing them", () => {
      const earlier = { ...parcel, address: "9 Old Rd" };
      stashInitialParcel(earlier);
      stashAddressQuery("9 Old Rd, SD");
      const rollbackParcel = stageCertificateLinkHandoff({ parcel, parcelName: "" });
      const rollbackAddress = stageCertificateLinkHandoff({
        parcel: { source: "estimated", address: "5 New Ave", city: "LA" },
        parcelName: "",
      });
      expect(peekAddressQuery()).toBe("5 New Ave, LA");
      rollbackAddress();
      rollbackParcel();
      expect(peekInitialParcel()).toEqual(earlier);
      expect(peekAddressQuery()).toBe("9 Old Rd, SD");
    });

    it("hands off an estimated parcel by address, preferring the parcel name", () => {
      const rollback = stageCertificateLinkHandoff({
        parcel: { source: "estimated", address: "5 New Ave", city: "LA" },
        parcelName: " 5 New Ave, Los Angeles, CA ",
      });
      expect(peekAddressQuery()).toBe("5 New Ave, Los Angeles, CA");
      expect(peekInitialParcel()).toBeNull();
      rollback();
      expect(peekAddressQuery()).toBeNull();
    });

    it("restores a prior address after a cancelled live staging, but keeps a newer address", () => {
      stashAddressQuery("9 Old Rd");
      const cancelled = stageCertificateLinkHandoff({ parcel, parcelName: "" });
      expect(peekAddressQuery()).toBeNull();
      cancelled();
      expect(peekAddressQuery()).toBe("9 Old Rd");
      expect(peekInitialParcel()).toBeNull();

      const rollback = stageCertificateLinkHandoff({ parcel, parcelName: "" });
      stashAddressQuery("newer typed");
      rollback();
      expect(peekAddressQuery()).toBe("newer typed");
      expect(peekInitialParcel()).toBeNull();
    });

    it("stages nothing for demo presets", () => {
      const rollback = stageCertificateLinkHandoff({ parcel: { id: "seattle" }, parcelName: "Seattle" });
      expect(hasPendingStudioHandoff()).toBe(false);
      rollback();
    });

    it("does not clobber a newer handoff when rolled back late, and is idempotent", () => {
      const rollback = stageCertificateLinkHandoff({ parcel, parcelName: "" });
      const newer = { ...parcel, address: "77 Newer Ln" };
      stashInitialParcel(newer);
      rollback();
      rollback();
      expect(peekInitialParcel()).toEqual(newer);
    });
  });
});
