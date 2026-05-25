export type CoveredJurisdictionId =
  | "los-angeles"
  | "san-diego"
  | "san-jose"
  | "oakland"
  | "sacramento";

export type JurisdictionId = CoveredJurisdictionId | "local-review";

export type AduType = "detached" | "attached" | "garage_conversion" | "jadu";

export type BudgetBand = "under_250k" | "250k_400k" | "400k_plus";

export type ProjectStatus = "draft" | "estimated" | "guide_ready" | "concept_ready";

export type DesignStyleId =
  | "warm_modern"
  | "farmhouse"
  | "industrial"
  | "coastal_minimal"
  | "california_bungalow"
  | "clean_gable";

export type ConstructionMethod = "prefab" | "modular" | "site_built" | "conversion";

export type DesignFitSignalStatus = "good" | "review" | "blocked";

export interface DesignStyle {
  id: DesignStyleId;
  label: string;
  description: string;
  promptCue: string;
  tags: string[];
}

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
  status: DesignFitSignalStatus;
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

export interface EstimateInput {
  aduType: AduType;
  aduSqFt: number;
  buildCostPerSqFt: number;
  softCostRate: number;
  contingencyRate: number;
  monthlyRent: number;
  opExRate: number;
  capRate: number;
}

export interface EstimateResult {
  lowValue: number;
  highValue: number;
  annualRent: number;
  annualOpEx: number;
  annualNOI: number;
  totalCost: number;
  roi: number;
  paybackYears: number;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  jurisdiction: JurisdictionId;
  lotSqFt: number;
  primaryHomeSqFt: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastEstimate?: EstimateResult;
  lastEstimateInput?: EstimateInput;
  sitePhotoUri?: string;
  selectedModelId?: string;
  selectedStyleId?: DesignStyleId;
  placement?: DesignPlacement;
}

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

export interface InspirationItem {
  id: string;
  title: string;
  jurisdiction: JurisdictionId | "california";
  style: string;
  budgetBand: BudgetBand;
  sqft: number;
  imageUrl: string;
  tags: string[];
  summary: string;
}

export interface ProjectSavedItem {
  id: string;
  projectId: string;
  inspirationId: string;
  createdAt: string;
}

export interface DesignConcept {
  id: string;
  projectId: string;
  title: string;
  exteriorStyle: string;
  footprintType: string;
  targetSqFt: number;
  rooms: string[];
  constraints: string[];
  nextSteps: string[];
  thumbnailPrompt: string;
  createdAt: string;
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

export interface ContractorProfile {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  rating: number;
  reviews: number;
  matchScore: number;
  licenseStatus: "verified" | "pending";
  insuranceStatus: "verified" | "pending";
  serviceArea: string;
  supportedJurisdictions: CoveredJurisdictionId[];
  priceRange: string;
  timelineWeeks: string;
  aduCount: number;
  permitSupport: boolean;
  tags: string[];
  reviewExcerpt: string;
}

export interface QuoteRequest {
  id: string;
  projectId: string;
  contractorId: string;
  status: "saved" | "submitted" | "sent";
  packetItems: string[];
  createdAt: string;
  homeownerConsentAt?: string;
  deliveredAt?: string;
  commercialStatus: "not_eligible" | "eligible_for_builder_fee";
}

export interface ParcelSummary {
  id: string;
  jurisdiction: JurisdictionId;
  zoning: string;
  lotSqFt: number;
  buildableAreaSqFt: number;
  setbacks: {
    front: string;
    side: string;
    rear: string;
  };
  constraints: string[];
  sourceLabel: string;
  verifiedAt: string;
}

export interface AduModel {
  id: string;
  name: string;
  sqft: number;
  beds: number;
  baths: number;
  dimensions: string;
  footprint: {
    widthFt: number;
    depthFt: number;
  };
  constructionMethod: ConstructionMethod;
  styleIds: DesignStyleId[];
  budgetBand: BudgetBand;
  priceFrom: number;
  monthlyEstimate: number;
  fitScore: number;
  imageUrl: string;
  tags: string[];
  accessibilityFeatures: string[];
  familyFeatures: string[];
  fitNotes: string[];
}
