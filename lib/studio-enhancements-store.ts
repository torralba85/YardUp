"use client";

import { useSyncExternalStore } from "react";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import type { PlacementResult } from "@/lib/placement-validation";
import type { Pose2D } from "@/lib/scene-model";

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
  parcel: Parcel | null;
  config: ADUConfig | null;
  pose: Pose2D | null;
  placement: PlacementResult | null;
  utilityAnchor: UtilityPoint | null;
  utilityEstimate: UtilityEstimate | null;
  sitePlanCapture: (() => Promise<string>) | null;
}

const listeners = new Set<() => void>();
let state: StudioEnhancementsState = {
  parcel: null,
  config: null,
  pose: null,
  placement: null,
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

export function updateStudioParcel(parcel: Parcel, placement: PlacementResult) {
  const parcelChanged =
    state.parcel?.address !== parcel.address || state.parcel?.city !== parcel.city;
  publish({
    parcel,
    placement,
    ...(parcelChanged ? { utilityAnchor: null, utilityEstimate: null } : {}),
  });
}

export function updateStudioDesign(config: ADUConfig, pose: Pose2D) {
  publish({ config, pose });
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
