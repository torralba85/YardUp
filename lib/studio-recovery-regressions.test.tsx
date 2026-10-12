import { act, renderHook } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCertificateRecovery } from "./certificate-recovery";
import { ParcelProvider, useParcel } from "./parcel-context";
import { parcelPresets } from "./feasibility";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { clearInitialParcel } from "./parcel-handoff";
import { certificateKey } from "./certificate-key";
import type { LiveParcelData } from "./parcel-types";

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(), acquire: vi.fn(),
  auth: { user: null as null | { uid: string; getIdToken: () => Promise<string> } },
}));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("./live-parcel-acquisition", () => ({ acquireLiveParcel: mocks.acquire }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, _collection: string, id: string) => id,
  getDoc: mocks.getDoc,
}));
const wrapper = ({ children }: { children: ReactNode }) => (
  <ParcelProvider initialPreset={parcelPresets[0]}>{children}</ParcelProvider>
);
describe("Studio recovery state transitions", () => {
  beforeEach(() => {
    mocks.getDoc.mockReset(); mocks.acquire.mockReset(); mocks.auth.user = null;
    window.localStorage.clear(); window.sessionStorage.clear(); clearInitialParcel();
    window.history.replaceState(null, "", "/studio?cert=old-lot&checkout=returned");
  });
  afterEach(() => { vi.useRealTimers(); });

  it("does not overwrite a lookup started before auth readiness completes", async () => {
    mocks.auth.user = { uid: "owner", getIdToken: async () => "test-token" };
    let finishLookup!: (value: LiveParcelData) => void;
    mocks.acquire.mockImplementation(() => new Promise((resolve) => { finishLookup = resolve; }));
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({
      uid: "owner", parcelData: SAMPLE_LIVE_PARCEL,
    }) });
    const restore = vi.fn();
    const { result, rerender } = renderHook(({ ready }) => {
      const parcel = useParcel();
      const recovery = useCertificateRecovery({
        uid: mocks.auth.user?.uid, certKey: certificateKey(parcel.parcel), ready,
        selectionVersion: parcel.selectionVersion,
        onRestore: (grant, version) => {
          restore(grant, version);
          if (grant.parcelData) parcel.restoreLiveParcel(grant.parcelData, version);
        },
      });
      return { parcel, recovery };
    }, { wrapper, initialProps: { ready: false } });
    let lookup!: Promise<void>;
    act(() => { lookup = result.current.parcel.searchByAddress("200 New Street"); });
    expect(result.current.parcel.selectionVersion).toBe(1);
    await act(async () => { rerender({ ready: true }); });
    await act(async () => { finishLookup({ ...SAMPLE_LIVE_PARCEL, address: "200 New Street" }); await lookup; });
    expect(result.current.parcel.parcel.address).toBe("200 New Street");
    expect(restore).not.toHaveBeenCalled();
    expect(result.current.recovery.intent).toBeNull();
  });

  it("keeps a new-account lookup started by a child effect", async () => {
    window.history.replaceState(null, "", "/studio");
    mocks.acquire.mockResolvedValue(SAMPLE_LIVE_PARCEL);
    const { result, rerender } = renderHook(() => {
      const parcel = useParcel();
      const { searchByAddress } = parcel;
      useEffect(() => {
        if (mocks.auth.user) void searchByAddress("200 New Street");
      }, [searchByAddress]);
      return parcel;
    }, { wrapper });
    mocks.auth.user = { uid: "owner", getIdToken: async () => "test-token" };
    await act(async () => { rerender(); });
    expect(mocks.acquire).toHaveBeenCalled();
    expect(result.current.parcelMode).toBe("live");
  });

  it("consumes one Checkout cancellation across parcel changes and panel remounts", async () => {
    window.history.replaceState(null, "", "/studio?checkout=cancelled");
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    const { result, rerender } = renderHook(({ certKey }) => useCertificateRecovery({
      uid: "owner", certKey, ready: true,
    }), { initialProps: { certKey: "lot-a" } });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.consumeCancellation()).toBe(true);
    await act(async () => { rerender({ certKey: "lot-b" }); });
    expect(result.current.consumeCancellation()).toBe(false);
  });
});
