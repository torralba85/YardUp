import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { Project } from "../types";

export interface QuoteRequestPayload {
  projectId: string;
  contractorId: string;
  packetItems: string[];
  homeownerConsent: true;
  userId?: string;
  project?: Project;
}

export async function saveQuoteRequest(payload: QuoteRequestPayload) {
  if (!payload.userId) {
    throw new Error("User ID is required to save a quote request.");
  }

  const now = Timestamp.now();
  const id = `quote-${payload.projectId}-${payload.contractorId}`;
  const document = {
    id,
    projectId: payload.projectId,
    contractorId: payload.contractorId,
    packetItems: payload.packetItems,
    homeownerConsent: payload.homeownerConsent,
    status: "submitted" as const,
    homeownerConsentAt: now,
    commercialStatus: "not_eligible" as const,
    createdAt: now,
    updatedAt: now,
  };

  await getFirestore()
    .doc(`users/${payload.userId}/projects/${payload.projectId}/quoteRequests/${id}`)
    .set(document, { merge: true });

  return {
    ...document,
    homeownerConsentAt: now.toDate().toISOString(),
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
}
