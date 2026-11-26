import type { Metadata, Viewport } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import { CLOUDFLARE_BEACON_LOADER } from "@/lib/analytics/cloudflare-beacon";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { SITE_NAME } from "@/lib/site-identity";
import { SITE_OG_IMAGE } from "@/lib/og-images";
import "./globals.css";
import "./mobile-form-safeguards.css";
import { COLOR } from "@/lib/design-tokens";


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

/** Site-wide default metadata (title, description, icons, Open Graph, PWA manifest). */
export const metadata: Metadata = {
  title: "LotFoundry | Explore an ADU on your lot in 3D",
  description:
    "Check your address for ADU rent, build cost, and payback estimates—before you spend money on plans. Estimates only, not guarantees.",
  manifest: "/manifest.json",
  metadataBase: new URL(CANONICAL_ORIGIN),
  // Resolve against each route's pathname, not the homepage. Page-specific
  // canonicals (including the slash-form homepage) continue to override this.
  alternates: { canonical: "./" },
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
    title: "LotFoundry | Explore an ADU on your lot in 3D",
    description:
      "Check your address for ADU rent, build cost, and payback estimates—before you spend money on plans. Estimates only, not guarantees.",
    images: [SITE_OG_IMAGE],
    type: "website",
    siteName: SITE_NAME,
  },
};

/** Viewport config: theme color and `viewport-fit: cover` for PWA safe areas. */
export const viewport: Viewport = {
  themeColor: COLOR["lot-chalk"],
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
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-lot-chalk text-lot-ink">
        <a
          href="#main-content"
          className="sr-only rounded-control focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-index-toast) focus:inline-flex focus:items-center focus:bg-lot-ink focus:px-5 focus:py-2.5 focus:font-sans focus:text-xs focus:font-semibold focus:uppercase focus:tracking-[0.08em] focus:text-lot-chalk focus:outline-2 focus:outline-offset-2 focus:outline-lot-orange-ink"
        >
          Skip to content
        </a>
        {children}
        <ServiceWorkerRegistration />
        <Analytics />
        <script dangerouslySetInnerHTML={{ __html: CLOUDFLARE_BEACON_LOADER }} />
      </body>
    </html>
  );
}
