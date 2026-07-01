import type { StepState } from "@/components/ui/StepRail";

/** The ordered studio journey. This IS the funnel. */
export type StudioStep = "lot" | "feasibility" | "design" | "certificate" | "builders";

/** Static metadata for a step in the spine. */
export interface StudioStepMeta {
  id: StudioStep;
  /** Human label shown in the rail. */
  label: string;
  /** A revenue destination (paid certificate / builder referral). */
  revenue: boolean;
  /** Requires a resolved (non-demo) parcel before it can be reached. */
  requiresParcel: boolean;
}

/** A step plus its derived lifecycle state for the current journey position. */
export interface DerivedStep extends StudioStepMeta {
  state: StepState;
}

/** The ordered spine — the single source of truth for the studio's navigation. */
export const STUDIO_STEPS: StudioStepMeta[] = [
  { id: "lot", label: "Your Lot", revenue: false, requiresParcel: false },
  { id: "feasibility", label: "Feasibility & Rules", revenue: false, requiresParcel: false },
  { id: "design", label: "Design", revenue: false, requiresParcel: false },
  { id: "certificate", label: "Certificate", revenue: true, requiresParcel: true },
  { id: "builders", label: "Builders", revenue: true, requiresParcel: true },
];

/** Inputs that influence which steps are reachable. */
export interface StepStateInput {
  /** Whether a real address/parcel has been resolved (not the demo default). */
  hasParcel: boolean;
}

/**
 * Compute each step's lifecycle state for the current journey position.
 *
 * The active step is always `current`. Steps gated on a parcel are `locked`
 * until one is resolved (so the revenue destinations invite a search rather
 * than dead-ending). Otherwise earlier steps are `done` and later ones
 * `upcoming` — a plain, explorable progression.
 */
export function deriveStepStates(activeStep: StudioStep, input: StepStateInput): DerivedStep[] {
  const activeIndex = STUDIO_STEPS.findIndex((step) => step.id === activeStep);
  return STUDIO_STEPS.map((step, index) => {
    let state: StepState;
    if (index === activeIndex) {
      state = "current";
    } else if (step.requiresParcel && !input.hasParcel) {
      state = "locked";
    } else if (index < activeIndex) {
      state = "done";
    } else {
      state = "upcoming";
    }
    return { ...step, state };
  });
}
