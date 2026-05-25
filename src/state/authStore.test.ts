import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/firebase", () => ({
  getFirebaseClients: vi.fn(() => null),
}));

import { useAuthStore } from "./authStore";

describe("authStore (mock mode)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: null,
      currentRole: null,
      authInitialized: false,
      isAuthModalOpen: false,
      authModalTab: "login",
      error: null,
      loading: false,
    });
  });

  it("initializes with mock guest user", () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    const state = useAuthStore.getState();
    expect(state.authInitialized).toBe(true);
    expect(state.currentUser).not.toBeNull();
    expect(state.currentUser?.isAnonymous).toBe(true);
    expect(state.currentUser?.uid).toBe("mock-guest-123");
    expect(state.currentRole).toBeNull();
  });

  it("signs in a mock user with valid credentials", async () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    await store.signIn("test@example.com", "password123");

    const state = useAuthStore.getState();
    expect(state.error).toBeNull();
    expect(state.currentUser?.isAnonymous).toBe(false);
    expect(state.currentUser?.email).toBe("test@example.com");
    expect(state.isAuthModalOpen).toBe(false);
  });

  it("fails to sign in with too short password", async () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    await store.signIn("test@example.com", "123");

    const state = useAuthStore.getState();
    expect(state.error).not.toBeNull();
    expect(state.currentUser?.isAnonymous).toBe(true);
  });

  it("registers a homeowner and persists role", async () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    await store.signUp("homeowner@example.com", "securepass", "homeowner");

    const state = useAuthStore.getState();
    expect(state.error).toBeNull();
    expect(state.currentUser?.isAnonymous).toBe(false);
    expect(state.currentUser?.email).toBe("homeowner@example.com");
    expect(state.currentRole).toBe("homeowner");
  });

  it("registers a builder and persists role", async () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    await store.signUp("builder@example.com", "securepass", "builder");

    const state = useAuthStore.getState();
    expect(state.error).toBeNull();
    expect(state.currentRole).toBe("builder");
    expect((state.currentUser as { role?: string })?.role).toBe("builder");
  });

  it("signs out and clears role back to anonymous guest", async () => {
    const store = useAuthStore.getState();
    store.initializeAuth();

    await store.signUp("user@example.com", "password123", "builder");
    let state = useAuthStore.getState();
    expect(state.currentRole).toBe("builder");

    await store.signOut();
    state = useAuthStore.getState();
    expect(state.currentUser?.isAnonymous).toBe(true);
    expect(state.currentUser?.email).toBeNull();
    expect(state.currentRole).toBeNull();
  });
});
