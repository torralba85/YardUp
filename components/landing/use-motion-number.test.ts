import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { motionValue } from "motion/react";
import { useStateFromMotionNumber } from "./use-motion-number";

describe("useStateFromMotionNumber", () => {
  it("initializes with the current motion value", () => {
    const mv = motionValue(123);
    const { result } = renderHook(() => useStateFromMotionNumber(mv));
    expect(result.current).toBe(123);
  });

  it("updates when the motion value changes", () => {
    const mv = motionValue(100);
    const { result } = renderHook(() => useStateFromMotionNumber(mv));

    act(() => {
      mv.set(200);
    });

    expect(result.current).toBe(200);
  });

  it("unsubscribes on unmount", () => {
    const mv = motionValue(10);
    const unsubscribeMock = vi.fn();
    const onMock = vi.spyOn(mv, 'on').mockReturnValue(unsubscribeMock);

    const { unmount } = renderHook(() => useStateFromMotionNumber(mv));

    expect(onMock).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
