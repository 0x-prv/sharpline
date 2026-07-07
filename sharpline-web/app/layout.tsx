import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharpline — Autonomous sharp-money detection",
  description:
    "An autonomous agent that detects, explains, and tracks sharp odds movements on TxLINE World Cup 2026 feeds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
