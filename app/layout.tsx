import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YardUp",
  description: "See ADU income potential and connect with builders.",
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
