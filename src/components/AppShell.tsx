"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlossaryTip } from "@/components/GlossaryTip";
import { navActive } from "@/lib/nav-active";
import { publicUrl } from "@/lib/public-url";

const NAV = [
  { href: "/", label: "Planner", short: "Planner" },
  { href: "/mail/", label: "Mail Advisor", short: "Mail" },
  { href: "/floor/", label: "Floor list", short: "Floor" },
  { href: "/floor/wide/", label: "Wide (trial)", short: "Wide" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      <header className="site-header">
        <div className="identity-bar" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-1 pt-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="brand-mark-space">
              <img
                src={publicUrl("/brand/allegra-a.svg")}
                alt=""
                width={148}
                height={109}
                className="brand-mark"
              />
            </span>
            <h1 className="min-w-0 text-xl font-bold leading-none text-[var(--purple)] sm:text-2xl">
              Sheet Plan
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="quiet-note">INTERNAL</span>
            <GlossaryTip term="internal" align="end" />
          </div>
        </div>
        <nav className="site-nav mx-auto max-w-6xl px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = navActive(pathname, item.href, NAV.map((n) => n.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              >
                <span className="nav-label-short">{item.short}</span>
                <span className="nav-label-full">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-[var(--ink)]/55">
        <div className="brand-lockup-space">
          <img
            src={publicUrl("/brand/allegra-lockup.svg")}
            alt=""
            width={598}
            height={109}
            className="brand-lockup"
          />
        </div>
        <p>INTERNAL staff tool. Noindex. Notice 123 cells effective 2026-07-12.</p>
      </footer>
    </div>
  );
}
