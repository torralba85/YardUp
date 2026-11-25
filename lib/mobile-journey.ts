/**
 * Mobile-only journey state for the five-reveal studio (issue #130).
 *
 * The phone studio is a sequence of five short reveals — find, earn, shape,
 * check, act — instead of the desktop's guided spine. This module is the pure
 * state helper: step order, labels, and per-step lifecycle derivation. It is
 * deliberately separate from the desktop `StudioStep` in `lib/studio-steps.ts`;
 * desktop navigation is untouched by the mobile journey.
 */

/** The ordered mobile journey. One decision, one reveal per step. */
export type MobileJourneyStep = "find" | "earn" | "shape" | "check" | "act";

/** Static metadata for a journey step. */
export interface MobileJourneyStepMeta {
  id: MobileJourneyStep;
  /** Short label shown in the compact progress rail. */
  label: string;
}

/** Lifecycle state of a step relative to the current position. */
export type MobileJourneyStepState = "current" | "done" | "upcoming" | "locked";

/** A journey step plus its derived lifecycle state. */
export interface DerivedJourneyStep extends MobileJourneyStepMeta {
  state: MobileJourneyStepState;
}

/** The ordered five reveals — the single source of truth for the journey. */
export const MOBILE_JOURNEY_STEPS: MobileJourneyStepMeta[] = [
  { id: "find", label: "Your lot" },
  { id: "earn", label: "Rent" },
  { id: "shape", label: "Design" },
  { id: "check", label: "Rules & fit" },
  { id: "act", label: "Certificate" },
];

/** Index of a step in the journey order. */
export function journeyIndex(step: MobileJourneyStep): number {
  return MOBILE_JOURNEY_STEPS.findIndex((meta) => meta.id === step);
}

/** The step after `step`, or null at the end of the journey. */
export function nextJourneyStep(step: MobileJourneyStep): MobileJourneyStep | null {
  return MOBILE_JOURNEY_STEPS[journeyIndex(step) + 1]?.id ?? null;
}

/** The step before `step`, or null at the start of the journey. */
export function prevJourneyStep(step: MobileJourneyStep): MobileJourneyStep | null {
  const index = journeyIndex(step);
  return index > 0 ? MOBILE_JOURNEY_STEPS[index - 1].id : null;
}

/** Inputs that influence which journey steps are reachable. */
export interface JourneyStateInput {
  /**
   * Whether the find decision has been made — an address resolved or a demo
   * lot explicitly chosen. Every reveal past "find" is locked until then.
   */
  found: boolean;
}

/**
 * Compute each step's lifecycle state for the current position. The active
 * step is `current`; earlier steps are `done`; later steps are `upcoming`
 * unless the find decision hasn't been made yet, which locks them.
 */
export function deriveJourneySteps(
  active: MobileJourneyStep,
  input: JourneyStateInput,
): DerivedJourneyStep[] {
  const activeIndex = journeyIndex(active);
  return MOBILE_JOURNEY_STEPS.map((meta, index) => {
    let state: MobileJourneyStepState;
    if (index === activeIndex) {
      state = "current";
    } else if (index < activeIndex) {
      state = "done";
    } else if (!input.found) {
      state = "locked";
    } else {
      state = "upcoming";
    }
    return { ...meta, state };
  });
}
