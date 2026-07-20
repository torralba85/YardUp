import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LotFoundry for Builders",
  description:
    "Review consented ADU feasibility leads and manage unlocks from your builder dashboard.",
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
