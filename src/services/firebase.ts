import Constants from "expo-constants";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { Platform } from "react-native";

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  webAppId?: string;
  iosAppId?: string;
  androidAppId?: string;
}

interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

let clients: FirebaseClients | null = null;

export function getFirebaseClients(): FirebaseClients | null {
  if (process.env.EXPO_PUBLIC_USE_MOCK_SERVICES === "true") {
    return null;
  }
  const config = getConfig();
  if (!config.apiKey || !config.projectId || !config.appId) {
    return null;
  }

  if (clients) {
    return clients;
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  clients = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app),
  };
  return clients;
}

export async function callCloudFunction<TInput extends object, TOutput>(name: string, input: TInput): Promise<TOutput | null> {
  const firebase = getFirebaseClients();
  if (!firebase) {
    return null;
  }

  const callable = httpsCallable<TInput, TOutput>(firebase.functions, name);
  const result = await callable(input);
  return result.data;
}

function getConfig(): FirebaseConfig {
  const extra = Constants.expoConfig?.extra as { firebase?: FirebaseConfig } | undefined;
  const config = extra?.firebase ?? {};
  return {
    ...config,
    appId: getPlatformAppId(config),
  };
}

function getPlatformAppId(config: FirebaseConfig): string | undefined {
  if (Platform.OS === "ios") {
    return config.iosAppId || config.appId;
  }

  if (Platform.OS === "android") {
    return config.androidAppId || config.appId;
  }

  return config.webAppId || config.appId;
}
