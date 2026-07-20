import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Libre_Franklin } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";
import "./mobile-form-safeguards.css";

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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});


const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app";

/** Site-wide JSON-LD: SoftwareApplication with Organization as publisher, no fabricated ratings. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LotFoundry",
  description:
    "Check your address for ADU rent, build cost, and payback estimates before you spend money on plans.",
  url: appUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  publisher: {
    "@type": "Organization",
    name: "LotFoundry",
    url: appUrl,
  },
};

/** Site-wide default metadata (title, description, icons, Open Graph, PWA manifest). */
export const metadata: Metadata = {
  title: "LotFoundry | See what your backyard can earn",
  description:
    "Check your address for ADU rent, build cost, and payback estimates—before you spend money on plans. Estimates only, not guarantees.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app"),
  appleWebApp: {
    // Run as a standalone iOS PWA (no Safari chrome) with a translucent status
    // bar so the espresso studio header reaches the top edge under the notch.
    capable: true,
    title: "LotFoundry",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "LotFoundry | See what your backyard can earn",
    description:
      "Check your address for ADU rent, build cost, and payback estimates—before you spend money on plans. Estimates only, not guarantees.",
    images: [
      {
        url: "/lotfoundry-og.png",
        width: 1200,
        height: 630,
        alt: "LotFoundry — ADU planning for homeowners",
      },
    ],
    type: "website",
  },
};

/** Viewport config: theme color and `viewport-fit: cover` for PWA safe areas. */
export const viewport: Viewport = {
  themeColor: "#F2E5D5",
  // Extend behind the iOS notch/home indicator so env(safe-area-inset-*)
  // paddings in the studio shell take effect in standalone PWA mode.
  viewportFit: "cover",
};

/**
 * Root layout for the App Router. Loads the brand fonts as CSS variables, wraps
 * the app in {@link AuthProvider}, and registers the service worker.
 *
 * @param props.children - The routed page content.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${libreFranklin.variable} ${ibmPlexMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only rounded-full focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-index-toast) focus:inline-flex focus:items-center focus:bg-lf-espresso focus:px-5 focus:py-2.5 focus:font-mono focus:text-xs focus:font-semibold focus:uppercase focus:tracking-[0.14em] focus:text-lf-sand focus:outline-2 focus:outline-offset-2 focus:outline-lf-clay-on-dark"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
