"use client";

import { useSyncExternalStore } from "react";

export interface UtilityPoint {
  x: number;
  y: number;
  z: number;
}

export interface UtilityEstimate {
  distanceFt: number;
  lowCost: number;
  highCost: number;
}

export interface StudioEnhancementsState {
  utilityAnchor: UtilityPoint | null;
  utilityEstimate: UtilityEstimate | null;
  sitePlanCapture: (() => Promise<string>) | null;
}

// Retain lot identity alongside utility state, including while the scene is unmounted.
let utilityParcelKey: string | null = null;
const listeners = new Set<() => void>();
let state: StudioEnhancementsState = {
  utilityAnchor: null,
  utilityEstimate: null,
  sitePlanCapture: null,
};

function publish(patch: Partial<StudioEnhancementsState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getStudioEnhancementsSnapshot(): StudioEnhancementsState {
  return state;
}

export function setUtilityParcelKey(parcelKey: string | null) {
  if (utilityParcelKey === parcelKey) return;
  utilityParcelKey = parcelKey;
  publish({ utilityAnchor: null, utilityEstimate: null });
}

export function setUtilityAnchor(anchor: UtilityPoint | null) {
  publish({ utilityAnchor: anchor, utilityEstimate: anchor ? state.utilityEstimate : null });
}

export function setUtilityEstimate(estimate: UtilityEstimate | null) {
  publish({ utilityEstimate: estimate });
}

export function registerSitePlanCapture(capture: (() => Promise<string>) | null) {
  publish({ sitePlanCapture: capture });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStudioEnhancements(): StudioEnhancementsState {
  return useSyncExternalStore(subscribe, getStudioEnhancementsSnapshot, getStudioEnhancementsSnapshot);
}
