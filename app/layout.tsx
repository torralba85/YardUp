import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Display / editorial serif. Fraunces is an optically-sized "old style" serif:
// warm, characterful, and substantial enough to carry rent figures without the
// boxy heaviness of a geometric sans. Optical sizing (opsz) lets large titles
// pick up the high-contrast display cut while smaller headings stay sturdy.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
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


export const metadata: Metadata = {
  title: "LotFoundry | ADU Income Potential",
  description:
    "Estimate your lot's ADU income potential with monthly rent, build range, payback, and site fit in minutes.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "LotFoundry | ADU Income Potential",
    description:
      "Estimate your lot's ADU income potential with monthly rent, build range, payback, and site fit in minutes.",
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
      className={`${fraunces.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
