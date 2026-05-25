import type { ExpoConfig, ConfigContext } from "expo/config";

const firebaseDefaults = {
  apiKey: "AIzaSyD34VMPks8SLrHFRFoFqO8lunMRmiGSS2M",
  authDomain: "adu-advisor.firebaseapp.com",
  projectId: "adu-advisor",
  storageBucket: "adu-advisor.firebasestorage.app",
  messagingSenderId: "674234371665",
  webAppId: "1:674234371665:web:d1c9673d6f691b2217b270",
  iosAppId: "1:674234371665:ios:d37df5e16d5f461217b270",
  androidAppId: "1:674234371665:android:668530b5eb01f3f017b270",
};

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
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
    googleServicesFile: "./firebase/GoogleService-Info.plist",
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.aduadvisor.app",
    googleServicesFile: "./firebase/google-services.json",
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
