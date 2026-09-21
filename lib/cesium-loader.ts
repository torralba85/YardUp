/**
 * Dynamic CDN loader for CesiumJS v1.144.
 *
 * Loads CesiumJS from the official Cesium CDN in browser environments, avoiding
 * heavy worker/wasm bundle compilation in Next.js Turbopack while providing
 * full CesiumJS capabilities for the 3D Studio neighborhood view.
 */

export const CESIUM_VERSION = "1.144";
export const CESIUM_CDN_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;

interface WindowWithCesium extends Window {
  Cesium?: Record<string, unknown>;
  CESIUM_BASE_URL?: string;
}

let loadPromise: Promise<Record<string, unknown>> | null = null;

/** Reset the loader promise, primarily for unit testing. */
export function resetCesiumLoaderForTesting(): void {
  loadPromise = null;
}

/**
 * Loads CesiumJS asynchronously by setting window.CESIUM_BASE_URL and injecting
 * the Cesium CSS stylesheet and JavaScript bundle if not already present.
 */
export function loadCesium(): Promise<Record<string, unknown>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("CesiumJS can only be loaded in a browser environment."));
  }

  const win = window as unknown as WindowWithCesium;

  if (win.Cesium) {
    return Promise.resolve(win.Cesium);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
    win.CESIUM_BASE_URL = CESIUM_CDN_BASE;

    const linkId = "cesium-widgets-css";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `${CESIUM_CDN_BASE}Widgets/widgets.css`;
      document.head.appendChild(link);
    }

    const scriptId = "cesium-script";
    const existing = document.getElementById(scriptId);
    const fail = (script: Element, message: string) => {
      script.remove();
      loadPromise = null;
      reject(new Error(message));
    };
    if (existing) {
      existing.addEventListener("load", () => {
        if (win.Cesium) {
          resolve(win.Cesium);
        } else {
          fail(existing, `Failed to load CesiumJS ${CESIUM_VERSION}`);
        }
      });
      existing.addEventListener("error", () => {
        fail(existing, `Failed to load CesiumJS ${CESIUM_VERSION}`);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${CESIUM_CDN_BASE}Cesium.js`;
    script.async = true;
    script.onload = () => {
      if (win.Cesium) {
        resolve(win.Cesium);
      } else {
        fail(script, `Failed to initialize CesiumJS ${CESIUM_VERSION}`);
      }
    };
    script.onerror = () => {
      fail(script, `Failed to load CesiumJS ${CESIUM_VERSION}`);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
