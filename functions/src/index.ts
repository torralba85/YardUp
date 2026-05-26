import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { buildDesignConcept } from "./lib/designConcept";
import { saveFeedback } from "./lib/feedback";
import { buildStarterPropertyHistory } from "./lib/propertyHistory";
import { saveQuoteRequest, deliverQuoteRequest as deliverQuoteRequestLib } from "./lib/quoteRequests";
import { enforceRateLimit } from "./lib/rateLimit";
import { getSeededRegulationGuide } from "./lib/regulations";
import { writeServiceLog } from "./lib/serviceLog";
import { getStripeOnboardingUrlHelper, checkStripeStatusHelper } from "./lib/stripeOnboarding";
import {
  generateDesignConceptInputSchema,
  getRegulationGuideInputSchema,
  searchPropertyHistoryInputSchema,
  submitQuoteRequestInputSchema,
  submitFeedbackInputSchema,
  getStripeOnboardingUrlInputSchema,
  checkStripeStatusInputSchema,
  deliverQuoteRequestInputSchema,
} from "./schemas";

initializeApp();

const callableOptions = {
  region: "us-central1",
  cors: true,
  maxInstances: 10,
};

export const getRegulationGuide = onCall(callableOptions, async (request) => {
  await enforceRateLimit("getRegulationGuide", request.auth?.uid, 120);
  const input = parseOrThrow(getRegulationGuideInputSchema, request.data);
  const guide = getSeededRegulationGuide(input.jurisdiction);
  await writeServiceLog({ service: "getRegulationGuide", status: "ok", jurisdiction: input.jurisdiction });
  return guide;
});

export const generateDesignConcept = onCall(callableOptions, async (request) => {
  await enforceRateLimit("generateDesignConcept", request.auth?.uid, 20);
  const input = parseOrThrow(generateDesignConceptInputSchema, request.data);
  const concept = await buildDesignConcept(input.project, input.inspiration, input.preferences);
  await writeServiceLog({
    service: "generateDesignConcept",
    status: process.env.GEMINI_API_KEY ? "ok" : "fallback",
    projectId: input.project.id,
    jurisdiction: input.project.jurisdiction,
    address: input.project.address,
  });
  return concept;
});

export const searchPropertyHistory = onCall(callableOptions, async (request) => {
  await enforceRateLimit("searchPropertyHistory", request.auth?.uid, 20);
  const input = parseOrThrow(searchPropertyHistoryInputSchema, request.data);
  const records = buildStarterPropertyHistory(input.address, input.projectId);
  await writeServiceLog({
    service: "searchPropertyHistory",
    status: "fallback",
    projectId: input.projectId,
    address: input.address,
  });
  return {
    records,
    unavailableSources: ["Live municipal permit provider", "County assessor provider"],
    confidence: "low",
  };
});

export const submitQuoteRequest = onCall(callableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Firebase authentication is required.");
  }

  await enforceRateLimit("submitQuoteRequest", request.auth.uid, 20);
  const input = parseOrThrow(submitQuoteRequestInputSchema, request.data);
  const saved = await saveQuoteRequest({
    projectId: input.projectId,
    contractorId: input.contractorId,
    packetItems: input.packetItems,
    homeownerConsent: input.homeownerConsent,
    userId: request.auth.uid,
  });
  await writeServiceLog({
    service: "submitQuoteRequest",
    status: "ok",
    projectId: input.projectId,
  });
  return saved;
});

export const submitFeedback = onCall(callableOptions, async (request) => {
  await enforceRateLimit("submitFeedback", request.auth?.uid, 20);
  const input = parseOrThrow(submitFeedbackInputSchema, request.data);
  const userId = request.auth?.uid ?? "anonymous";
  const saved = await saveFeedback({
    ...input,
    userId,
  });
  await writeServiceLog({
    service: "submitFeedback",
    status: "ok",
  });
  return saved;
});

export const getStripeOnboardingUrl = onCall(callableOptions, async (request) => {
  const input = parseOrThrow(getStripeOnboardingUrlInputSchema, request.data);
  const userId = input.userId || request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User UID is required.");
  }

  const url = await getStripeOnboardingUrlHelper(userId);

  await writeServiceLog({
    service: "getStripeOnboardingUrl",
    status: "ok",
  });

  return { url };
});

export const checkStripeStatus = onCall(callableOptions, async (request) => {
  const input = parseOrThrow(checkStripeStatusInputSchema, request.data);
  const userId = input.userId || request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "User UID is required.");
  }

  try {
    const status = await checkStripeStatusHelper(userId);
    await writeServiceLog({
      service: "checkStripeStatus",
      status: "ok",
    });
    return { stripeConnectStatus: status };
  } catch (error: any) {
    logger.error("checkStripeStatus failed", { userId, error });
    throw new HttpsError("not-found", error.message || "User profile not found.");
  }
});

export const deliverQuoteRequest = onCall(callableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Firebase authentication is required.");
  }

  await enforceRateLimit("deliverQuoteRequest", request.auth.uid, 60);
  const input = parseOrThrow(deliverQuoteRequestInputSchema, request.data);
  const delivered = await deliverQuoteRequestLib(request.auth.uid, input.projectId, input.quoteRequestId);
  await writeServiceLog({ service: "deliverQuoteRequest", status: "ok", projectId: input.projectId });
  return delivered;
});

function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    logger.warn("invalid callable payload", { error });
    throw new HttpsError("invalid-argument", "Invalid request payload.");
  }
}
