"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
  const pendingProfileRole = useRef<UserRole>("user");

  const fetchProfile = useCallback(async (u: User) => {
    const docRef = doc(db, "users", u.uid);
    const role = pendingProfileRole.current;
    const fallbackProfile: UserProfile = {
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || null,
      role,
      createdAt: null,
    };

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          uid: u.uid,
          email: u.email || "",
          displayName: data.displayName || u.displayName || null,
          role: data.role || "user",
          createdAt: data.createdAt?.toDate?.() || null,
        });
      } else {
        await setDoc(docRef, {
          displayName: u.displayName || null,
          email: u.email || "",
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
          await fetchProfile(u);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [fetchProfile]);

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
  ) => {
    pendingProfileRole.current = role;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName,
      email,
      role,
      createdAt: serverTimestamp(),
    });
    setProfile({
      uid: cred.user.uid,
      email,
      displayName,
      role,
      createdAt: null,
    });
    return cred;
  };

  const signInWithGoogle = async (role: UserRole = "user") => {
    pendingProfileRole.current = role;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const docRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        displayName: cred.user.displayName || null,
        email: cred.user.email || "",
        role,
        createdAt: serverTimestamp(),
      }, { merge: true });
    }

    await fetchProfile(cred.user);
    return cred;
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
