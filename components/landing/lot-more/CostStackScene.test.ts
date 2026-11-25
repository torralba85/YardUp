import type * as THREE from "three";
import { describe, expect, it } from "vitest";
import { isSoftwareRenderer } from "./CostStackScene";

const UNMASKED_RENDERER_WEBGL = 0x9246;
const RENDERER = 0x1f01;

function rendererReporting(name: string, debugInfo = true) {
  const context = {
    RENDERER,
    getExtension: (extension: string) =>
      debugInfo && extension === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL } : null,
    getParameter: (parameter: number) =>
      parameter === (debugInfo ? UNMASKED_RENDERER_WEBGL : RENDERER) ? name : "unexpected",
  };
  return { getContext: () => context as unknown as WebGL2RenderingContext } as Pick<THREE.WebGLRenderer, "getContext">;
}

describe("isSoftwareRenderer", () => {
  it("keeps the poster for software rasterisers, which Chromium does not refuse", () => {
    for (const name of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)",
    ]) {
      expect(isSoftwareRenderer(rendererReporting(name))).toBe(true);
    }
  });

  it("draws the model on real GPUs, with or without the debug extension", () => {
    expect(
      isSoftwareRenderer(rendererReporting("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)")),
    ).toBe(false);
    expect(isSoftwareRenderer(rendererReporting("Apple GPU", false))).toBe(false);
  });
});
