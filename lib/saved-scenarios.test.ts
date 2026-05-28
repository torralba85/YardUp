import { beforeEach, describe, expect, it } from "vitest";
import { createSavedScenarioStore, STORAGE_KEY } from "./saved-scenarios";
import { defaultAduConfig, defaultFinancialAssumptions } from "./feasibility";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("createSavedScenarioStore", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("saves and lists newest first", async () => {
    const store = createSavedScenarioStore(storage);
    const first = store.save({
      name: "Compact A",
      parcelId: "compact-lot",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = store.save({
      name: "Compact B",
      parcelId: "compact-lot",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });

    const list = store.list();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(first.id);
  });

  it("loads by id", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Oak Plan",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    expect(store.load(saved.id)?.name).toBe("Oak Plan");
  });

  it("removes by id", () => {
    const store = createSavedScenarioStore(storage);
    const saved = store.save({
      name: "Throwaway",
      parcelId: "oak-street",
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
    });
    store.remove(saved.id);
    expect(store.list()).toHaveLength(0);
  });

  it("recovers gracefully from malformed JSON", () => {
    storage.setItem(STORAGE_KEY, "not-json");
    const store = createSavedScenarioStore(storage);
    expect(store.list()).toEqual([]);
  });

  it("returns an empty list when there are no saved scenarios", () => {
    const store = createSavedScenarioStore(storage);
    expect(store.list()).toEqual([]);
  });
});
