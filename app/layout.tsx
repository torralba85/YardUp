import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YardUp",
  description: "Find local yard services faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
