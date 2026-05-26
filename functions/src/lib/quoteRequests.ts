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
    homeownerUserId: payload.userId,
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

/**
 * Look up a quote request by id without needing the homeowner's UID, so the
 * builder caller never has to know (or be able to spoof) another user's UID.
 * Uses a collectionGroup query against the doc's `id` field.
 */
export async function deliverQuoteRequest(
  callerUid: string,
  callerBuilderId: string,
  projectId: string,
  quoteRequestId: string,
) {
  const firestore = getFirestore();

  const query = await firestore
    .collectionGroup("quoteRequests")
    .where("id", "==", quoteRequestId)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();

  if (query.empty) {
    throw new Error(`Quote request ${quoteRequestId} not found.`);
  }

  const docSnap = query.docs[0];
  const data = docSnap.data();
  if (!data) {
    throw new Error(`Quote request ${quoteRequestId} contains no data.`);
  }

  if (data.contractorId !== callerBuilderId) {
    throw new Error("Caller is not the builder this quote is addressed to.");
  }

  const tier = resolveContractorTier(data.contractorId);
  const fee = getIntroductionFee(tier);
  const now = Timestamp.now();

  const document = {
    ...data,
    status: "sent" as const,
    deliveredAt: now,
    deliveredByBuilderUid: callerUid,
    commercialStatus: "eligible_for_builder_fee" as const,
    introductionFee: fee,
    billingTier: tier,
    updatedAt: now,
  };

  await docSnap.ref.set(document, { merge: true });

  return {
    ...document,
    homeownerConsentAt: data.homeownerConsentAt ? (data.homeownerConsentAt as Timestamp).toDate().toISOString() : undefined,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
    deliveredAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
}
