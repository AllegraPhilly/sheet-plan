import type { Metadata } from "next";
import { Caveat, Roboto } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-roboto",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-caveat",
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
      <body className={`${roboto.variable} ${caveat.variable} antialiased`}>
        <div className="watermark" aria-hidden="true">
          <span>INTERNAL</span>
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
