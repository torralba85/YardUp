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
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { clearInitialParcel } from "./parcel-handoff";
import { validateDisplayName, validateEmail, validatePassword } from "./account-settings";

type UserRole = "user" | "builder";

export const CURRENT_LEGAL_CONSENT = {
  termsVersion: "2026-08-26",
  privacyVersion: "2026-08-26",
  adultConfirmed: true,
} as const;

export type LegalConsent = typeof CURRENT_LEGAL_CONSENT;

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
  signInWithGoogle: (role?: UserRole, legalConsent?: LegalConsent) => Promise<UserCredential>;
  signInWithApple: (role?: UserRole, legalConsent?: LegalConsent) => Promise<UserCredential>;
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

/**
 * Provide Firebase Authentication state and actions to the app.
 *
 * Subscribes to auth state changes, and on sign-in ensures a matching
 * `users/{uid}` Firestore profile exists (creating it with the pending role
 * for new accounts, or reading the existing role otherwise). Profile reads
 * fall back to an in-memory profile if Firestore is unavailable, so auth never
 * blocks on a failed profile fetch.
 *
 * @param props.children - The subtree that can consume {@link useAuth}.
 * @returns The auth context provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingAuthRoleRef = useRef<UserRole | null>(null);
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
  ) => {
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

        // Social sign-in passes neither displayName nor email, so gating the
        // write on those alone silently dropped every returning user's consent
        // receipt — they were re-prompted on each sign-in and nothing was
        // recorded, which is the one thing clickwrap exists to produce.
        if (
          options.displayName !== undefined ||
          options.email !== undefined ||
          options.legalConsent !== undefined
        ) {
          await setDoc(docRef, {
            displayName: nextDisplayName,
            email: nextEmail,
            role: existingRole,
            ...(options.legalConsent
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

        setProfile({
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
        setProfile(fallbackProfile);
      }
    } catch {
      setProfile(fallbackProfile);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          hadUserRef.current = true;
          await ensureProfile(u, {
            role: pendingAuthRoleRef.current ?? undefined,
          });
        } else {
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
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
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
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await ensureProfile(cred.user, { displayName, email, role, legalConsent });
      return cred;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const signInWithGoogle = async (
    role: UserRole = "user",
    legalConsent?: LegalConsent,
  ) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    pendingAuthRoleRef.current = role;
    try {
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user, { role, legalConsent });
      return cred;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const signInWithApple = async (
    role: UserRole = "user",
    legalConsent?: LegalConsent,
  ) => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    pendingAuthRoleRef.current = role;
    try {
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user, { role, legalConsent });
      return cred;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const logout = () => {
    // The parcel stash mirrors this session's live lot; the next session
    // (guest or another account) must start from demo data, not that parcel.
    clearInitialParcel();
    return signOut(auth);
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
   * On success the local session is cleared. The server-side Auth deletion
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
    await signOut(auth).catch(() => undefined);
    setUser(null);
    setProfile(null);
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
