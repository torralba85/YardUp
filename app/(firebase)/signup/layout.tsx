import type { Metadata } from "next";

/**
 * Metadata carrier for `/signup`.
 *
 * The page itself is a client component and so cannot export `metadata`; this
 * layout exists only to de-index it. Account-utility pages have nothing to rank
 * for, and dropping them from the sitemap alone does not keep a reachable URL
 * out of the index.
 */
export const metadata: Metadata = {
  title: "Create your account — LotFoundry",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
