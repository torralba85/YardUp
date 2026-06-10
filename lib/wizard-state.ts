/** First-run wizard steps, in order. */
export type WizardStep = "address" | "size" | "results";

export const WIZARD_SEEN_KEY = "lf-wizard-seen";

const ORDER: WizardStep[] = ["address", "size", "results"];

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

export function markWizardSeen(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(WIZARD_SEEN_KEY, "1");
  } catch {
    // Private-mode storage denial — the wizard may show again next visit.
  }
}
