import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordPendingLeadUnlockAttempt,
  reconcilePendingLeadUnlock,
  recordInPlaceLeadUnlock,
  clearPendingLeadUnlock,
} from "./lead-unlock-tracking";
import * as events from "./events";
import * as consent from "./consent";
import type { BuilderInboxItem } from "@/lib/marketplace-types";

describe("lead-unlock-tracking", () => {
  const mockTrack = vi.spyOn(events, "trackBuilderLeadUnlocked");

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(consent, "readConsent").mockReturnValue("granted");
  });

  const createMockItem = (
    id: string,
    unlocked: boolean,
    status: "new" | "interested" | "not-a-fit" = "new",
  ): BuilderInboxItem => ({
    request: {
      id,
      ownerUid: "owner-1",
      preview: {
        previewSerial: "LF-001",
        buildBandLow: 150000,
        buildBandHigh: 250000,
        lotSqft: 6000,
        aduSqft: 650,
        neighborhood: "Seattle, WA",
        zip: "98101",
        state: "WA",
        config: {
          footprint: 650,
          width: 20,
          length: 32.5,
          height: 12,
          roof: "shed",
          finish: "cedar",
          includeOpenings: true,
        },
        rentBand: 2000,
        paybackYears: 15,
        zoningStatus: "Compliant",
        matchReasons: ["Seattle"],
      },
      matchedBuilderIds: ["builder-1"],
      status: "submitted",
      ownerVerified: true,
      headStartUntil: null,
      createdAt: "2026-09-27T00:00:00Z",
      updatedAt: null,
    },
    response: {
      builderId: "builder-1",
      status,
      createdAt: null,
      updatedAt: null,
    },
    unlocked,
  });

  describe("recordPendingLeadUnlockAttempt", () => {
    it("stores pending attempt when consent is granted", () => {
      recordPendingLeadUnlockAttempt({
        requestId: "lead-123",
        triageStatus: "new",
      });

      const stored = sessionStorage.getItem("lf:analytics-pending-lead-unlock");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.requestId).toBe("lead-123");
      expect(parsed.triageStatus).toBe("new");
    });

    it("does not store pending attempt when consent is denied", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("denied");
      recordPendingLeadUnlockAttempt({
        requestId: "lead-123",
        triageStatus: "new",
      });

      expect(sessionStorage.getItem("lf:analytics-pending-lead-unlock")).toBeNull();
    });
  });

  describe("reconcilePendingLeadUnlock", () => {
    it("reconciles confirmed unlock and emits trackBuilderLeadUnlocked", () => {
      recordPendingLeadUnlockAttempt({
        requestId: "lead-123",
        triageStatus: "interested",
      });

      const items = [createMockItem("lead-123", true, "interested")];
      reconcilePendingLeadUnlock(items);

      expect(mockTrack).toHaveBeenCalledWith({
        unlock_mode: "paid",
        triage_status: "interested",
      });
      // Cleared after reconciliation
      expect(sessionStorage.getItem("lf:analytics-pending-lead-unlock")).toBeNull();
    });

    it("does not emit if the lead is not yet unlocked in the items list", () => {
      recordPendingLeadUnlockAttempt({
        requestId: "lead-123",
        triageStatus: "new",
      });

      const items = [createMockItem("lead-123", false, "new")];
      reconcilePendingLeadUnlock(items);

      expect(mockTrack).not.toHaveBeenCalled();
      // Retained for next reconciliation attempt
      expect(sessionStorage.getItem("lf:analytics-pending-lead-unlock")).not.toBeNull();
    });

    it("clears pending attempt if consent is denied on return", () => {
      recordPendingLeadUnlockAttempt({
        requestId: "lead-123",
        triageStatus: "new",
      });

      vi.spyOn(consent, "readConsent").mockReturnValue("denied");
      const items = [createMockItem("lead-123", true, "new")];
      reconcilePendingLeadUnlock(items);

      expect(mockTrack).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("lf:analytics-pending-lead-unlock")).toBeNull();
    });

    it("deduplicates multiple reconciliations for the same lead", () => {
      recordPendingLeadUnlockAttempt({
        requestId: "lead-456",
        triageStatus: "new",
      });

      const items = [createMockItem("lead-456", true, "new")];
      reconcilePendingLeadUnlock(items);
      expect(mockTrack).toHaveBeenCalledTimes(1);

      // Subsequent attempt for same lead
      recordPendingLeadUnlockAttempt({
        requestId: "lead-456",
        triageStatus: "new",
      });
      reconcilePendingLeadUnlock(items);
      expect(mockTrack).toHaveBeenCalledTimes(1);
    });
  });

  describe("recordInPlaceLeadUnlock", () => {
    it("records credit unlock and emits event", () => {
      recordInPlaceLeadUnlock({
        requestId: "lead-credit-1",
        unlockMode: "credit",
        triageStatus: "new",
      });

      expect(mockTrack).toHaveBeenCalledWith({
        unlock_mode: "credit",
        triage_status: "new",
      });
    });

    it("records demo unlock and emits event", () => {
      recordInPlaceLeadUnlock({
        requestId: "lead-demo-1",
        unlockMode: "demo",
        triageStatus: "interested",
      });

      expect(mockTrack).toHaveBeenCalledWith({
        unlock_mode: "demo",
        triage_status: "interested",
      });
    });

    it("deduplicates repeated calls for the same lead", () => {
      recordInPlaceLeadUnlock({
        requestId: "lead-credit-dup",
        unlockMode: "credit",
        triageStatus: "new",
      });
      recordInPlaceLeadUnlock({
        requestId: "lead-credit-dup",
        unlockMode: "credit",
        triageStatus: "new",
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it("suppresses emission when consent is denied", () => {
      vi.spyOn(consent, "readConsent").mockReturnValue("denied");
      recordInPlaceLeadUnlock({
        requestId: "lead-denied",
        unlockMode: "credit",
        triageStatus: "new",
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  describe("clearPendingLeadUnlock", () => {
    it("removes the pending unlock storage key", () => {
      sessionStorage.setItem("lf:analytics-pending-lead-unlock", "test");
      clearPendingLeadUnlock();
      expect(sessionStorage.getItem("lf:analytics-pending-lead-unlock")).toBeNull();
    });
  });
});
