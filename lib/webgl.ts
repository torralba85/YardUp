/**
 * Probe for a usable WebGL context, releasing it immediately. Browsers cap
 * concurrent WebGL contexts (~16); leaking a probe can evict a live scene's
 * context. Mirrors the inline probe in components/ParcelScene.tsx.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const ctx = (probe.getContext("webgl") ||
      probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    const ok = !!(window.WebGLRenderingContext && ctx);
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
