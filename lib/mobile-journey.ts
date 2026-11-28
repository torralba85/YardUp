/**
 * Mobile-only journey state for the five-reveal studio (issue #130).
 *
 * The phone studio is a sequence of five short reveals instead of the
 * desktop's guided spine. Since 2026-11-27 it follows the desktop order and
 * names exactly (Andrew's decision after the UX audit): Your lot → Rules & fit
 * → Design → Certificate → Builders, so a person who switches devices meets
 * the same journey. The ids stay mobile-specific (`find`, `check`, `shape`,
 * `act`, `builders`); `lib/studio-steps.ts` holds the desktop twin.
 */

/** The ordered mobile journey. One decision, one reveal per step. */
export type MobileJourneyStep = "find" | "check" | "shape" | "act" | "builders";

/** Static metadata for a journey step. */
export interface MobileJourneyStepMeta {
  id: MobileJourneyStep;
  /** Short label shown in the compact progress rail. */
  label: string;
}

/**
 * Lifecycle of a step relative to the current position. `viewed` is an
 * earlier step the visitor opened but has not completed (a Certificate looked
 * at but not bought): reachable from the rail, but never shown as done.
 */
export type MobileJourneyStepState = "current" | "done" | "viewed" | "upcoming" | "locked";

/** A journey step plus its derived lifecycle state. */
export interface DerivedJourneyStep extends MobileJourneyStepMeta {
  state: MobileJourneyStepState;
}

/** The ordered five reveals: the single source of truth for the journey. */
export const MOBILE_JOURNEY_STEPS: MobileJourneyStepMeta[] = [
  { id: "find", label: "Your lot" },
  { id: "check", label: "Rules & fit" },
  { id: "shape", label: "Design" },
  { id: "act", label: "Certificate" },
  { id: "builders", label: "Builders" },
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
   * Whether the find decision has been made: an address resolved or a demo
   * lot explicitly chosen. Every reveal past "find" is locked until then.
   */
  found: boolean;
  /**
   * Steps actually completed. An earlier step outside this set is `viewed`,
   * not `done`, so passing the paywall never reads as buying the Certificate.
   * Omit to treat every earlier step as done.
   */
  completed?: ReadonlySet<MobileJourneyStep>;
}

/**
 * Compute each step's lifecycle state for the current position. The active
 * step is `current`; earlier steps are `done` (or `viewed` when not completed);
 * later steps are `upcoming` unless the find decision hasn't been made yet,
 * which locks them.
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
      state = !input.completed || input.completed.has(meta.id) ? "done" : "viewed";
    } else if (!input.found) {
      state = "locked";
    } else {
      state = "upcoming";
    }
    return { ...meta, state };
  });
}
