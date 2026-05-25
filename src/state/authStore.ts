import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClients } from "../services/firebase";

export type UserRole = "homeowner" | "builder";

export const userRoleLabels: Record<UserRole, string> = {
  homeowner: "Homeowner",
  builder: "Builder / Contractor",
};

export interface MockUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  role?: UserRole;
}

export type AuthUser = User | MockUser;

interface AuthState {
  currentUser: AuthUser | null;
  currentRole: UserRole | null;
  authInitialized: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register" | "profile";
  error: string | null;
  loading: boolean;

  initializeAuth: () => () => void;
  setAuthModalOpen: (open: boolean, tab?: "login" | "register" | "profile") => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  currentRole: null,
  authInitialized: false,
  isAuthModalOpen: false,
  authModalTab: "login",
  error: null,
  loading: false,

  initializeAuth: () => {
    const clients = getFirebaseClients();
    if (!clients) {
      set({
        currentUser: get().currentUser ?? {
          uid: "mock-guest-123",
          email: null,
          isAnonymous: true,
        },
        currentRole: null,
        authInitialized: true,
      });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(clients.auth, async (user) => {
      if (!user || user.isAnonymous) {
        set({ currentUser: user, currentRole: null, authInitialized: true });
        return;
      }
      const role = await loadUserRole(user.uid);
      set({ currentUser: user, currentRole: role, authInitialized: true });
    });

    return unsubscribe;
  },

  setAuthModalOpen: (open, tab) => {
    const user = get().currentUser;
    const defaultTab = user && !user.isAnonymous ? "profile" : "login";
    set({
      isAuthModalOpen: open,
      authModalTab: tab ?? defaultTab,
      error: null,
    });
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const clients = getFirebaseClients();
      if (!clients) {
        if (email && password.length >= 6) {
          const user: MockUser = {
            uid: `mock-user-${email}`,
            email,
            isAnonymous: false,
            role: get().currentRole ?? "homeowner",
          };
          set({ currentUser: user, currentRole: user.role ?? null, isAuthModalOpen: false });
        } else {
          throw new Error("Invalid email or password (must be at least 6 characters).");
        }
      } else {
        await signInWithEmailAndPassword(clients.auth, email, password);
        set({ isAuthModalOpen: false });
      }
    } catch (err: any) {
      set({ error: err?.message ?? "Authentication failed" });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, role) => {
    set({ loading: true, error: null });
    try {
      const clients = getFirebaseClients();
      if (!clients) {
        if (email && password.length >= 6) {
          const user: MockUser = {
            uid: `mock-user-${email}`,
            email,
            isAnonymous: false,
            role,
          };
          set({ currentUser: user, currentRole: role, isAuthModalOpen: false });
        } else {
          throw new Error("Invalid email or password (must be at least 6 characters).");
        }
      } else {
        const cred = await createUserWithEmailAndPassword(clients.auth, email, password);
        await setDoc(doc(clients.db, "userProfiles", cred.user.uid), {
          email: cred.user.email,
          role,
          createdAt: serverTimestamp(),
        });
        set({ currentRole: role, isAuthModalOpen: false });
      }
    } catch (err: any) {
      set({ error: err?.message ?? "Registration failed" });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const clients = getFirebaseClients();
      if (!clients) {
        const user: MockUser = {
          uid: "mock-guest-123",
          email: null,
          isAnonymous: true,
        };
        set({ currentUser: user, currentRole: null, isAuthModalOpen: false });
      } else {
        await firebaseSignOut(clients.auth);
        await signInAnonymously(clients.auth);
        set({ currentRole: null, isAuthModalOpen: false });
      }
    } catch (err: any) {
      set({ error: err?.message ?? "Sign out failed" });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

async function loadUserRole(uid: string): Promise<UserRole | null> {
  const clients = getFirebaseClients();
  if (!clients) return null;
  try {
    const snap = await getDoc(doc(clients.db, "userProfiles", uid));
    const data = snap.data() as { role?: UserRole } | undefined;
    return data?.role ?? null;
  } catch {
    return null;
  }
}
