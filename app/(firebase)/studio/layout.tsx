import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LotFoundry Studio — feasibility and design",
  description:
    "Place an ADU on your lot and see estimated rent, build cost, and payback for your address.",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
