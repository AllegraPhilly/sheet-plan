import Link from "next/link";
import { TermLabel } from "@/components/GlossaryTip";
import { MACHINES } from "@/lib/machines";

export function FloorView() {
  const shown = MACHINES.filter((m) => m.id !== "mailbot" || m.confidence === "skip");
  return (
    <div>
      <h2 className="ticket-head">FLOOR LIST</h2>
      <Link href="/floor/wide/" className="ticket mb-4 mt-3 block p-3 sm:p-4">
        <p className="quiet-note text-[var(--stamp)]">TRIAL</p>
        <h3 className="ticket-head leading-none">Wide (trial)</h3>
        <p className="mt-2 text-sm">
          Banner grommets and leftover vinyl on a roll. Shop helper, not a quote.
        </p>
      </Link>
      <p className="mb-4 text-sm opacity-70">
        Route only <strong>confident</strong> machines. Fuzzy = also-consider. Skip = never route. MAILBOT is email
        only and is listed so nobody assigns it a USPS drop. Planning max{" "}
        <TermLabel term="parent">parent</TermLabel> is the largest sheet we nest on that press.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((m) => (
          <article key={m.id} className="ticket p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="ticket-head leading-none">{m.name}</h3>
              <span
                className={`mono text-[10px] uppercase tracking-widest ${
                  m.confidence === "confident"
                    ? "text-[var(--ok)]"
                    : m.confidence === "skip"
                      ? "text-[var(--stamp)]"
                      : "opacity-60"
                }`}
              >
                {m.confidence}
              </span>
            </div>
            <p className="mono mt-1 text-[11px] opacity-50">{m.id}</p>
            <p className="mt-2 text-sm">{m.role}</p>
            {m.maxParentIn && (
              <p className="mt-1 text-sm">
                Planning max parent {m.maxParentIn.w}×{m.maxParentIn.h} in
              </p>
            )}
            {m.kind === "folder" && m.maxSheetIn && (
              <p className="mt-1 text-sm">
                Max sheet {m.maxSheetIn.w}×{m.maxSheetIn.h} in
              </p>
            )}
            {m.id === "challenge-305-crt" && (
              <p className="mt-1 text-sm">
                <TermLabel term="cutClick">Click</TermLabel> = one cut on this knife.
              </p>
            )}
            <ul className="mt-2 list-disc pl-5 text-sm">
              {m.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
              {m.floorFacts?.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
