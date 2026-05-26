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

export function resolveContractorTier(contractorId: string): "starter" | "growth" | "premium" {
  if (contractorId === "apex-adu-builders") return "premium";
  if (contractorId === "golden-state-modular") return "growth";
  if (contractorId === "ecostudio-construction") return "starter";
  return "starter";
}

export function getIntroductionFee(tier: "starter" | "growth" | "premium"): number {
  if (tier === "premium") return 149;
  if (tier === "growth") return 99;
  if (tier === "starter") return 49;
  return 49;
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

export async function deliverQuoteRequest(userId: string, projectId: string, quoteRequestId: string) {
  const firestore = getFirestore();
  const docRef = firestore.doc(`users/${userId}/projects/${projectId}/quoteRequests/${quoteRequestId}`);
  const snap = await docRef.get();
  
  if (!snap.exists) {
    throw new Error(`Quote request ${quoteRequestId} not found.`);
  }
  
  const data = snap.data();
  if (!data) {
    throw new Error(`Quote request ${quoteRequestId} contains no data.`);
  }

  const tier = resolveContractorTier(data.contractorId);
  const fee = getIntroductionFee(tier);
  const now = Timestamp.now();

  const document = {
    ...data,
    status: "sent" as const,
    deliveredAt: now,
    commercialStatus: "eligible_for_builder_fee" as const,
    introductionFee: fee,
    billingTier: tier,
    updatedAt: now,
  };

  await docRef.set(document, { merge: true });

  return {
    ...document,
    homeownerConsentAt: data.homeownerConsentAt ? (data.homeownerConsentAt as Timestamp).toDate().toISOString() : undefined,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
    deliveredAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
}
