import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Sheet Plan — shop floor",
  description: "Internal production planner for Allegra Philadelphia. Plans, not quotes.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </head>
      <body className={`${roboto.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
