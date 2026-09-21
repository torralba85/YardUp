import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CESIUM_CDN_BASE, loadCesium, resetCesiumLoaderForTesting } from "./cesium-loader";

interface WindowWithCesium extends Window {
  Cesium?: Record<string, unknown>;
  CESIUM_BASE_URL?: string;
}

const testWindow = window as unknown as WindowWithCesium;

describe("cesium-loader", () => {
  beforeEach(() => {
    resetCesiumLoaderForTesting();
    delete testWindow.Cesium;
    delete testWindow.CESIUM_BASE_URL;
    document.querySelectorAll("#cesium-widgets-css, #cesium-script").forEach((el) => el.remove());
  });

  afterEach(() => {
    delete testWindow.Cesium;
    delete testWindow.CESIUM_BASE_URL;
  });

  it("sets CESIUM_BASE_URL and injects the widget stylesheet and script tag", async () => {
    const loadPromise = loadCesium();

    expect(testWindow.CESIUM_BASE_URL).toBe(CESIUM_CDN_BASE);
    const css = document.getElementById("cesium-widgets-css") as HTMLLinkElement;
    expect(css).not.toBeNull();
    expect(css.rel).toBe("stylesheet");
    expect(css.href).toContain("Widgets/widgets.css");

    const script = document.getElementById("cesium-script") as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain("Cesium.js");

    // Simulate script load with mocked Cesium global
    testWindow.Cesium = { version: "1.144" };
    script.dispatchEvent(new Event("load"));

    const resolved = await loadPromise;
    expect(resolved).toEqual({ version: "1.144" });
  });

  it("returns existing window.Cesium immediately if already loaded", async () => {
    const mockCesium = { name: "MockCesium" };
    testWindow.Cesium = mockCesium;

    const result = await loadCesium();
    expect(result).toBe(mockCesium);
    expect(document.getElementById("cesium-script")).toBeNull();
  });

  it("handles script load failure gracefully", async () => {
    const loadPromise = loadCesium();
    const script = document.getElementById("cesium-script") as HTMLScriptElement;
    expect(script).not.toBeNull();

    script.dispatchEvent(new Event("error"));
    await expect(loadPromise).rejects.toThrow(/Failed to load CesiumJS/);
  });

  it.each(["error", "load"])("retries after a %s event without a Cesium global", async (event) => {
    const first = loadCesium();
    const failedScript = document.getElementById("cesium-script")!;
    failedScript.dispatchEvent(new Event(event));
    await expect(first).rejects.toThrow(/Failed to/);

    const retry = loadCesium();
    expect(loadCesium()).toBe(retry);
    const replacement = document.getElementById("cesium-script")!;
    expect(replacement).not.toBe(failedScript);
    expect(document.querySelectorAll("#cesium-script")).toHaveLength(1);
    expect(document.querySelectorAll("#cesium-widgets-css")).toHaveLength(1);
    testWindow.Cesium = { version: "1.144" };
    replacement.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe(testWindow.Cesium);
  });
});
