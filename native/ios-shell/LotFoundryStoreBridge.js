/**
 * Browser-side bridge helpers for the iOS StoreKit plugin.
 * The native plugin posts results to `window[callbackName]`.
 *
 * This file documents the contract used by `lib/commerce/purchase-client.ts`.
 * Native implementation: ios/App/App/LotFoundryStorePlugin.swift (when Xcode
 * project is generated via `npx cap add ios`).
 */
(function () {
  if (typeof window === "undefined") return;
  window.LotFoundryNative = window.LotFoundryNative || { platform: "ios" };

  window.LotFoundryStore = {
    /**
     * @param {string} productId
     * @returns {Promise<{ ok: boolean, jws?: string, error?: string }>}
     */
    purchase(productId) {
      return new Promise((resolve, reject) => {
        const handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lotfoundryStore;
        if (!handler) {
          reject(new Error("StoreKit bridge unavailable"));
          return;
        }
        const requestId = "sk_" + Date.now();
        const callbackName = "__lotfoundryStoreCallback_" + requestId;
        window[callbackName] = function (result) {
          try {
            delete window[callbackName];
          } catch {
            // ignore
          }
          resolve(result);
        };
        handler.postMessage({
          action: "purchase",
          productId: productId,
          requestId: requestId,
          callback: callbackName,
        });
      });
    },
  };
})();
