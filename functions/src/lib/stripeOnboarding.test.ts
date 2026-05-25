import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => {
      if (name === "userProfiles") {
        return {
          doc: (id: string) => {
            mocks.doc(id);
            return {
              set: mocks.set,
              update: mocks.update,
              get: mocks.get,
            };
          },
        };
      }
      return {
        add: vi.fn().mockResolvedValue(undefined),
      };
    },
  }),
  Timestamp: { now: vi.fn().mockReturnValue({ toDate: () => new Date() }) },
}));

import { getStripeOnboardingUrlHelper, checkStripeStatusHelper } from "./stripeOnboarding";

describe("Stripe onboarding flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStripeOnboardingUrlHelper", () => {
    it("generates a mock Stripe Connect URL and updates userProfile status to pending", async () => {
      mocks.set.mockResolvedValue(undefined);

      const url = await getStripeOnboardingUrlHelper("builder-123");

      expect(url).toBe("https://connect.stripe.com/express/oauth/authorize?state=builder-123");
      expect(mocks.doc).toHaveBeenCalledWith("builder-123");
      expect(mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeConnectStatus: "pending",
        }),
        { merge: true }
      );
    });
  });

  describe("checkStripeStatusHelper", () => {
    it("throws error if user profile does not exist", async () => {
      mocks.get.mockResolvedValue({ exists: false });

      await expect(checkStripeStatusHelper("builder-456")).rejects.toThrow("User profile not found");
      expect(mocks.doc).toHaveBeenCalledWith("builder-456");
    });

    it("returns idle status if stripeConnectStatus is not set", async () => {
      mocks.get.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const status = await checkStripeStatusHelper("builder-456");

      expect(status).toBe("idle");
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it("transitions pending onboarding to active", async () => {
      mocks.get.mockResolvedValue({
        exists: true,
        data: () => ({ stripeConnectStatus: "pending" }),
      });
      mocks.update.mockResolvedValue(undefined);

      const status = await checkStripeStatusHelper("builder-789");

      expect(status).toBe("active");
      expect(mocks.doc).toHaveBeenCalledWith("builder-789");
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeConnectStatus: "active",
        })
      );
    });

    it("leaves already active status unchanged", async () => {
      mocks.get.mockResolvedValue({
        exists: true,
        data: () => ({ stripeConnectStatus: "active" }),
      });

      const status = await checkStripeStatusHelper("builder-999");

      expect(status).toBe("active");
      expect(mocks.update).not.toHaveBeenCalled();
    });
  });
});
