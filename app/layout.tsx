import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import "./globals.css";
import "./mobile-form-safeguards.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lot-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lot-body",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lotfoundry.net";

/**
 * Site-wide JSON-LD: SoftwareApplication with Organization as publisher, no
 * fabricated ratings.
 *
 * `operatingSystem` and `installUrl` name the shipped Android build as well as
 * the web app. Describing a published app as web-only hides it from the app
 * results that Google builds from this markup.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LotFoundry",
  description:
    "Check your address for ADU rent, build cost, and payback estimates before you spend money on plans.",
  url: appUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: ["Web", "Android"],
  installUrl: GOOGLE_PLAY_URL,
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://lotfoundry.net"),
  appleWebApp: {
    // Run as a standalone iOS PWA (no Safari chrome) with a translucent status
    // bar so the espresso studio header reaches the top edge under the notch.
    capable: true,
    title: "LotFoundry",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/landing/a-lot-more/mark.svg", type: "image/svg+xml" },
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
  themeColor: "#F5F5F0",
  // Extend behind the iOS notch/home indicator so env(safe-area-inset-*)
  // paddings in the studio shell take effect in standalone PWA mode.
  viewportFit: "cover",
};

/**
 * Root layout for the App Router. Loads the brand fonts as CSS variables and
 * registers the service worker.
 *
 * Deliberately Firebase-free: `AuthProvider` lives in the `(firebase)` route
 * group so the marketing and legal surfaces never pull in the client SDK.
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
      className={`${spaceGrotesk.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only rounded-[3px] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-index-toast) focus:inline-flex focus:items-center focus:bg-lf-espresso focus:px-5 focus:py-2.5 focus:font-sans focus:text-xs focus:font-semibold focus:uppercase focus:tracking-[0.08em] focus:text-lf-sand focus:outline-2 focus:outline-offset-2 focus:outline-lf-sand"
        >
          Skip to content
        </a>
        {children}
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
