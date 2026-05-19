import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { Project } from "../types";

export interface QuoteRequestPayload {
  projectId: string;
  contractorId: string;
  packetItems: string[];
  userId?: string;
  project?: Project;
}

export async function saveQuoteRequest(payload: QuoteRequestPayload) {
  const now = Timestamp.now();
  const id = `quote-${payload.projectId}-${payload.contractorId}`;
  const document = {
    id,
    projectId: payload.projectId,
    contractorId: payload.contractorId,
    packetItems: payload.packetItems,
    status: "sent",
    createdAt: now,
    updatedAt: now,
  };

  if (payload.userId) {
    await getFirestore()
      .doc(`users/${payload.userId}/projects/${payload.projectId}/quoteRequests/${id}`)
      .set(document, { merge: true });
  }

  return {
    ...document,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
}
