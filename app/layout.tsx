import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
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
        {children}
      </body>
    </html>
  );
}

