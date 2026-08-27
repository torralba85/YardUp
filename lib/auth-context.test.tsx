import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  CURRENT_LEGAL_CONSENT,
  useAuth,
} from "./auth-context";

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

const oauthProvider = vi.hoisted(() => {
  const instances: Array<{ providerId: string; scopes: string[] }> = [];
  class OAuthProvider {
    providerId: string;
    scopes: string[] = [];
    constructor(id: string) {
      this.providerId = id;
      instances.push(this);
    }
    addScope(scope: string) {
      this.scopes.push(scope);
    }
  }
  return { OAuthProvider, instances };
});

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  OAuthProvider: oauthProvider.OAuthProvider,
  onAuthStateChanged: authMocks.onAuthStateChanged,
  sendPasswordResetEmail: authMocks.sendPasswordResetEmail,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signInWithPopup: authMocks.signInWithPopup,
  signOut: authMocks.signOut,
  updateProfile: authMocks.updateProfile,
  sendEmailVerification: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
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
    <button type="button" onClick={() => signInWithGoogle("builder", CURRENT_LEGAL_CONSENT)}>
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
        signUp(
          "builder@example.com",
          "password123",
          "Builder Person",
          "builder",
          CURRENT_LEGAL_CONSENT,
        )
      }
    >
      Create builder
    </button>
  );
}

function AppleUserButton() {
  const { signInWithApple } = useAuth();
  return (
    <button type="button" onClick={() => signInWithApple("user", CURRENT_LEGAL_CONSENT)}>
      Continue with Apple
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
          legalConsent: expect.objectContaining({
            termsVersion: CURRENT_LEGAL_CONSENT.termsVersion,
            privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
            adultConfirmed: true,
            acceptedAt: "server-time",
          }),
        }),
        { merge: true },
      );
    });
  });

  it("records the consent receipt when an existing user signs in with Google", async () => {
    // A returning social user: the profile already exists, and signInWithGoogle
    // passes neither displayName nor email. The receipt must still be written —
    // prompting for consent and then discarding it is worse than not asking.
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "builder",
        displayName: "Builder Person",
        email: "builder@example.com",
      }),
    });
    authMocks.signInWithPopup.mockResolvedValue({
      user: { uid: "user-1", email: "builder@example.com", displayName: "Builder Person" },
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
          legalConsent: expect.objectContaining({
            termsVersion: CURRENT_LEGAL_CONSENT.termsVersion,
            privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
            adultConfirmed: true,
            acceptedAt: "server-time",
          }),
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
          legalConsent: expect.objectContaining({
            termsVersion: CURRENT_LEGAL_CONSENT.termsVersion,
            privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
            adultConfirmed: true,
            acceptedAt: "server-time",
          }),
        }),
        { merge: true },
      );
    });
  });

  it("clears the stashed parcel when an authenticated session drops externally", async () => {
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

    // Establish an authenticated session first...
    await act(async () => {
      await authListener?.({ uid: "user-1", email: "a@example.com", displayName: null });
    });
    // ...then a token expiry / revocation surfaces as (..., null).
    await act(async () => {
      await authListener?.(null);
    });

    expect(parcelHandoffMocks.clearInitialParcel).toHaveBeenCalled();
  });

  it("keeps a stashed parcel on the initial guest/null auth state", async () => {
    // The listener fires once with null before any sign-in; clearing here would
    // wipe a landing address handoff before the studio's ParcelProvider reads it.
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

    await act(async () => {
      await authListener?.(null);
    });

    expect(parcelHandoffMocks.clearInitialParcel).not.toHaveBeenCalled();
  });

  it("requests only name and email from Apple", async () => {
    oauthProvider.instances.length = 0;
    authMocks.signInWithPopup.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "relay@privaterelay.appleid.com",
        displayName: null,
      },
    });

    render(
      <AuthProvider>
        <AppleUserButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Continue with Apple" }));

    await waitFor(() => {
      expect(authMocks.signInWithPopup).toHaveBeenCalled();
    });
    expect(oauthProvider.instances[0]?.providerId).toBe("apple.com");
    expect(oauthProvider.instances[0]?.scopes).toEqual(
      expect.arrayContaining(["email", "name"]),
    );
  });
});
