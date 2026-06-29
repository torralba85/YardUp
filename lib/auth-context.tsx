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
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

type UserRole = "user" | "builder";

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
  ) => Promise<UserCredential>;
  signInWithGoogle: (role?: UserRole) => Promise<UserCredential>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
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

  const ensureProfile = useCallback(async (
    u: User,
    options: {
      displayName?: string | null;
      email?: string | null;
      role?: UserRole;
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

        if (options.displayName !== undefined || options.email !== undefined) {
          await setDoc(docRef, {
            displayName: nextDisplayName,
            email: nextEmail,
            role: existingRole,
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
          createdAt: serverTimestamp(),
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
          await ensureProfile(u, {
            role: pendingAuthRoleRef.current ?? undefined,
          });
        } else {
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
  ) => {
    pendingAuthRoleRef.current = role;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await ensureProfile(cred.user, { displayName, email, role });
      return cred;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const signInWithGoogle = async (role: UserRole = "user") => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    pendingAuthRoleRef.current = role;
    try {
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user, { role });
      return cred;
    } finally {
      pendingAuthRoleRef.current = null;
    }
  };

  const logout = () => signOut(auth);

  const sendPasswordReset = (email: string) =>
    sendPasswordResetEmail(auth, email);

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
    await signOut(auth).catch(() => undefined);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, logout, sendPasswordReset, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the current auth state (`user`, `profile`, `loading`) and actions
 * (`signIn`, `signUp`, `signInWithGoogle`, `logout`, `sendPasswordReset`).
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
