"use client";

import { useSyncExternalStore } from "react";
import { isNativeAppShell } from "./purchase-channel";

const subscribe = () => () => {};
const getSnapshot = () => !isNativeAppShell();
const getServerSnapshot = () => false;

/** Builder tools belong to the open web, including phone browsers.
 * Wait for hydration before exposing them: the server cannot identify a TWA.
 */
export function useWebBuilderAccess(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
