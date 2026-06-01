import type { ExpoConfig, ConfigContext } from "expo/config";

const firebaseDefaults = {
  apiKey: "AIzaSyDqUcyMOM_sS77xVkwFIxqgAjv8hKksrJc",
  authDomain: "yardup-2026.firebaseapp.com",
  projectId: "yardup-2026",
  storageBucket: "yardup-2026.firebasestorage.app",
  messagingSenderId: "166268911022",
  webAppId: "1:166268911022:web:08b5493550c6f176305c3f",
  iosAppId: "1:166268911022:ios:8468cae4173f4d8d305c3f",
  androidAppId: "1:166268911022:android:4b0f68fd6bf9e918305c3f",
};

const firebaseNativeFiles = {
  ios: process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./firebase/GoogleService-Info.plist",
  android: process.env.GOOGLE_SERVICES_JSON ?? "./firebase/google-services.json",
};

function env(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "YardUp",
  slug: "adu-advisor",
  scheme: "aduadvisor",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  runtimeVersion: {
    policy: "appVersion",
  },
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: "com.aduadvisor.app",
    googleServicesFile: firebaseNativeFiles.ios,
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.aduadvisor.app",
    googleServicesFile: firebaseNativeFiles.android,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    firebase: {
      apiKey: env("EXPO_PUBLIC_FIREBASE_API_KEY", firebaseDefaults.apiKey),
      authDomain: env("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseDefaults.authDomain),
      projectId: env("EXPO_PUBLIC_FIREBASE_PROJECT_ID", firebaseDefaults.projectId),
      appId: env("EXPO_PUBLIC_FIREBASE_APP_ID", firebaseDefaults.webAppId),
      webAppId: env("EXPO_PUBLIC_FIREBASE_WEB_APP_ID", firebaseDefaults.webAppId),
      iosAppId: env("EXPO_PUBLIC_FIREBASE_IOS_APP_ID", firebaseDefaults.iosAppId),
      androidAppId: env("EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID", firebaseDefaults.androidAppId),
      storageBucket: env("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseDefaults.storageBucket),
      messagingSenderId: env("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", firebaseDefaults.messagingSenderId),
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-sqlite",
    [
      "expo-image-picker",
      {
        photosPermission: "YardUp lets you choose backyard photos to tailor ADU concepts to your property.",
        cameraPermission: "YardUp lets you take backyard photos to tailor ADU concepts to your property.",
        microphonePermission: false,
      },
    ],
  ],
});
