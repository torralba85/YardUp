import { create } from "zustand";

import { contractorProfiles as seededContractors } from "../data/contractors";
import { inspirationItems as seededInspiration } from "../data/inspiration";
import { parcelSummaries as seededParcels } from "../data/parcelSummaries";
import { regulationGuides as seededGuides } from "../data/regulations";
import { starterProject } from "../data/sampleProject";
import { defaultEstimateInput, estimateAduValue } from "../domain/estimator";
import type {
  ContractorProfile,
  DesignConcept,
  EstimateInput,
  InspirationItem,
  JurisdictionId,
  ParcelSummary,
  Project,
  ProjectSavedItem,
  PropertyRecord,
  QuoteRequest,
  RegulationGuide,
} from "../domain/types";
import { generateDesignConcept, getRegulationGuide, searchPropertyHistory, submitQuoteRequest } from "../services/advisorServices";
import {
  initializeDatabase,
  loadContractorProfiles,
  loadDesignConcepts,
  loadInspirationItems,
  loadParcelSummaries,
  loadProjects,
  loadQuoteRequests,
  loadRegulationGuides,
  loadSavedItems,
  upsertDesignConcept,
  upsertProject,
  upsertPropertyRecords,
  upsertQuoteRequest,
  upsertSavedItem,
} from "../storage/database";

interface AppState {
  initialized: boolean;
  storageMode: "sqlite" | "memory";
  activeProjectId: string;
  projects: Project[];
  inspirationItems: InspirationItem[];
  savedItems: ProjectSavedItem[];
  concepts: DesignConcept[];
  propertyRecords: PropertyRecord[];
  contractorProfiles: ContractorProfile[];
  quoteRequests: QuoteRequest[];
  parcelSummaries: ParcelSummary[];
  regulationGuides: Record<JurisdictionId, RegulationGuide>;
  initialize: () => Promise<void>;
  createProject: (address: string, jurisdiction: JurisdictionId) => Promise<Project>;
  setActiveProject: (projectId: string) => void;
  saveEstimate: (projectId: string, input: EstimateInput) => Promise<void>;
  saveInspiration: (projectId: string, inspirationId: string) => Promise<void>;
  requestQuote: (projectId: string, contractorId: string) => Promise<QuoteRequest>;
  createConcept: (projectId: string, inspirationId?: string) => Promise<DesignConcept | null>;
  refreshGuide: (jurisdiction: JurisdictionId) => Promise<RegulationGuide>;
  refreshPropertyHistory: (projectId: string) => Promise<PropertyRecord[]>;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  storageMode: "sqlite",
  activeProjectId: starterProject.id,
  projects: [starterProject],
  inspirationItems: seededInspiration,
  savedItems: [],
  concepts: [],
  propertyRecords: [],
  contractorProfiles: seededContractors,
  quoteRequests: [],
  parcelSummaries: seededParcels,
  regulationGuides: seededGuides,

  initialize: async () => {
    try {
      await initializeDatabase();
      const [projects, ideas, saves, concepts, guides, contractors, quoteRequests, parcels] = await Promise.all([
        loadProjects(),
        loadInspirationItems(),
        loadSavedItems(),
        loadDesignConcepts(),
        loadRegulationGuides(),
        loadContractorProfiles(),
        loadQuoteRequests(),
        loadParcelSummaries(),
      ]);

      set({
        initialized: true,
        storageMode: "sqlite",
        projects: projects.length ? projects : [starterProject],
        activeProjectId: projects[0]?.id ?? starterProject.id,
        inspirationItems: ideas.length ? ideas : seededInspiration,
        savedItems: saves,
        concepts,
        contractorProfiles: contractors.length ? contractors : seededContractors,
        quoteRequests,
        parcelSummaries: parcels.length ? parcels : seededParcels,
        regulationGuides: guides.reduce(
          (acc, guide) => ({ ...acc, [guide.jurisdiction]: guide }),
          seededGuides,
        ),
      });
    } catch {
      set({
        initialized: true,
        storageMode: "memory",
        projects: [starterProject],
        activeProjectId: starterProject.id,
        inspirationItems: seededInspiration,
        contractorProfiles: seededContractors,
        parcelSummaries: seededParcels,
        regulationGuides: seededGuides,
      });
    }
  },

  createProject: async (address, jurisdiction) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: `project-${Date.now()}`,
      name: `${address.split(",")[0] || "New ADU"} study`,
      address,
      jurisdiction,
      lotSqFt: 5000,
      primaryHomeSqFt: 1400,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id,
    }));

    await persist(() => upsertProject(project));
    return project;
  },

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),

  saveEstimate: async (projectId, input) => {
    const result = estimateAduValue(input);
    const updatedAt = new Date().toISOString();
    const updatedProject = get().projects.find((project) => project.id === projectId);
    if (!updatedProject) return;

    const project: Project = {
      ...updatedProject,
      lastEstimateInput: input,
      lastEstimate: result,
      status: "estimated",
      updatedAt,
    };

    set((state) => ({
      projects: state.projects.map((item) => (item.id === projectId ? project : item)),
      activeProjectId: projectId,
    }));

    await persist(() => upsertProject(project));
  },

  saveInspiration: async (projectId, inspirationId) => {
    if (get().savedItems.some((item) => item.projectId === projectId && item.inspirationId === inspirationId)) {
      return;
    }

    const now = new Date().toISOString();
    const item: ProjectSavedItem = {
      id: `saved-${projectId}-${inspirationId}`,
      projectId,
      inspirationId,
      createdAt: now,
    };

    set((state) => ({ savedItems: [item, ...state.savedItems] }));
    await persist(() => upsertSavedItem(item));
  },

  requestQuote: async (projectId, contractorId) => {
    const existing = get().quoteRequests.find(
      (request) => request.projectId === projectId && request.contractorId === contractorId,
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const packetItems = ["ROI model", "Lot summary", "Design concept", "Permit notes"];
    const remote = await submitQuoteRequest(projectId, contractorId, packetItems);
    const request: QuoteRequest = remote ?? {
      id: `quote-${projectId}-${contractorId}`,
      projectId,
      contractorId,
      status: "sent",
      packetItems,
      createdAt: now,
    };

    set((state) => ({ quoteRequests: [request, ...state.quoteRequests] }));
    await persist(() => upsertQuoteRequest(request));
    return request;
  },

  createConcept: async (projectId, inspirationId) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return null;

    const inspiration = get().inspirationItems.find((item) => item.id === inspirationId);
    const concept = await generateDesignConcept(project, inspiration);
    const updatedProject: Project = {
      ...project,
      status: "concept_ready",
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      concepts: [concept, ...state.concepts],
      projects: state.projects.map((item) => (item.id === projectId ? updatedProject : item)),
    }));

    await persist(() => upsertDesignConcept(concept));
    await persist(() => upsertProject(updatedProject));
    return concept;
  },

  refreshGuide: async (jurisdiction) => {
    const guide = await getRegulationGuide(jurisdiction);
    set((state) => ({
      regulationGuides: {
        ...state.regulationGuides,
        [jurisdiction]: guide,
      },
    }));
    return guide;
  },

  refreshPropertyHistory: async (projectId) => {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return [];

    const records = await searchPropertyHistory(project);
    set((state) => ({
      propertyRecords: [
        ...records,
        ...state.propertyRecords.filter((record) => record.projectId !== projectId),
      ],
    }));
    await persist(() => upsertPropertyRecords(records));
    return records;
  },
}));

export function useActiveProject() {
  return useAppStore((state) => state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0]);
}

export function useActiveGuide() {
  const project = useActiveProject();
  return useAppStore((state) => state.regulationGuides[project?.jurisdiction ?? "los-angeles"]);
}

export function useActiveParcelSummary() {
  const project = useActiveProject();
  return useAppStore((state) =>
    state.parcelSummaries.find((parcel) => parcel.jurisdiction === (project?.jurisdiction ?? "los-angeles")),
  );
}

export function getEstimateDefaults(project?: Project): EstimateInput {
  return project?.lastEstimateInput ?? defaultEstimateInput;
}

async function persist(operation: () => Promise<void>) {
  try {
    await operation();
  } catch {
    // Local memory state already updated. A later app launch will reseed if SQLite is unavailable.
  }
}
