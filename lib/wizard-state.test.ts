import { describe, expect, it } from "vitest";
import { WIZARD_SEEN_KEY, markWizardSeen, nextStep, shouldShowWizard } from "./wizard-state";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("nextStep", () => {
  it("advances address → size → results and stays at results", () => {
    expect(nextStep("address")).toBe("size");
    expect(nextStep("size")).toBe("results");
    expect(nextStep("results")).toBe("results");
  });
});

describe("shouldShowWizard", () => {
  it("shows for a fresh visitor with a clean URL", () => {
    expect(
      shouldShowWizard({
        hasUrlScenario: false,
        hasPendingAddress: false,
        hasResolvedParcel: false,
        storage: fakeStorage(),
      }),
    ).toBe(true);
  });

  it("hides when a scenario URL is being opened", () => {
    expect(
      shouldShowWizard({
        hasUrlScenario: true,
        hasPendingAddress: false,
        hasResolvedParcel: false,
        storage: fakeStorage(),
      }),
    ).toBe(false);
  });

  it("hides when a landing address handoff is pending", () => {
    expect(
      shouldShowWizard({
        hasUrlScenario: false,
        hasPendingAddress: true,
        hasResolvedParcel: false,
        storage: fakeStorage(),
      }),
    ).toBe(false);
  });

  it("hides when the studio already mounted with a resolved live parcel", () => {
    expect(
      shouldShowWizard({
        hasUrlScenario: false,
        hasPendingAddress: false,
        hasResolvedParcel: true,
        storage: fakeStorage(),
      }),
    ).toBe(false);
  });

  it("hides after the wizard was seen", () => {
    const storage = fakeStorage({ [WIZARD_SEEN_KEY]: "1" });
    expect(
      shouldShowWizard({
        hasUrlScenario: false,
        hasPendingAddress: false,
        hasResolvedParcel: false,
        storage,
      }),
    ).toBe(false);
  });

  it("hides (fails closed) when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
    };
    expect(
      shouldShowWizard({
        hasUrlScenario: false,
        hasPendingAddress: false,
        hasResolvedParcel: false,
        storage,
      }),
    ).toBe(false);
  });
});

describe("markWizardSeen", () => {
  it("persists the seen flag", () => {
    const storage = fakeStorage();
    markWizardSeen(storage);
    expect(storage.getItem(WIZARD_SEEN_KEY)).toBe("1");
  });

  it("swallows storage errors", () => {
    expect(() =>
      markWizardSeen({
        setItem: () => {
          throw new Error("denied");
        },
      }),
    ).not.toThrow();
  });
});
