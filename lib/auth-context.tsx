"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type AuthProvider as FirebaseAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { detectPurchaseChannel } from "./commerce/purchase-channel";
import { CURRENT_LEGAL_CONSENT, type LegalConsent } from "./legal-consent";
import {
  forgetMemberSession,
  rememberMemberSession,
} from "./member-session-hint";
import { clearInitialParcel } from "./parcel-handoff";
import { getAuthErrorCode, getAuthErrorMessage } from "./auth-errors";
import { validateDisplayName, validateEmail, validatePassword } from "./account-settings";

type UserRole = "user" | "builder";

export { CURRENT_LEGAL_CONSENT } from "./legal-consent";
export type { LegalConsent } from "./legal-consent";

/** The app-level user profile mirrored from the `users` Firestore collection. */
export interface UserProfile {
  /** Firebase Auth user id. */
  uid: string;
  /** User's email address. */
  email: string;
  /** Display name, or `null` if not set. */
  displayName: string | null;
  /** Whether the account is a homeowner (`user`) or a `builder`. */
  role: UserRole;
  /** Account creation time, or `null` if unknown/pending. */
  createdAt: Date | null;
}

/**
 * A popup sign-in result. `profileCreated` is true when this sign-in wrote the
 * user's first profile, which is what completes registration. Firebase's own
 * `isNewUser` cannot stand in for it: a first attempt whose profile write fails
 * leaves the Auth account behind, so the retry that registers them is not new.
 */
export type SocialSignInResult = UserCredential & { profileCreated: boolean };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    legalConsent: LegalConsent,
  ) => Promise<UserCredential>;
  signInWithGoogle: (role?: UserRole, legalConsent?: LegalConsent) => Promise<SocialSignInResult>;
  signInWithApple: (role?: UserRole, legalConsent?: LegalConsent) => Promise<SocialSignInResult>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateAccountName: (displayName: string) => Promise<void>;
  changeAccountEmail: (email: string, currentPassword: string) => Promise<void>;
  changeAccountPassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Firebase Auth is shared by every client auth island. Its listeners must all
// yield to the registration action that owns the role and consent receipt.
const pendingAuthRoleRef: { current: UserRole | null } = { current: null };

/**
 * Session-storage key carrying a social sign-in's role and consent across the
 * full-page redirect, so the returning document can finish registration.
 */
export const SOCIAL_REDIRECT_KEY = "lotfoundry:social-redirect";

interface PendingSocialRedirect {
  role: UserRole;
  consented: boolean;
}

/**
 * Whether social sign-in must redirect in place instead of opening a popup.
 *
 * Android can hand the popup's return URL to the installed app or a different
 * Custom Tab, which cannot read the popup's sessionStorage. This also affects
 * ordinary Chrome tabs, even though their purchases correctly use Stripe.
 * Keep Android sign-in in the initiating tab independently of billing channel.
 */
function prefersRedirectSignIn(): boolean {
  return detectPurchaseChannel() === "google-play" ||
    (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent));
}

function stashSocialRedirect(role: UserRole, legalConsent?: LegalConsent) {
  const consented = Boolean(legalConsent) &&
    legalConsent?.termsVersion === CURRENT_LEGAL_CONSENT.termsVersion &&
    legalConsent?.privacyVersion === CURRENT_LEGAL_CONSENT.privacyVersion &&
    legalConsent?.adultConfirmed === true;
  const pending: PendingSocialRedirect = { role, consented };
  window.sessionStorage.setItem(SOCIAL_REDIRECT_KEY, JSON.stringify(pending));
  // The redirect may return to the Firebase-free landing, which only mounts an
  // auth island for a member hint. Without one, nothing would finish sign-in.
  rememberMemberSession();
}

function takeSocialRedirect(): PendingSocialRedirect | null {
  try {
    const raw = window.sessionStorage.getItem(SOCIAL_REDIRECT_KEY);
    window.sessionStorage.removeItem(SOCIAL_REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSocialRedirect>;
    return {
      role: parsed.role === "builder" ? "builder" : "user",
      consented: parsed.consented === true,
    };
  } catch {
    return null;
  }
}

/** The in-flight redirect completion, shared until it settles. */
let socialRedirectCompletion: Promise<string | null> | null = null;

/**
 * Finish a redirect sign-in: write its consent-bearing profile, or sign out.
 *
 * @returns User-facing copy when the sign-in failed, otherwise `null`.
 */
async function completeSocialRedirect(
  pending: PendingSocialRedirect,
  ensureProfile: (
    u: User,
    options: { role?: UserRole; legalConsent?: LegalConsent },
  ) => Promise<boolean>,
): Promise<string | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (!cred) return null;
    try {
      await ensureProfile(cred.user, {
        role: pending.role,
        legalConsent: pending.consented ? CURRENT_LEGAL_CONSENT : undefined,
      });
    } catch (error) {
      await signOut(auth).catch(() => undefined);
      throw error;
    }
    return null;
  } catch (error) {
    console.error("[LotFoundry] Social sign-in redirect failed:", error);
    const code = getAuthErrorCode(error);
    return code
      ? getAuthErrorMessage(code)
      : "Sign-in did not finish. Please try again.";
  }
}

/**
 * Provide Firebase Authentication state and actions to the app.
 *
 * Subscribes to auth state changes, and on sign-in ensures a matching
 * `users/{uid}` Firestore profile exists (creating it with the pending role
 * for new accounts, or reading the existing role otherwise). Profile reads
 * fall back to an in-memory profile if Firestore is unavailable. Account
 * creation is stricter: a consent-bearing flow fails closed if its versioned
 * receipt cannot be persisted.
 *
 * @param props.children - The subtree that can consume {@link useAuth}.
 * @returns The auth context provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestRef = useRef(0);
  const authEventRef = useRef(0);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  // A redirect sign-in has no caller left to report to, so its failure shows here.
  const [redirectError, setRedirectError] = useState<string | null>(null);
  // Tracks whether this tab has seen a signed-in user, so we only clear the
  // parcel stash on a real sign-out (authed -> null), never on the initial
  // guest/null state that fires before the studio's ParcelProvider mounts.
  const hadUserRef = useRef(false);

  const ensureProfile = useCallback(async (
    u: User,
    options: {
      displayName?: string | null;
      email?: string | null;
      role?: UserRole;
      legalConsent?: LegalConsent;
    } = {},
  ): Promise<boolean> => {
    const request = ++profileRequestRef.current;
    const publishProfile = (value: UserProfile) => {
      if (request === profileRequestRef.current) setProfile(value);
    };
    const docRef = doc(db, "users", u.uid);
    const email = options.email ?? u.email ?? "";
    const displayName = options.displayName ?? u.displayName ?? null;
    const role = options.role ?? "user";
    const fallbackProfile: UserProfile = {
      uid: u.uid,
      email,
      displayName,
      role,
      createdAt: null,
    };

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const existingRole = data.role || "user";
        const nextDisplayName = displayName || data.displayName || null;
        const nextEmail = email || data.email || "";
        const existingConsent = data.legalConsent;
        const shouldRecordLegalConsent = Boolean(options.legalConsent) && (
          existingConsent?.termsVersion !== options.legalConsent?.termsVersion ||
          existingConsent?.privacyVersion !== options.legalConsent?.privacyVersion ||
          existingConsent?.adultConfirmed !== true
        );

        // Social sign-in passes neither displayName nor email, so gating the
        // write on those alone silently dropped every returning user's consent
        // receipt — they were re-prompted on each sign-in and nothing was
        // recorded, which is the one thing clickwrap exists to produce.
        if (
          options.displayName !== undefined ||
          options.email !== undefined ||
          shouldRecordLegalConsent
        ) {
          await setDoc(docRef, {
            displayName: nextDisplayName,
            email: nextEmail,
            role: existingRole,
            ...(shouldRecordLegalConsent && options.legalConsent
              ? {
                  legalConsent: {
                    ...options.legalConsent,
                    acceptedAt: serverTimestamp(),
                  },
                }
              : {}),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        publishProfile({
          uid: u.uid,
          email: nextEmail,
          displayName: nextDisplayName,
          role: existingRole,
          createdAt: data.createdAt?.toDate?.() || null,
        });
      } else {
        await setDoc(docRef, {
          displayName,
          email,
          role,
          ...(options.legalConsent
            ? {
                legalConsent: {
                  ...options.legalConsent,
                  acceptedAt: serverTimestamp(),
                },
              }
            : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        publishProfile(fallbackProfile);
        return true;
      }
    } catch (error) {
      if (options.legalConsent) throw error;
      publishProfile(fallbackProfile);
    }
    return false;
  }, []);

  useEffect(() => {
    const invalidateRequests = () => {
      ++profileRequestRef.current;
      ++authEventRef.current;
    };
    // A social sign-in that left by redirect resumes here. Hold the listener
    // off (as a popup sign-in does) until its role and consent are written.
    // The completion is shared so every auth island, and a Strict Mode
    // remount, waits on the one getRedirectResult call.
    const pendingRedirect = takeSocialRedirect();
    if (pendingRedirect && !socialRedirectCompletion) {
      pendingAuthRoleRef.current = pendingRedirect.role;
      socialRedirectCompletion = completeSocialRedirect(pendingRedirect, ensureProfile)
        .finally(() => {
          pendingAuthRoleRef.current = null;
          // Later mounts have nothing to wait for; their listener resolves them.
          socialRedirectCompletion = null;
        });
    }
    if (socialRedirectCompletion) {
      const event = ++authEventRef.current;
      void socialRedirectCompletion.then(async (failure) => {
        if (event !== authEventRef.current) return;
        if (failure) setRedirectError(failure);
        const current = auth.currentUser;
        setUser(current);
        try {
          if (current) {
            hadUserRef.current = true;
            rememberMemberSession();
            await ensureProfile(current);
          } else {
            // Cancelled or failed: drop the hint the redirect left behind.
            forgetMemberSession();
          }
        } finally {
          if (event === authEventRef.current) setLoading(false);
        }
      });
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Registration owns publication until its role and consent write succeeds.
      // Otherwise a gate can navigate on this event before signup finishes.
      if (u && pendingAuthRoleRef.current !== null) return;
      const event = ++authEventRef.current;
      setLoading(true);
      setUser(u);
      setProfile(null);
      try {
        if (u) {
          hadUserRef.current = true;
          setRedirectError(null);
          // Lets the Firebase-free landing know an auth island is worth loading
          // on the next visit, without it having to ask Firebase.
          rememberMemberSession();
          // signUp/social handlers persist the consent-bearing profile before
          // completing. Letting this listener race them could create a profile
          // without the receipt and redirect before a failed write is reported.
          if (pendingAuthRoleRef.current === null) {
            await ensureProfile(u);
          }
        } else {
          ++profileRequestRef.current;
          // Only clear the stashed parcel when a real session ends (a
          // previously authed user going null — logout, deleteAccount, or an
          // external token expiry/revocation), so the next guest or account in
          // this tab starts from demo data, not this session's lot. Skip the
          // initial guest/null state so a pending landing handoff survives for
          // the studio's ParcelProvider to consume.
          if (hadUserRef.current) {
            hadUserRef.current = false;
            clearInitialParcel();
          }
          // An external expiry or revocation ends the session without passing
          // through logout, so the landing hint has to be dropped here too.
          forgetMemberSession();
          setProfile(null);
        }
      } finally {
        if (event === authEventRef.current) setLoading(false);
      }
    });
    return () => {
      invalidateRequests();
      unsubscribe();
    };
  }, [ensureProfile]);

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    legalConsent: LegalConsent,
  ) => {
    pendingAuthRoleRef.current = role;
    let cred: UserCredential | null = null;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await ensureProfile(cred.user, { displayName, email, role, legalConsent });
      setUser(cred.user);
      setLoading(false);
      return cred;
    } catch (error) {
      if (cred) {
        await deleteUser(cred.user).catch(async () => {
          await signOut(auth).catch(() => undefined);
        });
      }
      throw error;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  /**
   * Leave for the provider in this tab. The page navigates away, so the
   * returned promise never settles; the AuthProvider mount effect completes the
   * sign-in when the provider sends the user back.
   */
  const redirectSignIn = async (
    provider: FirebaseAuthProvider,
    role: UserRole,
    legalConsent?: LegalConsent,
  ): Promise<SocialSignInResult> => {
    stashSocialRedirect(role, legalConsent);
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      window.sessionStorage.removeItem(SOCIAL_REDIRECT_KEY);
      throw error;
    }
    return new Promise<never>(() => undefined);
  };

  const signInWithGoogle = async (
    role: UserRole = "user",
    legalConsent?: LegalConsent,
  ): Promise<SocialSignInResult> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    if (prefersRedirectSignIn()) return redirectSignIn(provider, role, legalConsent);
    pendingAuthRoleRef.current = role;
    try {
      const cred = await signInWithPopup(auth, provider);
      let profileCreated: boolean;
      try {
        profileCreated = await ensureProfile(cred.user, { role, legalConsent });
        setUser(cred.user);
        setLoading(false);
      } catch (error) {
        await signOut(auth).catch(() => undefined);
        throw error;
      }
      return { ...cred, profileCreated };
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const signInWithApple = async (
    role: UserRole = "user",
    legalConsent?: LegalConsent,
  ): Promise<SocialSignInResult> => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    if (prefersRedirectSignIn()) return redirectSignIn(provider, role, legalConsent);
    pendingAuthRoleRef.current = role;
    try {
      const cred = await signInWithPopup(auth, provider);
      let profileCreated: boolean;
      try {
        profileCreated = await ensureProfile(cred.user, { role, legalConsent });
        setUser(cred.user);
        setLoading(false);
      } catch (error) {
        await signOut(auth).catch(() => undefined);
        throw error;
      }
      return { ...cred, profileCreated };
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const logout = async () => {
    setLogoutError(null);
    try {
      await signOut(auth);
      ++profileRequestRef.current;
      pendingAuthRoleRef.current = null;
      setUser(null);
      setProfile(null);
      clearInitialParcel();
      forgetMemberSession();
      // Discard mounted Studio state and the client router's protected pages.
      window.location.replace("/");
    } catch {
      setLogoutError("Could not sign out. Please try again.");
    }
  };

  const sendPasswordReset = (email: string) =>
    sendPasswordResetEmail(auth, email);

  const refreshProfile = async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    const refreshed = auth.currentUser;
    setUser(refreshed);
    if (refreshed) {
      await ensureProfile(refreshed, { email: refreshed.email });
    }
  };

  const updateAccountName = async (displayName: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error("You must be signed in.");
    const error = validateDisplayName(displayName);
    if (error) throw new Error(error);
    const name = displayName.trim();
    await updateProfile(current, { displayName: name });
    await ensureProfile(current, { displayName: name });
  };

  const reauthWithPassword = async (currentPassword: string) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error("You must be signed in with email.");
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
  };

  const changeAccountEmail = async (email: string, currentPassword: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error("You must be signed in.");
    const emailError = validateEmail(email);
    if (emailError) throw new Error(emailError);
    await reauthWithPassword(currentPassword);
    await verifyBeforeUpdateEmail(current, email.trim());
  };

  const changeAccountPassword = async (
    currentPassword: string,
    nextPassword: string,
  ) => {
    const current = auth.currentUser;
    if (!current) throw new Error("You must be signed in.");
    const pwError = validatePassword(nextPassword);
    if (pwError) throw new Error(pwError);
    await reauthWithPassword(currentPassword);
    await updatePassword(current, nextPassword);
  };

  const sendVerification = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error("You must be signed in.");
    await sendEmailVerification(current);
  };

  /**
   * Permanently delete the signed-in user's account and personal data.
   *
   * Calls the server route, which uses the Admin SDK to remove the user's
   * saved scenarios, profile document (rules forbid a client delete of
   * `users/{uid}`), any builder profile, and the Firebase Auth identity itself.
   * On success the local session is cleared and the browser is sent to the
   * public landing, the same ending {@link logout} performs and for the same
   * reason. The server-side Auth deletion
   * avoids the `auth/requires-recent-login` re-auth prompt a client-side
   * `deleteUser` would hit.
   *
   * @throws {Error} If no user is signed in or the server reports a failure.
   */
  const deleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error("You must be signed in to delete your account.");

    const token = await current.getIdToken();
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Account deletion failed. Please try again.");
    }

    // The Auth user is gone server-side; drop any lingering local session.
    clearInitialParcel();
    forgetMemberSession();
    await signOut(auth).catch(() => undefined);
    setUser(null);
    setProfile(null);
    // Deletion ends a session exactly as logout does, so it needs the same hard
    // navigation. Clearing `user` alone leaves the Studio's mounted state and
    // the client router's cached protected pages in place, which is what made
    // a signed-out app keep presenting itself as signed in.
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        logout,
        sendPasswordReset,
        deleteAccount,
        updateAccountName,
        changeAccountEmail,
        changeAccountPassword,
        sendVerification,
        refreshProfile,
      }}
    >
      {children}
      {(logoutError || redirectError) && (
        <div role="alert" className="fixed bottom-4 left-4 right-4 z-(--z-index-toast) border border-lot-ink bg-lot-chalk p-4 text-lot-ink">
          {logoutError || redirectError}
        </div>
      )}
    </AuthContext.Provider>
  );
}

/**
 * Access the current auth state (`user`, `profile`, `loading`) and actions
 * (`signIn`, `signUp`, `signInWithGoogle`, `signInWithApple`, `logout`, …).
 *
 * @returns The auth context value.
 * @throws {Error} If called outside an {@link AuthProvider}.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
