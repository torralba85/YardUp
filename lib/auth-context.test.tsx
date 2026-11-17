import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  CURRENT_LEGAL_CONSENT,
  useAuth,
} from "./auth-context";
import { hasMemberSessionHint } from "./member-session-hint";

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  deleteUser: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  linkWithCredential: vi.fn(),
  linkWithPopup: vi.fn(),
  linkWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
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

const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; email: string; displayName: string } },
}));

vi.mock("@/lib/firebase", () => ({
  app: {},
  auth: firebaseMocks.auth,
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
  deleteUser: authMocks.deleteUser,
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  OAuthProvider: oauthProvider.OAuthProvider,
  onAuthStateChanged: authMocks.onAuthStateChanged,
  sendPasswordResetEmail: authMocks.sendPasswordResetEmail,
  signInAnonymously: authMocks.signInAnonymously,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signInWithPopup: authMocks.signInWithPopup,
  signInWithRedirect: authMocks.signInWithRedirect,
  linkWithCredential: authMocks.linkWithCredential,
  linkWithPopup: authMocks.linkWithPopup,
  linkWithRedirect: authMocks.linkWithRedirect,
  getRedirectResult: authMocks.getRedirectResult,
  signOut: authMocks.signOut,
  updateProfile: authMocks.updateProfile,
  sendEmailVerification: authMocks.sendEmailVerification,
  EmailAuthProvider: { credential: vi.fn((email: string, password: string) => ({ email, password })) },
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

function GoogleFailureButton() {
  const { signInWithGoogle } = useAuth();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() =>
          signInWithGoogle("user", CURRENT_LEGAL_CONSENT).catch(() => setFailed(true))
        }
      >
        Continue with Google
      </button>
      {failed ? <span>Consent failed</span> : null}
    </>
  );
}

function EmailFailureButton() {
  const { signUp } = useAuth();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() =>
          signUp(
            "builder@example.com",
            "password123",
            "Builder Person",
            "builder",
            CURRENT_LEGAL_CONSENT,
          ).catch(() => setFailed(true))
        }
      >
        Create builder
      </button>
      {failed ? <span>Consent failed</span> : null}
    </>
  );
}

describe("AuthProvider profile creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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

  it("preserves the original receipt when an existing user already accepted the current versions", async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "builder",
        displayName: "Builder Person",
        email: "builder@example.com",
        legalConsent: {
          ...CURRENT_LEGAL_CONSENT,
          acceptedAt: "original-server-time",
        },
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
      expect(firestoreMocks.getDoc).toHaveBeenCalledWith({ path: "users/user-1" });
    });
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("signs a social user back out when the consent receipt cannot be stored", async () => {
    authMocks.signInWithPopup.mockResolvedValue({
      user: { uid: "user-1", email: "user@example.com", displayName: "User Person" },
    });
    firestoreMocks.setDoc.mockRejectedValueOnce(new Error("Firestore unavailable"));

    render(
      <AuthProvider>
        <GoogleFailureButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByText("Consent failed")).toBeInTheDocument();
    expect(authMocks.signOut).toHaveBeenCalled();
  });

  it("reports whether a social sign-in created the profile, including on a retry", async () => {
    // A first attempt whose profile write fails leaves the Firebase Auth account
    // behind, so the retry is not `isNewUser` but is still the registration.
    authMocks.signInWithPopup.mockResolvedValue({
      user: { uid: "user-1", email: "user@example.com", displayName: "User Person" },
    });
    firestoreMocks.setDoc.mockRejectedValueOnce(new Error("Firestore unavailable"));
    const results: Array<boolean | "failed"> = [];
    function Probe() {
      const { signInWithGoogle } = useAuth();
      return (
        <button
          type="button"
          onClick={() =>
            signInWithGoogle("user", CURRENT_LEGAL_CONSENT).then(
              (result) => results.push(result.profileCreated),
              () => results.push("failed"),
            )
          }
        >
          Continue with Google
        </button>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const button = screen.getByRole("button", { name: "Continue with Google" });

    await userEvent.click(button);
    await waitFor(() => expect(results).toEqual(["failed"]));
    await userEvent.click(button);
    await waitFor(() => expect(results).toEqual(["failed", true]));

    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user", legalConsent: { ...CURRENT_LEGAL_CONSENT } }),
    });
    await userEvent.click(button);
    await waitFor(() => expect(results).toEqual(["failed", true, false]));
  });

  it("rolls back a new email account when the consent receipt cannot be stored", async () => {
    const createdUser = {
      uid: "user-1",
      email: "builder@example.com",
      displayName: null,
    };
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({ user: createdUser });
    authMocks.updateProfile.mockResolvedValue(undefined);
    firestoreMocks.setDoc.mockRejectedValueOnce(new Error("Firestore unavailable"));

    render(
      <AuthProvider>
        <EmailFailureButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create builder" }));

    expect(await screen.findByText("Consent failed")).toBeInTheDocument();
    expect(authMocks.deleteUser).toHaveBeenCalledWith(createdUser);
  });

  it("does not let a second provider create a homeowner profile during builder signup", async () => {
    const listeners: Array<(u: unknown) => Promise<void>> = [];
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listeners.push(cb);
      return () => {};
    });
    const user = { uid: "builder-new", email: "builder@example.com", displayName: null };
    authMocks.createUserWithEmailAndPassword.mockImplementation(async () => {
      await Promise.all(listeners.map((listener) => listener(user)));
      return { user };
    });
    authMocks.updateProfile.mockResolvedValue(undefined);
    render(<><AuthProvider><EmailBuilderButton /></AuthProvider><AuthProvider><span>Second auth island</span></AuthProvider></>);
    await userEvent.click(screen.getByRole("button", { name: "Create builder" }));
    await waitFor(() => expect(firestoreMocks.setDoc).toHaveBeenCalled());
    expect(firestoreMocks.getDoc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ role: "builder" }), { merge: true });
  });

  it("does not publish a registration session until its consent write succeeds", async () => {
    let listener: (u: unknown) => Promise<void> = async () => {};
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => { listener = cb; return () => {}; });
    const user = { uid: "new-member", email: "builder@example.com", displayName: null };
    authMocks.createUserWithEmailAndPassword.mockImplementation(async () => { await listener(user); return { user }; });
    let finish!: () => void;
    firestoreMocks.setDoc.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    function Session() {
      const { user } = useAuth();
      return <span data-testid="registration-session">{user?.uid ?? "guest"}</span>;
    }
    render(<AuthProvider><EmailBuilderButton /><Session /></AuthProvider>);
    await act(async () => { await listener(null); });
    await userEvent.click(screen.getByRole("button", { name: "Create builder" }));
    expect(screen.getByTestId("registration-session")).toHaveTextContent("guest");
    await act(async () => { finish(); });
    expect(screen.getByTestId("registration-session")).toHaveTextContent("new-member");
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

  it("does not restore a delayed profile after sign-out", async () => {
    let listener: (u: unknown) => Promise<void> = async () => {};
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return () => {};
    });
    let resolveProfile!: (value: unknown) => void;
    firestoreMocks.getDoc.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
    function Session() {
      const { user, profile } = useAuth();
      return <div data-testid="session">{user?.uid ?? "guest"}:{profile?.uid ?? "none"}</div>;
    }
    render(<AuthProvider><Session /></AuthProvider>);
    let pending!: Promise<void>;
    await act(async () => { pending = listener({ uid: "old-user", email: "a@example.com" }); });
    await act(async () => { await listener(null); });
    await act(async () => {
      resolveProfile({ exists: () => true, data: () => ({ role: "builder" }) });
      await pending;
    });
    expect(screen.getByTestId("session")).toHaveTextContent("guest:none");
  });

  it("waits for Firebase sign-out before clearing state and replacing the page", async () => {
    let listener: (u: unknown) => Promise<void> = async () => {};
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return () => {};
    });
    let finish!: () => void;
    authMocks.signOut.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    let logout!: () => Promise<void>;
    function Session() {
      const state = useAuth();
      useEffect(() => { logout = state.logout; }, [state.logout]);
      return <div data-testid="logout-session">{state.user?.uid ?? "guest"}:{state.profile?.uid ?? "none"}</div>;
    }
    render(<AuthProvider><Session /></AuthProvider>);
    await act(async () => { await listener({ uid: "member", email: "a@example.com" }); });
    const replace = vi.fn();
    const originalWindow = window;
    vi.stubGlobal("window", new Proxy(originalWindow, {
      get(target, key) { return key === "location" ? { replace } : Reflect.get(target, key); },
    }));
    try {
      let pending!: Promise<void>;
      await act(async () => { pending = logout(); });
      expect(replace).not.toHaveBeenCalled();
      expect(screen.getByTestId("logout-session")).toHaveTextContent("member:member");
      await act(async () => { finish(); await pending; });
      expect(replace).toHaveBeenCalledWith("/");
      expect(screen.getByTestId("logout-session")).toHaveTextContent("guest:none");
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  // The landing renders outside the Firebase route group and decides whether to
  // mount its auth island from this hint alone. A hint left set after sign-out
  // puts the SDK back on every signed-out visit; one never set hides the member
  // navigation from the people it exists for.
  it("keeps the landing session hint in step with the session", async () => {
    let listener: (u: unknown) => Promise<void> = async () => {};
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return () => {};
    });
    authMocks.signOut.mockResolvedValueOnce(undefined);
    let logout!: () => Promise<void>;
    function Session() {
      const state = useAuth();
      useEffect(() => { logout = state.logout; }, [state.logout]);
      return <div data-testid="hint-session">{state.user?.uid ?? "guest"}</div>;
    }
    render(<AuthProvider><Session /></AuthProvider>);
    expect(hasMemberSessionHint()).toBe(false);

    await act(async () => { await listener({ uid: "member", email: "a@example.com" }); });
    expect(hasMemberSessionHint()).toBe(true);

    // An expiry or revocation ends the session without passing through logout.
    await act(async () => { await listener(null); });
    expect(hasMemberSessionHint()).toBe(false);

    await act(async () => { await listener({ uid: "member", email: "a@example.com" }); });
    const originalWindow = window;
    vi.stubGlobal("window", new Proxy(originalWindow, {
      get(target, key) { return key === "location" ? { replace: vi.fn() } : Reflect.get(target, key); },
    }));
    try {
      await act(async () => { await logout(); });
      expect(hasMemberSessionHint()).toBe(false);
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("keeps the session visible and reports a failed logout", async () => {
    let listener: (u: unknown) => Promise<void> = async () => {};
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return () => {};
    });
    authMocks.signOut.mockRejectedValueOnce(new Error("offline"));
    function Session() {
      const { user, logout } = useAuth();
      return <button onClick={() => void logout()}>{user ? "Sign out member" : "Guest"}</button>;
    }
    render(<AuthProvider><Session /></AuthProvider>);
    await act(async () => { await listener({ uid: "member", email: "a@example.com" }); });
    parcelHandoffMocks.clearInitialParcel.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Sign out member" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out");
    expect(screen.getByRole("button", { name: "Sign out member" })).toBeInTheDocument();
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

  it("marks legalConsentCurrent false for outdated receipt and true when current", async () => {
    let authListener: ((u: unknown) => Promise<void>) | undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb;
      return () => {};
    });

    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "user",
        email: "user@example.com",
        legalConsent: {
          termsVersion: "2026-08-26",
          privacyVersion: "2026-08-26",
          adultConfirmed: true,
        },
      }),
    });

    function Probe() {
      const { profile } = useAuth();
      return <span data-testid="consent-status">{String(profile?.legalConsentCurrent)}</span>;
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      await authListener?.({ uid: "user-1", email: "user@example.com" });
    });

    expect(screen.getByTestId("consent-status")).toHaveTextContent("false");

    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "user",
        email: "user@example.com",
        legalConsent: {
          ...CURRENT_LEGAL_CONSENT,
        },
      }),
    });

    await act(async () => {
      await authListener?.({ uid: "user-1", email: "user@example.com" });
    });

    expect(screen.getByTestId("consent-status")).toHaveTextContent("true");
  });

  it("leaves legalConsentCurrent unknown when the profile read fails", async () => {
    let authListener: ((u: unknown) => Promise<void>) | undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb;
      return () => {};
    });
    firestoreMocks.getDoc.mockRejectedValue(new Error("offline"));

    function Probe() {
      const { profile } = useAuth();
      return (
        <span data-testid="consent-status">
          {profile ? String(profile.legalConsentCurrent) : "no-profile"}
        </span>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      await authListener?.({ uid: "user-1", email: "user@example.com" });
    });

    // A transient read failure must not gate an account that already accepted.
    expect(screen.getByTestId("consent-status")).toHaveTextContent("undefined");
  });

  it("re-reads the profile when accepting fails, so a second tab's gate can close", async () => {
    let authListener: ((u: unknown) => Promise<void>) | undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb;
      return () => {};
    });
    const user = { uid: "user-1", email: "user@example.com", displayName: "Alma Reyes" };
    firebaseMocks.auth.currentUser = user;
    const outdated = {
      exists: () => true,
      data: () => ({
        role: "user",
        email: "user@example.com",
        legalConsent: { termsVersion: "2026-08-26", privacyVersion: "2026-08-26", adultConfirmed: true },
      }),
    };
    firestoreMocks.getDoc.mockResolvedValue(outdated);

    let acceptError: unknown;
    function Probe() {
      const { profile, acceptCurrentLegalTerms } = useAuth();
      return (
        <>
          <span data-testid="consent-status">{String(profile?.legalConsentCurrent)}</span>
          <button
            type="button"
            onClick={() => acceptCurrentLegalTerms().catch((error) => { acceptError = error; })}
          >
            Accept
          </button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await authListener?.(user);
    });
    expect(screen.getByTestId("consent-status")).toHaveTextContent("false");

    // Another tab already accepted: the rules reject this write, and the
    // stored receipt is now current.
    firestoreMocks.setDoc.mockRejectedValueOnce({ code: "permission-denied" });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user", email: "user@example.com", legalConsent: { ...CURRENT_LEGAL_CONSENT } }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(acceptError).toEqual({ code: "permission-denied" });
      expect(screen.getByTestId("consent-status")).toHaveTextContent("true");
    });
  });

  it("updates consent and refreshes profile on acceptCurrentLegalTerms", async () => {
    let authListener: ((u: unknown) => Promise<void>) | undefined;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authListener = cb;
      return () => {};
    });

    const user = { uid: "user-1", email: "user@example.com", displayName: "Alma Reyes" };
    firebaseMocks.auth.currentUser = user;

    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "user",
        email: "user@example.com",
        displayName: "Alma Reyes",
        legalConsent: {
          termsVersion: "2026-08-26",
          privacyVersion: "2026-08-26",
          adultConfirmed: true,
        },
      }),
    }).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "user",
        email: "user@example.com",
        displayName: "Alma Reyes",
        legalConsent: {
          ...CURRENT_LEGAL_CONSENT,
          acceptedAt: "server-time",
        },
      }),
    });

    function Probe() {
      const { profile, acceptCurrentLegalTerms } = useAuth();
      return (
        <div>
          <span data-testid="consent-status">{String(profile?.legalConsentCurrent)}</span>
          <button type="button" onClick={() => void acceptCurrentLegalTerms()}>
            Accept
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      await authListener?.(user);
    });

    expect(screen.getByTestId("consent-status")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      // Only the receipt and timestamp: accepting must not rewrite the
      // profile's email, name, or role.
      expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
        { path: "users/user-1" },
        {
          legalConsent: {
            ...CURRENT_LEGAL_CONSENT,
            acceptedAt: "server-time",
          },
          updatedAt: "server-time",
        },
        { merge: true },
      );
      expect(screen.getByTestId("consent-status")).toHaveTextContent("true");
    });
  });

  it("sends a best-effort verification email on email/password signUp without blocking registration", async () => {
    const newUser = { uid: "user-new", email: "builder@example.com", displayName: "Builder Person" };
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    authMocks.updateProfile.mockResolvedValue(undefined);
    authMocks.sendEmailVerification.mockRejectedValueOnce(new Error("too-many-requests"));
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    firestoreMocks.setDoc.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <EmailBuilderButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create builder" }));

    await waitFor(() => {
      expect(authMocks.sendEmailVerification).toHaveBeenCalledWith(newUser);
      expect(firestoreMocks.setDoc).toHaveBeenCalled();
    });
    expect(authMocks.deleteUser).not.toHaveBeenCalled();
  });

  it("force-refreshes the ID token in refreshProfile when emailVerified becomes true", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const getIdToken = vi.fn().mockResolvedValue("fresh-jwt");
    const user = {
      uid: "user-1",
      email: "user@example.com",
      displayName: "Alma Reyes",
      emailVerified: true,
      reload,
      getIdToken,
    };
    firebaseMocks.auth.currentUser = user;
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "user", email: "user@example.com" }),
    });

    function Probe() {
      const { refreshProfile } = useAuth();
      return (
        <button type="button" onClick={() => void refreshProfile()}>
          Refresh
        </button>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(reload).toHaveBeenCalledOnce();
      expect(getIdToken).toHaveBeenCalledWith(true);
    });
  });
});

describe("AuthProvider social sign-in inside the Android app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    firebaseMocks.auth.currentUser = null;
    authMocks.onAuthStateChanged.mockReturnValue(() => {});
    authMocks.signInWithRedirect.mockResolvedValue(undefined);
    authMocks.getRedirectResult.mockResolvedValue(null);
    firestoreMocks.doc.mockReturnValue({ path: "users/user-1" });
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    firestoreMocks.serverTimestamp.mockReturnValue("server-time");
  });

  it("redirects in place instead of opening a popup the TWA would split off", async () => {
    // The Play app session marker purchase-channel detection reads.
    window.sessionStorage.setItem("lotfoundry:android-app", "1");
    const auth = await import("./auth-context");
    function Button() {
      const { signInWithGoogle } = auth.useAuth();
      return (
        <button type="button" onClick={() => void signInWithGoogle("builder", auth.CURRENT_LEGAL_CONSENT)}>
          Continue with Google
        </button>
      );
    }

    render(
      <auth.AuthProvider>
        <Button />
      </auth.AuthProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(authMocks.signInWithRedirect).toHaveBeenCalledTimes(1));
    expect(authMocks.signInWithPopup).not.toHaveBeenCalled();
    expect(JSON.parse(window.sessionStorage.getItem(auth.SOCIAL_REDIRECT_KEY) ?? "null")).toEqual({
      role: "builder",
      consented: true,
      mode: "sign-in",
    });
    // The redirect can return to the Firebase-free landing, which only mounts an
    // auth island (and so finishes sign-in) for a browser carrying this hint.
    expect(window.localStorage.getItem("lf:member-session")).toBe("1");
  });

  it.each(["google", "apple"] as const)(
    "redirects %s sign-in in Android Chrome without a Play app marker",
    async (provider) => {
      const userAgent = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (Linux; Android 17; Pixel 11 Pro) AppleWebKit/537.36 Chrome/145.0.0.0 Mobile Safari/537.36",
      );
      try {
        const auth = await import("./auth-context");
        const Button = () => {
          const actions = auth.useAuth();
          const signIn = provider === "google" ? actions.signInWithGoogle : actions.signInWithApple;
          return (
            <button type="button" onClick={() => void signIn("builder", auth.CURRENT_LEGAL_CONSENT)}>
              Continue
            </button>
          );
        };

        render(<auth.AuthProvider><Button /></auth.AuthProvider>);
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));

        await waitFor(() => expect(authMocks.signInWithRedirect).toHaveBeenCalledTimes(1));
        expect(authMocks.signInWithPopup).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem("lotfoundry:android-app")).toBeNull();
        expect(JSON.parse(window.sessionStorage.getItem(auth.SOCIAL_REDIRECT_KEY) ?? "null")).toEqual({
          role: "builder",
          consented: true,
          mode: "sign-in",
        });
      } finally {
        userAgent.mockRestore();
      }
    },
  );

  it("finishes registration with the stashed role and consent when the redirect returns", async () => {
    const user = { uid: "user-1", email: "builder@example.com", displayName: "Builder Person" };
    firebaseMocks.auth.currentUser = user;
    authMocks.getRedirectResult.mockResolvedValue({ user });
    window.sessionStorage.setItem(
      "lotfoundry:social-redirect",
      JSON.stringify({ role: "builder", consented: true }),
    );
    const auth = await import("./auth-context");
    function Probe() {
      const { user: current, loading } = auth.useAuth();
      return <span>{loading ? "loading" : current?.uid ?? "signed-out"}</span>;
    }

    render(
      <auth.AuthProvider>
        <Probe />
      </auth.AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("user-1")).toBeInTheDocument());
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { path: "users/user-1" },
      expect.objectContaining({
        role: "builder",
        legalConsent: expect.objectContaining({
          termsVersion: auth.CURRENT_LEGAL_CONSENT.termsVersion,
          privacyVersion: auth.CURRENT_LEGAL_CONSENT.privacyVersion,
          adultConfirmed: true,
          acceptedAt: "server-time",
        }),
      }),
      { merge: true },
    );
    expect(window.sessionStorage.getItem(auth.SOCIAL_REDIRECT_KEY)).toBeNull();
  });

  it("signs out and says so when the returning redirect cannot record consent", async () => {
    const user = { uid: "user-1", email: "builder@example.com", displayName: "Builder Person" };
    firebaseMocks.auth.currentUser = user;
    authMocks.getRedirectResult.mockResolvedValue({ user });
    authMocks.signOut.mockImplementation(async () => {
      firebaseMocks.auth.currentUser = null;
    });
    firestoreMocks.setDoc.mockRejectedValue({ code: "permission-denied" });
    window.sessionStorage.setItem(
      "lotfoundry:social-redirect",
      JSON.stringify({ role: "user", consented: true }),
    );
    window.localStorage.setItem("lf:member-session", "1");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const auth = await import("./auth-context");
    function Probe() {
      const { user: current, loading } = auth.useAuth();
      return <span>{loading ? "loading" : current?.uid ?? "signed-out"}</span>;
    }

    render(
      <auth.AuthProvider>
        <Probe />
      </auth.AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
    expect(authMocks.signOut).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Signed in, but profile setup was blocked. Please try again.",
    );
    expect(window.localStorage.getItem("lf:member-session")).toBeNull();
    consoleError.mockRestore();
  });

  it("drops the member hint when the visitor backs out of the provider page", async () => {
    window.sessionStorage.setItem(
      "lotfoundry:social-redirect",
      JSON.stringify({ role: "user", consented: true }),
    );
    window.localStorage.setItem("lf:member-session", "1");
    const auth = await import("./auth-context");
    function Probe() {
      const { user: current, loading } = auth.useAuth();
      return <span>{loading ? "loading" : current?.uid ?? "signed-out"}</span>;
    }

    render(
      <auth.AuthProvider>
        <Probe />
      </auth.AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(window.localStorage.getItem("lf:member-session")).toBeNull();
  });

  it("keeps user null and exposes checkoutUser for anonymous Firebase sessions without creating a profile or member hint", async () => {
    const anonUser = { uid: "anon-1", isAnonymous: true, email: null, displayName: null };
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(anonUser);
      return vi.fn();
    });

    function Probe() {
      const { user, checkoutUser, profile, loading } = useAuth();
      if (loading) return <span>loading</span>;
      return (
        <span>
          user:{user ? user.uid : "null"}|checkout:{checkoutUser ? checkoutUser.uid : "null"}|profile:{profile ? "yes" : "null"}
        </span>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("user:null|checkout:anon-1|profile:null")).toBeInTheDocument(),
    );
    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
    expect(hasMemberSessionHint()).toBe(false);
  });

  it("signs in anonymously via ensureCheckoutUser and links email preserving the same UID with legal consent", async () => {
    firestoreMocks.doc.mockImplementation((_db, collection, uid) => ({ path: `${collection}/${uid}` }));
    const anonUser = { uid: "anon-uid-1", isAnonymous: true, email: null, displayName: null };
    const linkedEmailUser = {
      uid: "anon-uid-1",
      isAnonymous: false,
      email: "owner@example.com",
      displayName: "Alma Reyes",
    };
    let authStateCb: ((u: unknown) => void) | null = null;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      authStateCb = cb;
      cb(null);
      return vi.fn();
    });
    authMocks.signInAnonymously.mockImplementation(async () => {
      firebaseMocks.auth.currentUser = anonUser as unknown as typeof firebaseMocks.auth.currentUser;
      authStateCb?.(anonUser);
      return { user: anonUser };
    });
    authMocks.linkWithCredential.mockImplementation(async () => {
      firebaseMocks.auth.currentUser =
        linkedEmailUser as unknown as typeof firebaseMocks.auth.currentUser;
      return { user: linkedEmailUser };
    });
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false });
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    authMocks.updateProfile.mockResolvedValue(undefined);
    authMocks.sendEmailVerification.mockResolvedValue(undefined);

    function Harness() {
      const { user, checkoutUser, ensureCheckoutUser, linkCheckoutWithEmail } = useAuth();
      return (
        <div>
          <span>
            user:{user?.uid ?? "null"}|checkout:{checkoutUser?.uid ?? "null"}
          </span>
          <button type="button" onClick={() => void ensureCheckoutUser()}>
            Start guest
          </button>
          <button
            type="button"
            onClick={() =>
              void linkCheckoutWithEmail(
                "owner@example.com",
                "password123",
                "Alma Reyes",
                CURRENT_LEGAL_CONSENT,
              )
            }
          >
            Link email
          </button>
        </div>
      );
    }

    const userEvents = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await userEvents.click(screen.getByRole("button", { name: "Start guest" }));
    await waitFor(() =>
      expect(screen.getByText("user:null|checkout:anon-uid-1")).toBeInTheDocument(),
    );
    expect(hasMemberSessionHint()).toBe(false);

    await userEvents.click(screen.getByRole("button", { name: "Link email" }));
    await waitFor(() =>
      expect(screen.getByText("user:anon-uid-1|checkout:anon-uid-1")).toBeInTheDocument(),
    );
    expect(authMocks.linkWithCredential).toHaveBeenCalledWith(anonUser, {
      email: "owner@example.com",
      password: "password123",
    });
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { path: "users/anon-uid-1" },
      expect.objectContaining({
        email: "owner@example.com",
        displayName: "Alma Reyes",
        role: "user",
        legalConsent: expect.objectContaining({
          termsVersion: CURRENT_LEGAL_CONSENT.termsVersion,
          privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
          adultConfirmed: true,
        }),
      }),
      { merge: true },
    );
    expect(hasMemberSessionHint()).toBe(true);
  });

  it("links Google onto an anonymous checkout session preserving UID and leaves anonymous session intact on collision", async () => {
    const anonUser = { uid: "anon-uid-2", isAnonymous: true, email: null, displayName: null };
    const linkedGoogleUser = {
      uid: "anon-uid-2",
      isAnonymous: false,
      email: "google@example.com",
      displayName: "Google User",
    };
    firebaseMocks.auth.currentUser = anonUser as unknown as typeof firebaseMocks.auth.currentUser;
    authMocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(anonUser);
      return vi.fn();
    });
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false });
    firestoreMocks.setDoc.mockResolvedValue(undefined);

    authMocks.linkWithPopup
      .mockRejectedValueOnce({ code: "auth/credential-already-in-use" })
      .mockImplementationOnce(async () => {
        firebaseMocks.auth.currentUser =
          linkedGoogleUser as unknown as typeof firebaseMocks.auth.currentUser;
        return { user: linkedGoogleUser };
      });

    function Harness() {
      const { user, checkoutUser, linkCheckoutWithGoogle } = useAuth();
      const [errCode, setErrCode] = useState("");
      return (
        <div>
          <span>
            user:{user?.uid ?? "null"}|checkout:{checkoutUser?.uid ?? "null"}|err:{errCode}
          </span>
          <button
            type="button"
            onClick={() =>
              void linkCheckoutWithGoogle(CURRENT_LEGAL_CONSENT).catch((err) =>
                setErrCode(String((err as { code?: string })?.code ?? "")),
              )
            }
          >
            Link Google
          </button>
        </div>
      );
    }

    const userEvents = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    // First attempt collides with an existing account — anonymous checkout session remains intact.
    await userEvents.click(screen.getByRole("button", { name: "Link Google" }));
    await waitFor(() =>
      expect(
        screen.getByText("user:null|checkout:anon-uid-2|err:auth/credential-already-in-use"),
      ).toBeInTheDocument(),
    );
    expect(authMocks.deleteUser).not.toHaveBeenCalled();

    // Second attempt succeeds and preserves UID anon-uid-2.
    await userEvents.click(screen.getByRole("button", { name: "Link Google" }));
    await waitFor(() =>
      expect(
        screen.getByText("user:anon-uid-2|checkout:anon-uid-2|err:auth/credential-already-in-use"),
      ).toBeInTheDocument(),
    );
  });
});
