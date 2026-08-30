import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-condensed",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
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
      <body className={`${plex.variable} ${condensed.variable} ${mono.variable} antialiased`}>
        <div className="watermark" aria-hidden="true">
          <span>INTERNAL</span>
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
