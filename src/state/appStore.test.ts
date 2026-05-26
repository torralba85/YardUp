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
      quoteRequests: [],
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

  it("keeps an undelivered quote packet saved and retryable", async () => {
    mocks.submitQuoteRequest.mockResolvedValue(null);

    const request = await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);

    expect(request.status).toBe("saved");
    expect(request.commercialStatus).toBe("not_eligible");
    expect(mocks.submitQuoteRequest).toHaveBeenCalledTimes(1);

    await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);

    expect(mocks.submitQuoteRequest).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().quoteRequests).toHaveLength(1);
  });

  it("keeps a server-recorded outreach submission ineligible until delivery is confirmed", async () => {
    mocks.submitQuoteRequest.mockResolvedValue({
      id: "quote-submitted",
      projectId: starterProject.id,
      contractorId: "apex-adu-builders",
      packetItems: ["ROI model"],
      status: "submitted",
      createdAt: "2026-05-25T00:00:00.000Z",
      homeownerConsentAt: "2026-05-25T00:00:00.000Z",
      commercialStatus: "not_eligible",
    });

    const request = await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);

    expect(request.status).toBe("submitted");
    expect(request.commercialStatus).toBe("not_eligible");
    expect(request.deliveredAt).toBeUndefined();

    await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);
    expect(mocks.submitQuoteRequest).toHaveBeenCalledTimes(1);
  });

  it("stores a delivered consented packet as commercially eligible", async () => {
    mocks.submitQuoteRequest.mockResolvedValue({
      id: "quote-1",
      projectId: starterProject.id,
      contractorId: "apex-adu-builders",
      packetItems: ["ROI model"],
      status: "sent",
      createdAt: "2026-05-25T00:00:00.000Z",
      homeownerConsentAt: "2026-05-25T00:00:00.000Z",
      deliveredAt: "2026-05-25T00:00:00.000Z",
      commercialStatus: "eligible_for_builder_fee",
    });

    const request = await useAppStore.getState().requestQuote(starterProject.id, "apex-adu-builders", true);

    expect(request.status).toBe("sent");
    expect(request.commercialStatus).toBe("eligible_for_builder_fee");
  });
});
