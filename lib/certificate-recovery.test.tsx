import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { certificateGrantSearchQuery, useCertificateRecovery } from "./certificate-recovery";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { certificateKey } from "./certificate-key";

const mocks = vi.hoisted(() => ({ getDoc: vi.fn() }));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, _collection: string, id: string) => id,
  getDoc: mocks.getDoc,
}));

describe("Certificate Recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getDoc.mockReset();
    window.history.replaceState({ retained: true }, "", "/studio?cert=lot-a&checkout=returned");
  });
  afterEach(() => { vi.useRealTimers(); });

  it("waits for auth, retries a missing Grant denial, and unlocks only the verified Grant", async () => {
    mocks.getDoc
      .mockRejectedValueOnce({ code: "permission-denied" })
      .mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner", analyticsOrderId: "opaque-order", amount: 2900 }) });
    const { result, rerender } = renderHook(
      ({ uid, ready }) => useCertificateRecovery({ uid, certKey: "lot-a", ready }),
      { initialProps: { uid: null as string | null, ready: false } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(mocks.getDoc).not.toHaveBeenCalled();
    rerender({ uid: "owner", ready: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.status).toBe("checking");
    expect(result.current.access.purchased).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(result.current.access).toMatchObject({ purchased: true, analyticsOrderId: "opaque-order", amount: 2900 });
    expect(result.current.intent?.kind).toBe("checkout");
    expect(window.location.search).toBe("");
    expect(window.history.state).toEqual({ retained: true });
  });

  it("keeps access unverified after 30 seconds and can check again without starting Checkout", async () => {
    mocks.getDoc.mockRejectedValue({ code: "permission-denied" });
    const { result } = renderHook(() => useCertificateRecovery({ uid: "owner", certKey: "lot-a", ready: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(result.current.status).toBe("unverified");
    expect(result.current.access.purchased).toBe(false);
    const readsAtDeadline = mocks.getDoc.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(mocks.getDoc).toHaveBeenCalledTimes(readsAtDeadline);
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner" }) });
    await act(async () => { result.current.retry(); });
    expect(result.current.access.purchased).toBe(true);
  });

  it("binds selection after URL hydration while still waiting for authentication", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner" }) });
    const { result, rerender } = renderHook(
      ({ activeKey, selectionVersion, hydrated, ready }) => useCertificateRecovery({
        uid: "owner", certKey: activeKey, selectionVersion, hydrated, ready,
      }),
      { initialProps: { activeKey: "initial-preset", selectionVersion: 0, hydrated: false, ready: false } },
    );
    rerender({ activeKey: "lot-a", selectionVersion: 1, hydrated: true, ready: false });
    expect(result.current.intent?.kind).toBe("checkout");
    expect(mocks.getDoc).not.toHaveBeenCalled();
    rerender({ activeKey: "lot-a", selectionVersion: 1, hydrated: true, ready: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.access.purchased).toBe(true);
  });

  it("abandons a new selection while signed out before Grant observation begins", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner" }) });
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ uid, selectionVersion }) => useCertificateRecovery({
        uid, certKey: "preset", selectionVersion, ready: true, onRestore,
      }),
      { initialProps: { uid: null as string | null, selectionVersion: 0 } },
    );
    rerender({ uid: null, selectionVersion: 1 });
    expect(result.current.intent).toBeNull();
    rerender({ uid: "owner", selectionVersion: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mocks.getDoc).toHaveBeenCalledWith("owner_preset");
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("acknowledges one cancellation across auth changes and retires its notice on retry", async () => {
    window.history.replaceState(null, "", "/studio?checkout=cancelled");
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    const { result, rerender } = renderHook(
      ({ uid }) => useCertificateRecovery({ uid, certKey: "lot-a", ready: true }),
      { initialProps: { uid: null as string | null } },
    );
    expect(result.current.consumeCancellation()).toBe(true);
    rerender({ uid: "owner" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.consumeCancellation()).toBe(false);
    expect(result.current.intent?.kind).toBe("cancel");
    act(() => { result.current.acknowledgeCancellation(); });
    expect(result.current.intent).toBeNull();
    rerender({ uid: "another-owner" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.intent).toBeNull();
    expect(result.current.consumeCancellation()).toBe(false);
  });

  it("preserves return intent through cold Live Parcel restoration and consumes unlock signals once", async () => {
    const key = certificateKey(SAMPLE_LIVE_PARCEL);
    window.history.replaceState(null, "", `/studio?cert=${key}&checkout=returned`);
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "owner", parcelData: SAMPLE_LIVE_PARCEL, analyticsOrderId: "opaque-order" }),
    });
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeKey }) => useCertificateRecovery({ uid: "owner", certKey: activeKey, ready: true, onRestore }),
      { initialProps: { activeKey: "preset" } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({
      parcelData: expect.objectContaining({ address: SAMPLE_LIVE_PARCEL.address }),
    }), 0);
    expect(result.current.access.purchased).toBe(false);
    expect(result.current.access.analyticsOrderId).toBeUndefined();
    rerender({ activeKey: key });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.access.purchased).toBe(true);
    expect(result.current.consumeOpen()).toBe(true);
    expect(result.current.consumeOpen()).toBe(false);
    expect(result.current.consumePurchase()).toBe(true);
    expect(result.current.consumePurchase()).toBe(false);
  });

  it("opens an existing Certificate without reporting another Purchase", async () => {
    window.history.replaceState(null, "", "/studio?cert=lot-a&checkout=open");
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner", analyticsOrderId: "old-order" }) });
    const { result } = renderHook(() => useCertificateRecovery({ uid: "owner", certKey: "lot-a", ready: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.consumeOpen()).toBe(true);
    expect(result.current.consumePurchase()).toBe(false);
  });

  it("treats a bare historical Certificate link as opening, not a new Purchase", async () => {
    window.history.replaceState(null, "", "/studio?cert=lot-a");
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner", analyticsOrderId: "old-order" }) });
    const { result } = renderHook(() => useCertificateRecovery({ uid: "owner", certKey: "lot-a", ready: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.intent?.kind).toBe("open");
    expect(result.current.consumePurchase()).toBe(false);
  });

  it("resolves legacy cert=1 against the active Parcel instead of reading a Grant named 1", async () => {
    window.history.replaceState(null, "", "/studio?cert=1");
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner" }) });
    const { result } = renderHook(() => useCertificateRecovery({ uid: "owner", certKey: "lot-a", ready: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mocks.getDoc).toHaveBeenCalledWith("owner_lot-a");
    expect(result.current.access.purchased).toBe(true);
  });

  it("cannot unlock or restore a Grant belonging to a different Homeowner", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "someone-else", parcelData: SAMPLE_LIVE_PARCEL }) });
    const onRestore = vi.fn();
    const { result } = renderHook(() => useCertificateRecovery({ uid: "owner", certKey: "lot-a", ready: true, onRestore }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(result.current.access.purchased).toBe(false);
    expect(result.current.status).toBe("unverified");
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("preserves cancellation and history state without treating it as a Purchase", async () => {
    window.history.replaceState({ journey: "act" }, "", "/studio?v=2&checkout=cancelled");
    const { result } = renderHook(() => useCertificateRecovery({ uid: null, certKey: "lot-a", ready: true }));
    expect(result.current.consumeCancellation()).toBe(true);
    expect(result.current.consumeCancellation()).toBe(false);
    expect(result.current.consumePurchase()).toBe(false);
    expect(window.location.search).toBe("?v=2");
    expect(window.history.state).toEqual({ journey: "act" });
  });

  it("ignores a late Grant after the Homeowner chooses another Address", async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.getDoc.mockImplementation((id: string) => id === "owner_lot-a"
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve({ exists: () => false }));
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeKey }) => useCertificateRecovery({ uid: "owner", certKey: activeKey, ready: true, onRestore }),
      { initialProps: { activeKey: "lot-a" } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    rerender({ activeKey: "lot-b" });
    await act(async () => {
      resolveOld({ exists: () => true, data: () => ({ uid: "owner", parcelData: SAMPLE_LIVE_PARCEL }) });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.intent).toBeNull();
    expect(result.current.access.purchased).toBe(false);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("does not revive completed cold recovery when the original Preset is selected again", async () => {
    window.history.replaceState(null, "", "/studio?cert=live-key&checkout=returned");
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner", parcelData: SAMPLE_LIVE_PARCEL }) });
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ activeKey }) => useCertificateRecovery({ uid: "owner", certKey: activeKey, ready: true, onRestore }),
      { initialProps: { activeKey: "original-preset" } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    rerender({ activeKey: "live-key" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    onRestore.mockClear();
    rerender({ activeKey: "original-preset" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.intent).toBeNull();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("checks the current Parcel after a legacy return is abandoned", async () => {
    window.history.replaceState(null, "", "/studio?cert=1");
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner" }) });
    const { result, rerender } = renderHook(
      ({ activeKey }) => useCertificateRecovery({ uid: "owner", certKey: activeKey, ready: true }),
      { initialProps: { activeKey: "lot-a" } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    rerender({ activeKey: "lot-b" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); result.current.access.refresh(); });
    expect(mocks.getDoc).toHaveBeenLastCalledWith("owner_lot-b");
    expect(result.current.access.purchased).toBe(true);
  });

  it("abandons a late Grant as soon as another lookup starts before its Parcel resolves", async () => {
    let finish!: (value: unknown) => void;
    mocks.getDoc.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectionVersion }) => useCertificateRecovery({ uid: "owner", certKey: "preset", ready: true, onRestore, selectionVersion }),
      { initialProps: { selectionVersion: 0 } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    rerender({ selectionVersion: 1 });
    await act(async () => {
      finish({ exists: () => true, data: () => ({ uid: "owner", parcelData: SAMPLE_LIVE_PARCEL }) });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.intent).toBeNull();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("maps full address fields onto the restored grant when parcelData is absent", async () => {
    window.history.replaceState(null, "", "/studio?cert=lot-a&checkout=returned");
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: "owner",
        parcelName: "500 Cedar Ave, San Jose, CA 95110",
        address: SAMPLE_LIVE_PARCEL.address,
        city: SAMPLE_LIVE_PARCEL.city,
        state: SAMPLE_LIVE_PARCEL.state,
        zip: SAMPLE_LIVE_PARCEL.zip,
        analyticsOrderId: "opaque-order",
      }),
    });
    const onRestore = vi.fn();
    renderHook(
      ({ activeKey }) => useCertificateRecovery({ uid: "owner", certKey: activeKey, ready: true, onRestore }),
      { initialProps: { activeKey: "preset" } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({
      parcelName: "500 Cedar Ave, San Jose, CA 95110",
      address: SAMPLE_LIVE_PARCEL.address,
      city: SAMPLE_LIVE_PARCEL.city,
      state: SAMPLE_LIVE_PARCEL.state,
      zip: SAMPLE_LIVE_PARCEL.zip,
    }), 0);
  });

  it("composes an unambiguous address query without duplicating state or ZIP in city", () => {
    expect(certificateGrantSearchQuery({
      parcelName: "500 Cedar Ave, San Jose, CA 95110",
      address: "500 Cedar Ave",
      city: "San Jose",
    })).toBe("500 Cedar Ave, San Jose, CA 95110");
    expect(certificateGrantSearchQuery({
      address: "500 Cedar Ave",
      city: "San Jose, CA 95110",
      state: "CA",
      zip: "95110",
    })).toBe("500 Cedar Ave, San Jose, CA 95110");
    expect(certificateGrantSearchQuery({
      address: "500 Cedar Ave",
      city: "San Jose, CA",
      state: "CA",
      zip: "95110",
    })).toBe("500 Cedar Ave, San Jose, CA 95110");
    expect(certificateGrantSearchQuery({
      address: "500 Cedar Ave",
      city: "San Jose",
      state: "CA",
      zip: "95110",
    })).toBe("500 Cedar Ave, San Jose, CA 95110");
    expect(certificateGrantSearchQuery({
      address: "500 Cedar Ave",
    })).toBe("500 Cedar Ave");
    expect(certificateGrantSearchQuery({})).toBeNull();
  });
});
