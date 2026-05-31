import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const outfit = localFont({
  src: [
    { path: "../public/fonts/Outfit/static/Outfit-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
});

const manrope = localFont({
  src: [
    { path: "../public/fonts/Manrope/static/Manrope-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LotFoundry | ADU Feasibility Studio",
  description:
    "Evaluate your lot's earning potential. Get instant ADU construction estimates, zoning coverage limits, and rental payback models.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.veri-share.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "LotFoundry | ADU Feasibility Studio",
    description:
      "Evaluate your lot's earning potential. Get instant ADU construction estimates, zoning coverage limits, and rental payback models.",
    images: [
      {
        url: "/lotfoundry-og.png",
        width: 1200,
        height: 630,
        alt: "LotFoundry ADU Feasibility Studio",
      },
    ],
    type: "website",
  },
};

export const viewport = {
  themeColor: "#F2E5D5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

