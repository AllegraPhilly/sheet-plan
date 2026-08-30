"use client";

import { useMemo, useState } from "react";
import { adviseMail } from "@/lib/mail/advise";
import type { ContentClass, Goal, MailInput, PieceKind, RateCell } from "@/lib/mail/types";

const start: MailInput = {
  piece: "letter",
  qty: 250,
  addressing: "personalized",
  widthIn: 8.5,
  heightIn: 11,
  thicknessIn: 0.008,
  weightOz: 1,
  fold: "none",
  nonprofit: false,
  goal: "cheapest-actionable",
  content: "advertising",
  description: "",
};

export function MailAdvisorView() {
  const [input, setInput] = useState<MailInput>(start);
  const advice = useMemo(() => adviseMail(input), [input]);

  function patch<K extends keyof MailInput>(key: K, value: MailInput[K]) {
    setInput((s) => ({ ...s, [key]: value }));
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--stamp)]">
        Staff Mail Advisor — not a customer chatbot
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <form className="ticket p-5" onSubmit={(e) => e.preventDefault()}>
          <h2 className="ticket-head text-3xl">PIECE</h2>
          <label className="mt-3 block text-sm font-semibold">
            Notes
            <input
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.description ?? ""}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="newsletter / invoice / occupant"
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Piece
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.piece}
              onChange={(e) => patch("piece", e.target.value as PieceKind)}
            >
              <option value="letter">Letter</option>
              <option value="postcard">Postcard</option>
              <option value="flat">Flat</option>
              <option value="self-mailer">Self-mailer</option>
              <option value="eddm-flat">EDDM flat</option>
              <option value="card">Card</option>
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">
              Qty
              <input
                type="number"
                className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
                value={input.qty}
                onChange={(e) => patch("qty", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              Weight (oz)
              <input
                type="number"
                step={0.1}
                className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
                value={input.weightOz}
                onChange={(e) => patch("weightOz", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              W (in)
              <input
                type="number"
                step={0.125}
                className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
                value={input.widthIn}
                onChange={(e) => patch("widthIn", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              H (in)
              <input
                type="number"
                step={0.125}
                className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
                value={input.heightIn}
                onChange={(e) => patch("heightIn", Number(e.target.value))}
              />
            </label>
          </div>
          <label className="mt-3 block text-sm font-semibold">
            Addressing
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.addressing}
              onChange={(e) => patch("addressing", e.target.value as MailInput["addressing"])}
            >
              <option value="personalized">Personalized</option>
              <option value="occupant">Occupant</option>
              <option value="occupant-eddm">Occupant / EDDM</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Fold
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.fold}
              onChange={(e) => patch("fold", e.target.value as MailInput["fold"])}
            >
              <option value="none">None</option>
              <option value="half">Half</option>
              <option value="tri">Tri</option>
              <option value="letter">Letter</option>
              <option value="self-mailer">Self-mailer</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Content test
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.content}
              onChange={(e) => patch("content", e.target.value as ContentClass)}
            >
              <option value="advertising">Advertising / circular</option>
              <option value="first-class-matter">Bills / personal / First-Class matter</option>
              <option value="unknown">Not sure</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Goal
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={input.goal}
              onChange={(e) => patch("goal", e.target.value as Goal)}
            >
              <option value="cheapest-actionable">Cheapest actionable now</option>
              <option value="fastest">Fastest (FCM)</option>
              <option value="saturation">Saturation / EDDM</option>
              <option value="courtesy">Courtesy / personal</option>
            </select>
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={input.nonprofit}
              onChange={(e) => patch("nonprofit", e.target.checked)}
            />
            Nonprofit (does not apply to EDDM-Retail)
          </label>
        </form>

        <section className="ticket p-5">
          <h2 className="ticket-head text-3xl">ADVICE</h2>
          <p className="mt-2 text-sm">{advice.contentGate.why}</p>

          <h3 className="ticket-head mt-6 text-2xl">Actionable now</h3>
          <CellTable cells={advice.actionable} empty="No hardcoded actionable cell for this piece." />

          <h3 className="ticket-head mt-6 text-2xl">Once eligible</h3>
          <p className="text-sm opacity-70">
            Permit/CRID commercial MM and FCM presort are <strong>NOT OPEN</strong>. Cells stay visible with{" "}
            <span className="mono">shop_blockers: permit_not_open</span>.
          </p>
          <CellTable cells={advice.onceEligible} empty="No MM / comm FCM cell for this shape." />

          <h3 className="ticket-head mt-6 text-2xl">Fees (p.33)</h3>
          <CellTable cells={advice.fees} empty="" />

          {advice.missing.length > 0 && (
            <>
              <h3 className="ticket-head mt-6 text-2xl">See Notice 123</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {advice.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          )}

          <h3 className="ticket-head mt-6 text-2xl">Speed</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>{advice.speed.fcm}</li>
            <li>{advice.speed.mm}</li>
            <li>{advice.speed.eddm}</li>
          </ul>

          <h3 className="ticket-head mt-6 text-2xl">Induction</h3>
          <p className="mt-2 text-sm">
            {advice.induction.bmeu.name}: {advice.induction.bmeu.address}, {advice.induction.bmeu.city}{" "}
            {advice.induction.bmeu.zip}
          </p>
          <p className="mt-1 text-sm">
            Meter path: Pitney Bowes Connect+ 2000. Insert / band as needed. MAILBOT is email only — never assigned
            mailing.
          </p>
          <p className="mt-3 text-xs opacity-60">
            {advice.notice.name} effective {advice.notice.effective}. {advice.notice.miss}
          </p>
        </section>
      </div>
    </div>
  );
}

function CellTable({ cells, empty }: { cells: RateCell[]; empty: string }) {
  if (cells.length === 0) return <p className="mt-2 text-sm opacity-60">{empty}</p>;
  return (
    <table className="mt-2 w-full text-left text-sm">
      <thead>
        <tr className="rule">
          <th className="py-1">Cell</th>
          <th>Rate</th>
          <th>Page</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {cells.map((c) => (
          <tr key={c.id} className="rule align-top">
            <td className="py-2">
              <div className="font-semibold">{c.label}</div>
              <div className="text-xs opacity-70">{c.notes.join(" ")}</div>
            </td>
            <td className="mono">{c.amount === null ? "—" : c.unit === "fee" ? `$${c.amount}` : c.amount.toFixed(3)}</td>
            <td className="mono">{c.page ?? "—"}</td>
            <td>
              {c.eligibleNow ? (
                <span className="text-[var(--ok)]">now</span>
              ) : (
                <span className="text-[var(--stamp)]">{c.shop_blockers.join(", ") || "blocked"}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
