"use client";

import { useEffect } from "react";

/**
 * Registers the app's service worker (`/sw.js`) on mount for offline support.
 * Renders nothing; registration failures are non-fatal and ignored.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure is non-fatal; the app works without offline support.
    });
  }, []);

  return null;
}
