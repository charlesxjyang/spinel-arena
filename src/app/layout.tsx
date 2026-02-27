import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spinel Arena — AI Materials Science Comparison",
  description:
    "See how domain-specific AI skills transform materials science analysis. Compare standard Claude vs Claude + Spinel side-by-side.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
