import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callCloudFunction: vi.fn(),
  getFirebaseClients: vi.fn(),
  openURL: vi.fn(),
  canOpenURL: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("./firebase", () => ({
  callCloudFunction: mocks.callCloudFunction,
  getFirebaseClients: mocks.getFirebaseClients,
}));

vi.mock("react-native", () => ({
  Linking: {
    openURL: mocks.openURL,
    canOpenURL: mocks.canOpenURL,
  },
  Platform: {
    OS: "ios",
  },
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mocks.getDoc,
  doc: mocks.doc,
}));

import {
  getStripeOnboardingUrl,
  checkStripeStatus,
  fetchStripeStatusFromFirestore,
} from "./stripeService";

describe("stripeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStripeOnboardingUrl", () => {
    it("returns a mock URL without opening it when firebase is not configured", async () => {
      mocks.getFirebaseClients.mockReturnValue(null);

      const url = await getStripeOnboardingUrl("mock-builder");

      // Pure data fetcher — the caller (e.g. BuilderDashboard) is responsible
      // for opening the URL via Linking.openURL. The service must not open it.
      expect(url).toBe("https://connect.stripe.com/express/oauth/authorize?state=mock-builder");
      expect(mocks.openURL).not.toHaveBeenCalled();
      expect(mocks.callCloudFunction).not.toHaveBeenCalled();
    });

    it("calls Cloud Function with no userId payload and returns the URL", async () => {
      mocks.getFirebaseClients.mockReturnValue({ db: {}, functions: {} });
      mocks.callCloudFunction.mockResolvedValue({ url: "https://stripe.com/oauth?state=builder-123" });

      const url = await getStripeOnboardingUrl("builder-123");

      expect(url).toBe("https://stripe.com/oauth?state=builder-123");
      // The backend derives identity from request.auth.uid, so the client
      // sends an empty payload — never a client-supplied userId.
      expect(mocks.callCloudFunction).toHaveBeenCalledWith("getStripeOnboardingUrl", {});
      expect(mocks.openURL).not.toHaveBeenCalled();
    });
  });

  describe("checkStripeStatus", () => {
    it("returns active for mock environment when firebase is not configured", async () => {
      mocks.getFirebaseClients.mockReturnValue(null);

      const status = await checkStripeStatus("mock-builder");

      expect(status).toBe("active");
      expect(mocks.callCloudFunction).not.toHaveBeenCalled();
    });

    it("calls checkStripeStatus Cloud Function with no userId payload", async () => {
      mocks.getFirebaseClients.mockReturnValue({ db: {}, functions: {} });
      mocks.callCloudFunction.mockResolvedValue({ stripeConnectStatus: "active" });

      const status = await checkStripeStatus("builder-456");

      expect(status).toBe("active");
      expect(mocks.callCloudFunction).toHaveBeenCalledWith("checkStripeStatus", {});
    });
  });

  describe("fetchStripeStatusFromFirestore", () => {
    it("returns idle if firebase is not configured", async () => {
      mocks.getFirebaseClients.mockReturnValue(null);

      const status = await fetchStripeStatusFromFirestore("mock-builder");

      expect(status).toBe("idle");
    });

    it("fetches doc from firestore and returns status", async () => {
      const mockDb = {};
      const mockDocRef = {};
      mocks.getFirebaseClients.mockReturnValue({ db: mockDb });
      mocks.doc.mockReturnValue(mockDocRef);
      mocks.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ stripeConnectStatus: "pending" }),
      });

      const status = await fetchStripeStatusFromFirestore("builder-789");

      expect(status).toBe("pending");
      expect(mocks.doc).toHaveBeenCalledWith(mockDb, "userProfiles", "builder-789");
      expect(mocks.getDoc).toHaveBeenCalledWith(mockDocRef);
    });
  });
});
