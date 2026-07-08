import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharpline — Crypto-native market intelligence",
  description:
    "A premium autonomous intelligence terminal for live market signals, AI analysis, and historical performance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
