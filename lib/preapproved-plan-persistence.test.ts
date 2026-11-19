import { describe, expect, it } from "vitest";
import { defaultAduConfig, defaultFinancialAssumptions } from "./feasibility";
import { createSavedScenarioStore, migrateSavedScenario, isValidSavedScenario } from "./saved-scenarios";
import { mergeScenarioPartial, parseScenarioParams, serializeScenarioParams } from "./scenario-url";
import { restoreScenario } from "./scenario";
const ref = { planId: "sacramento-studio-367", jurisdictionId: "ca-sacramento" };
const scenario = { id: "test", name: "Plan reference", createdAt: "2026-11-06T00:00:00Z", parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions, preapprovedPlan: ref };

describe("pre-approved plan references in saved studies", () => {
  it("round-trips through migration, local storage and restoration independently of the model", () => {
    const migrated = migrateSavedScenario(scenario)!;
    expect(migrated).toHaveProperty("preapprovedPlan", ref);
    expect(restoreScenario(migrated)).toHaveProperty("preapprovedPlan", ref);
    localStorage.clear();
    const store = createSavedScenarioStore(localStorage);
    const saved = store.save(scenario);
    expect(store.load(saved.id)).toHaveProperty("preapprovedPlan", ref);
    expect(store.load(saved.id)?.config).toEqual(defaultAduConfig);
    expect(restoreScenario(migrateSavedScenario({ ...scenario, preapprovedPlan: undefined })!)).toHaveProperty("preapprovedPlan", null);
  });
  it("keeps retired references while dropping malformed optional references without losing a valid study", () => {
    expect(migrateSavedScenario({ ...scenario, preapprovedPlan: { ...ref, planId: "retired-plan" } })).toHaveProperty("preapprovedPlan.planId", "retired-plan");
    expect(migrateSavedScenario({ ...scenario, preapprovedPlan: { planId: "<script>" } })).not.toHaveProperty("preapprovedPlan");
    expect(isValidSavedScenario({ ...scenario, preapprovedPlan: { planId: "<script>" } })).toBe(false);
  });
  it("round-trips only safe IDs through sharing and keeps legacy links readable", () => {
    const merged = mergeScenarioPartial(scenario);
    const query = serializeScenarioParams(merged);
    expect(query).toContain("plan=sacramento-studio-367");
    expect(mergeScenarioPartial(parseScenarioParams(new URLSearchParams(query)))).toHaveProperty("preapprovedPlan", ref);
    const malicious = new URLSearchParams(query);
    malicious.set("plan", "javascript:alert(1)");
    expect(parseScenarioParams(malicious)).not.toHaveProperty("preapprovedPlan");
    expect(parseScenarioParams(new URLSearchParams("parcel=oak-street&size=600"))).not.toHaveProperty("preapprovedPlan");
  });
});
