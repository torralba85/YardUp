/**
 * iOS wrapper configuration for LotFoundry (`com.lotfoundry.app`).
 *
 * Production navigation targets the canonical HTTPS host. Local `server.url`
 * overrides must never ship in a release archive.
 *
 * Install Capacitor when building the native project:
 * `npm install @capacitor/core @capacitor/ios` and `npx cap add ios`.
 */
const config = {
  appId: "com.lotfoundry.app",
  appName: "LotFoundry",
  webDir: "native/ios-shell",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://lotfoundry.net",
    cleartext: false,
    allowNavigation: ["lotfoundry.net", "www.lotfoundry.net", "localhost"],
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile" as const,
    backgroundColor: "#F2E5D5",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#F2E5D5",
      launchAutoHide: true,
    },
  },
};

export default config;
