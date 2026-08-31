"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlossaryTip } from "@/components/GlossaryTip";
import { publicUrl } from "@/lib/public-url";

const NAV = [
  { href: "/", label: "Planner" },
  { href: "/mail/", label: "Mail Advisor" },
  { href: "/floor/", label: "Floor list" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={publicUrl("/brand/allegra-a.svg")}
              alt=""
              width={36}
              height={32}
              className="brand-mark"
            />
            <h1 className="min-w-0 text-xl font-bold leading-none text-[var(--purple)] sm:text-2xl">
              Sheet Plan
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="quiet-note">INTERNAL</span>
            <GlossaryTip term="internal" align="end" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-0.5 px-3 pb-1" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname === ""
                : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hairline" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-[var(--ink)]/55">
        <p className="mb-1">Independently owned and operated</p>
        <p>Staff tool. Noindex. No franchise wordmark. Notice 123 cells effective 2026-07-12.</p>
      </footer>
    </div>
  );
}
