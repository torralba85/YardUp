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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, logout, sendPasswordReset }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
