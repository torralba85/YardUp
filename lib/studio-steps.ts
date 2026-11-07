import type { StepState } from "@/components/ui/StepRail";

/** The ordered studio journey. This IS the funnel. */
export type StudioStep = "lot" | "feasibility" | "design" | "certificate" | "builders";

/** Static metadata for a step in the spine. */
export interface StudioStepMeta {
  id: StudioStep;
  /** Human label shown in the rail. */
  label: string;
  /**
   * Where the homeowner pays, marked `$` in the rail. Builders is revenue for
   * LotFoundry too, but builders pay for it and it is free to the homeowner,
   * so a `$` there read as a cost and is left off.
   */
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
  { id: "feasibility", label: "Rules & Fit", revenue: false, requiresParcel: false },
  { id: "design", label: "Design", revenue: false, requiresParcel: false },
  { id: "certificate", label: "Certificate", revenue: true, requiresParcel: true },
  { id: "builders", label: "Builders", revenue: false, requiresParcel: true },
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
    } else if (index < activeIndex) {
      state = "done";
    } else if (step.requiresParcel && !input.hasParcel) {
      state = "locked";
    } else {
      state = "upcoming";
    }
    return { ...step, state };
  });
}
