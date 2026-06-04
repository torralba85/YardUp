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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: "user" | "builder";
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
    role: "user" | "builder",
  ) => Promise<UserCredential>;
  signInWithGoogle: (role?: "user" | "builder") => Promise<UserCredential>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingGoogleRole = useRef<"user" | "builder">("user");

  const fetchProfile = useCallback(async (u: User) => {
    const docRef = doc(db, "users", u.uid);
    const fallbackProfile: UserProfile = {
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || null,
      role: "user",
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
        const role = pendingGoogleRole.current;
        pendingGoogleRole.current = "user";
        await setDoc(docRef, {
          displayName: u.displayName || null,
          email: u.email || null,
          role,
          createdAt: serverTimestamp(),
        }, { merge: true });
        setProfile({ ...fallbackProfile, role });
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
    role: "user" | "builder",
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName,
      email,
      role,
      createdAt: serverTimestamp(),
    });
    return cred;
  };

  const signInWithGoogle = (role: "user" | "builder" = "user") => {
    pendingGoogleRole.current = role;
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
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
