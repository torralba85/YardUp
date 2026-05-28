import type { Metadata } from "next";
import { Instrument_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "UrbanLens AR | ADU Feasibility Studio",
  description:
    "Investor-demo ADU feasibility studio with local parcel assumptions, 3D massing, cost ranges, and rental payback estimates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans antialiased bg-slate-950 text-slate-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
