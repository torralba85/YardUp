import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — LotFoundry",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
