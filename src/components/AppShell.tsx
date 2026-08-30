"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlossaryTip } from "@/components/GlossaryTip";

const NAV = [
  { href: "/", label: "Planner" },
  { href: "/mail/", label: "Mail Advisor" },
  { href: "/floor/", label: "Floor list" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 min-h-screen">
      <header className="border-b-4 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--amber)]">
              Allegra Philadelphia · shop floor
            </p>
            <h1 className="ticket-head text-4xl leading-none tracking-wide">SHEET PLAN</h1>
            <p className="mt-1 text-sm text-[var(--paper)]/80">
              Production PLAN — press, parent to buy, n-up, cuts. Not a dollar quote.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="stamp px-3 py-1 text-xs text-[var(--amber)] border-[var(--amber)]">Internal use</div>
            <GlossaryTip term="internal" align="end" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname === ""
                : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ticket-head px-4 py-2 text-lg tracking-wide ${
                  active
                    ? "bg-[var(--amber)] text-[var(--ink)]"
                    : "bg-transparent text-[var(--paper)] hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-[var(--ink)]/60">
        Staff tool. Noindex. No franchise wordmark. Notice 123 cells effective 2026-07-12.
      </footer>
    </div>
  );
}
