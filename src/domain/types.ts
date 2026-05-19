export type JurisdictionId =
  | "los-angeles"
  | "san-diego"
  | "san-jose"
  | "oakland"
  | "sacramento";

export type AduType = "detached" | "attached" | "garage_conversion" | "jadu";

export type BudgetBand = "under_250k" | "250k_400k" | "400k_plus";

export type ProjectStatus = "draft" | "estimated" | "guide_ready" | "concept_ready";

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
  status: "sent";
  packetItems: string[];
  createdAt: string;
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
  priceFrom: number;
  monthlyEstimate: number;
  fitScore: number;
  imageUrl: string;
  tags: string[];
}
