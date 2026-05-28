import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="en" className={`${inter.variable}`}>
      <body
        className="font-sans antialiased bg-slate-950 text-slate-50 overflow-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
