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
      <header className="border-b-2 border-[var(--purple)] bg-[var(--purple)] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
              Allegra Philadelphia · shop floor
            </p>
            <h1 className="ticket-head text-3xl leading-none tracking-tight sm:text-4xl">Sheet Plan</h1>
            <p className="mt-1 text-sm text-white/85">
              Production PLAN — press, parent to buy, n-up, cuts. Not a dollar quote.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="stamp hand px-3 py-0.5 text-base normal-case tracking-normal">INTERNAL</div>
            <GlossaryTip term="internal" align="end" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2.5" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname === ""
                : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ticket-head px-3 py-2 text-base tracking-tight ${
                  active
                    ? "bg-[var(--gold)] text-[var(--ink)]"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-[var(--ink)]/55">
        <p className="mb-1">Independently owned and operated</p>
        <p>Staff tool. Noindex. No franchise wordmark. Notice 123 cells effective 2026-07-12.</p>
      </footer>
    </div>
  );
}
