import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "BIOS — Global Business Intelligence Operating System",
  description:
    "Planetary-scale digital twins, knowledge graphs, and agent-based macroeconomic simulations. The Operating System for Every Business on Earth.",
  keywords: [
    "Business Intelligence",
    "Digital Twins",
    "Macroeconomic Simulations",
    "Knowledge Graph",
    "AI Agents",
    "Enterprise SaaS",
  ],
  authors: [{ name: "BIOS Intelligence" }],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className={outfit.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
