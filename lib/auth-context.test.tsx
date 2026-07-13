import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

const parcelHandoffMocks = vi.hoisted(() => ({
  clearInitialParcel: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  app: {},
  auth: {},
  db: {},
}));

vi.mock("@/lib/parcel-handoff", () => ({
  clearInitialParcel: parcelHandoffMocks.clearInitialParcel,
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  onAuthStateChanged: authMocks.onAuthStateChanged,
  sendPasswordResetEmail: authMocks.sendPasswordResetEmail,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signInWithPopup: authMocks.signInWithPopup,
  signOut: authMocks.signOut,
  updateProfile: authMocks.updateProfile,
}));

vi.mock("firebase/firestore", () => ({
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  serverTimestamp: firestoreMocks.serverTimestamp,
  setDoc: firestoreMocks.setDoc,
}));

function GoogleBuilderButton() {
  const { signInWithGoogle } = useAuth();
  return (
    <button type="button" onClick={() => signInWithGoogle("builder")}>
      Continue with Google
    </button>
  );
}

function EmailBuilderButton() {
  const { signUp } = useAuth();
  return (
    <button
      type="button"
      onClick={() =>
        signUp("builder@example.com", "password123", "Builder Person", "builder")
      }
    >
      Create builder
    </button>
  );
}

describe("AuthProvider profile creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.onAuthStateChanged.mockReturnValue(() => {});
    firestoreMocks.doc.mockReturnValue({ path: "users/user-1" });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    firestoreMocks.serverTimestamp.mockReturnValue("server-time");
  });

  it("creates a builder profile for Google registration", async () => {
    authMocks.signInWithPopup.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "builder@example.com",
        displayName: "Builder Person",
      },
    });

    render(
      <AuthProvider>
        <GoogleBuilderButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
        { path: "users/user-1" },
        expect.objectContaining({
          displayName: "Builder Person",
          email: "builder@example.com",
          role: "builder",
        }),
        { merge: true },
      );
    });
  });

  it("creates a builder profile for email registration", async () => {
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "builder@example.com",
        displayName: null,
      },
    });
    authMocks.updateProfile.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <EmailBuilderButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create builder" }));

    await waitFor(() => {
      expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
        { path: "users/user-1" },
        expect.objectContaining({
          displayName: "Builder Person",
          email: "builder@example.com",
          role: "builder",
        }),
        { merge: true },
      );
    });
  });

  it("clears the stashed parcel when the auth session drops externally", async () => {
    // Capture the onAuthStateChanged listener so we can simulate Firebase
    // reporting a signed-out state that never went through logout().
    let authListener: ((u: unknown) => void) | undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb;
      return () => {};
    });

    render(
      <AuthProvider>
        <div>ready</div>
      </AuthProvider>,
    );

    expect(authListener).toBeDefined();

    // Token expiry / revocation surfaces as onAuthStateChanged(..., null).
    await act(async () => {
      await authListener?.(null);
    });

    expect(parcelHandoffMocks.clearInitialParcel).toHaveBeenCalled();
  });
});
