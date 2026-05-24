import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateDesignConcept: vi.fn(),
  getRegulationGuide: vi.fn(),
  searchPropertyHistory: vi.fn(),
  submitQuoteRequest: vi.fn(),
  upsertProject: vi.fn(),
}));

vi.mock("../services/advisorServices", () => ({
  generateDesignConcept: mocks.generateDesignConcept,
  getRegulationGuide: mocks.getRegulationGuide,
  searchPropertyHistory: mocks.searchPropertyHistory,
  submitQuoteRequest: mocks.submitQuoteRequest,
}));

vi.mock("../storage/database", () => ({
  initializeDatabase: vi.fn(),
  loadContractorProfiles: vi.fn(),
  loadDesignConcepts: vi.fn(),
  loadInspirationItems: vi.fn(),
  loadParcelSummaries: vi.fn(),
  loadProjects: vi.fn(),
  loadQuoteRequests: vi.fn(),
  loadRegulationGuides: vi.fn(),
  loadSavedItems: vi.fn(),
  upsertDesignConcept: vi.fn(),
  upsertProject: mocks.upsertProject,
  upsertPropertyRecords: vi.fn(),
  upsertQuoteRequest: vi.fn(),
  upsertSavedItem: vi.fn(),
}));

import { starterProject } from "../data/sampleProject";
import { useAppStore } from "./appStore";

describe("appStore wizard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProjectId: starterProject.id,
      projects: [starterProject],
    });
  });

  it("saves selected model and placement coordinates", async () => {
    const store = useAppStore.getState();
    const projectId = store.activeProjectId;
    const modelId = "studio-340";
    const placement = { xPercent: 45, yPercent: 55, rotation: 15 };

    await store.saveWizardModelAndPlacement(projectId, modelId, placement);

    const updated = useAppStore.getState().projects.find((project) => project.id === projectId);
    expect(updated?.selectedModelId).toBe(modelId);
    expect(updated?.placement).toEqual(placement);
    expect(mocks.upsertProject).toHaveBeenCalledWith(expect.objectContaining({ selectedModelId: modelId, placement }));
  });

  it("saves selected architectural style ID", async () => {
    const store = useAppStore.getState();
    const projectId = store.activeProjectId;
    const styleId = "warm_modern";

    await store.saveWizardStyle(projectId, styleId);

    const updated = useAppStore.getState().projects.find((project) => project.id === projectId);
    expect(updated?.selectedStyleId).toBe(styleId);
    expect(mocks.upsertProject).toHaveBeenCalledWith(expect.objectContaining({ selectedStyleId: styleId }));
  });

  it("creates and persists a trimmed active project for the guided wizard", async () => {
    const store = useAppStore.getState();

    const project = await store.createProject("  500 Cypress Ave, Los Angeles, CA  ", "los-angeles");

    expect(project.address).toBe("500 Cypress Ave, Los Angeles, CA");
    expect(useAppStore.getState().activeProjectId).toBe(project.id);
    expect(useAppStore.getState().projects[0]).toEqual(project);
    expect(mocks.upsertProject).toHaveBeenCalledWith(project);
  });

  it("rejects empty project addresses before persisting", async () => {
    const store = useAppStore.getState();

    await expect(store.createProject("   ", "los-angeles")).rejects.toThrow("Project address is required");

    expect(useAppStore.getState().projects).toEqual([starterProject]);
    expect(mocks.upsertProject).not.toHaveBeenCalled();
  });
});
