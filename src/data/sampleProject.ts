import { defaultEstimateInput, estimateAduValue } from "../domain/estimator";
import type { Project } from "../domain/types";

const now = new Date().toISOString();

export const starterProject: Project = {
  id: "starter-echo-park",
  name: "Echo Park ADU study",
  address: "1420 Baxter St, Los Angeles, CA",
  jurisdiction: "los-angeles",
  lotSqFt: 5200,
  primaryHomeSqFt: 1420,
  status: "estimated",
  createdAt: now,
  updatedAt: now,
  lastEstimateInput: defaultEstimateInput,
  lastEstimate: estimateAduValue(defaultEstimateInput),
};
