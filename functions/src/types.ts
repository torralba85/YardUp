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

export interface PropertyRecord {
  id: string;
  projectId: string;
  source: string;
  recordType: string;
  date: string;
  summary: string;
  citationUrl: string;
}
