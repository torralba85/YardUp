import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("./auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

import { ParcelProvider, useParcel } from "./parcel-context";
import { parcelPresets } from "./feasibility";
import { buildEstimatedParcel } from "./estimated-parcel";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ParcelProvider initialPreset={parcelPresets[0]}>{children}</ParcelProvider>
);

describe("ParcelProvider estimated mode", () => {
  it("starts in preset mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    expect(result.current.parcelMode).toBe("preset");
  });

  it("setEstimatedParcel switches to estimated mode with the estimated parcel", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 47.68,
      lng: -122.3,
      formattedAddress: "123 Maple St, Seattle, WA 98115, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));

    expect(result.current.parcelMode).toBe("estimated");
    expect(result.current.parcel.address).toBe("123 Maple St");
    expect(result.current.parcelError).toBeNull();
  });

  it("resetToPreset clears estimated mode", () => {
    const { result } = renderHook(() => useParcel(), { wrapper });
    const estimated = buildEstimatedParcel({
      lat: 1,
      lng: 2,
      formattedAddress: "9 Elm St, Denver, CO 80202, USA",
    });

    act(() => result.current.setEstimatedParcel(estimated));
    act(() => result.current.resetToPreset(parcelPresets[0]));

    expect(result.current.parcelMode).toBe("preset");
  });
});
