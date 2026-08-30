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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pb-3 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={publicUrl("/brand/allegra-a.svg")}
              alt=""
              width={56}
              height={48}
              className="brand-mark"
            />
            <div className="min-w-0">
              <h1 className="text-[1.65rem] font-bold leading-none tracking-tight text-[var(--purple)] sm:text-3xl">
                Sheet Plan
              </h1>
              <p className="mt-1 text-xs text-[var(--ink)]/55 sm:text-sm">Allegra Philadelphia</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="internal-pill hand">INTERNAL</span>
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
