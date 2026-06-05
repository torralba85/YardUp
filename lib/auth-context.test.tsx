import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

const firebaseAuth = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

const firestore = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("./firebase", () => ({
  auth: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  ...firebaseAuth,
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
}));

vi.mock("firebase/firestore", () => firestore);

function GoogleAuthProbe() {
  const { signInWithGoogle } = useAuth();

  return (
    <button type="button" onClick={() => signInWithGoogle("builder")}>
      Continue with Google as builder
    </button>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAuth.onAuthStateChanged.mockReturnValue(() => {});
    firebaseAuth.signInWithPopup.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "builder@example.com",
        displayName: "Builder User",
      },
    });
    firestore.doc.mockReturnValue("user-doc");
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    firestore.serverTimestamp.mockReturnValue("server-timestamp");
    firestore.setDoc.mockResolvedValue(undefined);
  });

  it("creates new Google profiles with the selected builder role", async () => {
    render(
      <AuthProvider>
        <GoogleAuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google as builder/i }),
    );

    await waitFor(() => {
      expect(firestore.setDoc).toHaveBeenCalledWith(
        "user-doc",
        expect.objectContaining({
          displayName: "Builder User",
          email: "builder@example.com",
          role: "builder",
        }),
        { merge: true },
      );
    });
  });
});
