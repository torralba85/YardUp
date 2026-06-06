import type { Metadata } from "next";
import { Cormorant_Garamond, Libre_Franklin } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
      className={`${cormorant.variable} ${libreFranklin.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
