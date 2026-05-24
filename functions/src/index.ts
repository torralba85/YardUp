import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { buildDesignConcept } from "./lib/designConcept";
import { saveFeedback } from "./lib/feedback";
import { buildStarterPropertyHistory } from "./lib/propertyHistory";
import { saveQuoteRequest } from "./lib/quoteRequests";
import { enforceRateLimit } from "./lib/rateLimit";
import { getSeededRegulationGuide } from "./lib/regulations";
import { writeServiceLog } from "./lib/serviceLog";
import {
  generateDesignConceptInputSchema,
  getRegulationGuideInputSchema,
  searchPropertyHistoryInputSchema,
  submitQuoteRequestInputSchema,
  submitFeedbackInputSchema,
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
    status: process.env.OPENAI_API_KEY ? "ok" : "fallback",
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
    ...input,
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

function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    logger.warn("invalid callable payload", { error });
    throw new HttpsError("invalid-argument", "Invalid request payload.");
  }
}
