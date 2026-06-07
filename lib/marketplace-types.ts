import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

export interface ServiceArea {
  city: string;
  state: string;
  key: string;
}

export interface BuilderProfile {
  id: string;
  ownerUid: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  licenseNumber: string | null;
  serviceAreas: ServiceArea[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OwnerContact {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}

export interface ConnectionSnapshot {
  parcel: Parcel;
  parcelKey: string;
  parcelAddress: string;
  parcelCity: string;
  parcelState: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  reportText: string;
}

export type BuilderResponseStatus = "new" | "interested" | "not-a-fit";

export interface ConnectionRequest {
  id: string;
  ownerUid: string;
  ownerContact: OwnerContact;
  snapshot: ConnectionSnapshot;
  matchedBuilderIds: string[];
  builderResponseStatuses?: Record<string, BuilderResponseStatus>;
  status: "submitted";
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BuilderResponse {
  builderId: string;
  status: BuilderResponseStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BuilderInboxItem {
  request: ConnectionRequest;
  response: BuilderResponse;
}
