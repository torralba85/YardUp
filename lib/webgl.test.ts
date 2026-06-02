import { describe, expect, it, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

describe("isWebGLAvailable", () => {
  it("returns false when canvas has no webgl context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
    vi.restoreAllMocks();
  });
});
