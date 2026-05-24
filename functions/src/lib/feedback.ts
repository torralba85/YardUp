import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { FeedbackInput, FeedbackRecord } from "../types";

export interface SaveFeedbackPayload extends FeedbackInput {
  userId: string;
}

export async function saveFeedback(payload: SaveFeedbackPayload): Promise<FeedbackRecord> {
  const db = getFirestore();
  const now = Timestamp.now();
  const feedbackId = `fb-${payload.userId}-${now.toMillis()}`;

  const document: FeedbackRecord = {
    id: feedbackId,
    userId: payload.userId,
    category: payload.category,
    message: payload.message,
    rating: payload.rating,
    pageIdentifier: payload.pageIdentifier,
    clientVersion: payload.clientVersion,
    deviceInfo: payload.deviceInfo,
    status: "new",
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };

  await db.collection("feedback").doc(feedbackId).set(document);

  return document;
}
