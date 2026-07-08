import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharpline — FIFA World Cup match intelligence",
  description:
    "A TxLINE-powered FIFA World Cup intelligence product for live match signals, odds movement, AI analysis, and autonomous monitoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
