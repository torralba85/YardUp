import crypto from "node:crypto";

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

type ServiceName = "getRegulationGuide" | "generateDesignConcept" | "searchPropertyHistory" | "submitQuoteRequest" | "submitFeedback";
type ServiceStatus = "ok" | "fallback" | "error";

export interface ServiceLogEntry {
  service: ServiceName;
  status: ServiceStatus;
  projectId?: string;
  jurisdiction?: string;
  address?: string;
  errorCode?: string;
}

export async function writeServiceLog(entry: ServiceLogEntry): Promise<void> {
  try {
    const { address, ...safeEntry } = entry;
    await getFirestore()
      .collection("serviceRequests")
      .add({
        ...safeEntry,
        addressHash: address ? hashAddress(address) : null,
        createdAt: Timestamp.now(),
      });
  } catch (error) {
    logger.warn("service log write failed", { service: entry.service, error });
  }
}

function hashAddress(address: string): string {
  return crypto.createHash("sha256").update(address.trim().toLowerCase()).digest("hex");
}
