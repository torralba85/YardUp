export type JurisdictionId = "los-angeles" | "san-diego" | "san-jose" | "oakland" | "sacramento";

export interface Citation {
  label: string;
  url: string;
}

export interface RegulationGuide {
  jurisdiction: JurisdictionId;
  title: string;
  summary: string;
  permitSteps: string[];
  blockers: string[];
  verifiedAt: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
}

export interface EstimateInput {
  aduType: "detached" | "attached" | "garage_conversion" | "jadu";
  aduSqFt: number;
  buildCostPerSqFt: number;
  softCostRate: number;
  contingencyRate: number;
  monthlyRent: number;
  opExRate: number;
  capRate: number;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  jurisdiction: JurisdictionId;
  lotSqFt: number;
  primaryHomeSqFt: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastEstimateInput?: EstimateInput;
  sitePhotoUri?: string;
}

export interface InspirationItem {
  id: string;
  title: string;
  jurisdiction: JurisdictionId | "california";
  style: string;
  budgetBand: "under_250k" | "250k_400k" | "400k_plus";
  sqft: number;
  imageUrl: string;
  tags: string[];
  summary: string;
}

export interface DesignConceptPayload {
  title: string;
  exteriorStyle: string;
  footprintType: string;
  targetSqFt: number;
  rooms: string[];
  constraints: string[];
  nextSteps: string[];
  thumbnailPrompt: string;
}

export type DesignStyleId =
  | "warm_modern"
  | "farmhouse"
  | "industrial"
  | "coastal_minimal"
  | "california_bungalow"
  | "clean_gable";

export type ConstructionMethod = "prefab" | "modular" | "site_built" | "conversion";

export interface DesignPlacement {
  xPercent: number;
  yPercent: number;
  rotation: number;
}

export interface DesignFitSignal {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: "good" | "review" | "blocked";
}

export interface DesignConceptPreferences {
  styleId?: DesignStyleId;
  styleLabel?: string;
  modelId?: string;
  modelName?: string;
  constructionMethod?: ConstructionMethod;
  targetSqFt?: number;
  placement?: DesignPlacement;
  fitSignals?: DesignFitSignal[];
  hasSitePhoto?: boolean;
}

export interface PropertyRecord {
  id: string;
  projectId: string;
  source: string;
  recordType: string;
  date: string;
  summary: string;
  citationUrl: string;
}
