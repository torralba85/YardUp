import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAnonymously = vi.fn();
const getFirebaseClients = vi.fn();

vi.mock("firebase/auth", () => ({ signInAnonymously }));
vi.mock("./firebase", () => ({ getFirebaseClients }));

describe("ensureFirebaseSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns false when Firebase is not configured", async () => {
    getFirebaseClients.mockReturnValue(null);
    const { ensureFirebaseSession } = await import("./session");

    await expect(ensureFirebaseSession()).resolves.toBe(false);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when Firebase is configured and no user exists", async () => {
    const auth = { currentUser: null };
    getFirebaseClients.mockReturnValue({ auth });
    signInAnonymously.mockResolvedValue({ user: { uid: "anon-1" } });
    const { ensureFirebaseSession } = await import("./session");

    await expect(ensureFirebaseSession()).resolves.toBe(true);
    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });
});
