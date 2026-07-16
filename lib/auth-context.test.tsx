import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import { auth } from "./firebase";

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

const accountSettingsMocks = vi.hoisted(() => ({
  changeAccountEmail: vi.fn(),
  changeAccountPassword: vi.fn(),
  sendVerification: vi.fn(),
  updateAccountName: vi.fn(),
}));

vi.mock("./account-settings", () => accountSettingsMocks);

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
});

function AccountControls() {
  const { updateAccountName, changeAccountEmail, profile } = useAuth();
  return (
    <>
      <button
        type="button"
        onClick={() => updateAccountName("Alma Reyes").catch(() => undefined)}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() =>
          changeAccountEmail("next@example.com", "current-pass").catch(
            () => undefined,
          )
        }
      >
        Change email
      </button>
      <span data-testid="profile-name">{profile?.displayName ?? "none"}</span>
    </>
  );
}

describe("AuthProvider account settings actions", () => {
  const currentUser = {
    uid: "user-1",
    email: "owner@example.com",
    displayName: "Old Name",
  };
  let authListener: ((u: unknown) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    authListener = undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb as (u: unknown) => void;
      return () => {};
    });
    firestoreMocks.doc.mockReturnValue({ path: "users/user-1" });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    firestoreMocks.serverTimestamp.mockReturnValue("server-time");
    (auth as { currentUser?: unknown }).currentUser = currentUser;
  });

  it("updates the profile after a successful name write", async () => {
    accountSettingsMocks.updateAccountName.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await act(async () => {
      await authListener?.(currentUser);
    });
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Old Name");

    await userEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(accountSettingsMocks.updateAccountName).toHaveBeenCalledWith(
      currentUser,
      "Alma Reyes",
    );
    await waitFor(() => {
      expect(screen.getByTestId("profile-name")).toHaveTextContent("Alma Reyes");
    });
  });

  it("leaves the prior profile intact when the name write is rejected", async () => {
    accountSettingsMocks.updateAccountName.mockRejectedValue(
      new Error("auth/requires-recent-login"),
    );

    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await act(async () => {
      await authListener?.(currentUser);
    });
    const writesBeforeClick = firestoreMocks.setDoc.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(screen.getByTestId("profile-name")).toHaveTextContent("Old Name");
    expect(firestoreMocks.setDoc.mock.calls.length).toBe(writesBeforeClick);
  });

  it("delegates email changes to the account-settings boundary", async () => {
    accountSettingsMocks.changeAccountEmail.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <AccountControls />
      </AuthProvider>,
    );
    await act(async () => {
      await authListener?.(currentUser);
    });

    await userEvent.click(screen.getByRole("button", { name: "Change email" }));

    expect(accountSettingsMocks.changeAccountEmail).toHaveBeenCalledWith(
      currentUser,
      "next@example.com",
      "current-pass",
    );
  });
});
