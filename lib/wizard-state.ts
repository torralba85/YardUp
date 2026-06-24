/** First-run wizard steps, in order. */
export type WizardStep = "address" | "size" | "results";

/** `localStorage` key marking that the first-run wizard has been seen. */
export const WIZARD_SEEN_KEY = "lf-wizard-seen";

const ORDER: WizardStep[] = ["address", "size", "results"];

/**
 * Advance to the next wizard step, clamping at the final step.
 *
 * @param step - The current step.
 * @returns The following step, or the same step if already at the end.
 */
export function nextStep(step: WizardStep): WizardStep {
  const index = ORDER.indexOf(step);
  return ORDER[Math.min(index + 1, ORDER.length - 1)];
}

interface ShowWizardInput {
  hasUrlScenario: boolean;
  storage: Pick<Storage, "getItem">;
}

/**
 * Show the wizard only to fresh visitors opening a clean URL. Fails closed
 * (no wizard) if storage is unavailable — a broken first-run overlay is
 * worse than no overlay.
 */
export function shouldShowWizard({ hasUrlScenario, storage }: ShowWizardInput): boolean {
  if (hasUrlScenario) return false;
  try {
    return storage.getItem(WIZARD_SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

/**
 * Persist that the user has seen the first-run wizard so it won't show again.
 * Storage failures (e.g. private mode) are swallowed.
 *
 * @param storage - A storage-like object exposing `setItem`.
 */
export function markWizardSeen(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(WIZARD_SEEN_KEY, "1");
  } catch {
    // Private-mode storage denial — the wizard may show again next visit.
  }
}
