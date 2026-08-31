"use client";

import { useMemo, useState } from "react";
import { TermLabel } from "@/components/GlossaryTip";
import { adviseMail } from "@/lib/mail/advise";
import type { ContentClass, Goal, MailInput, PieceKind, RateCell, StaffLine } from "@/lib/mail/types";

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

  const fin = advice.pieceGate.finished;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--stamp)]">
        Staff Mail Advisor — not a customer chatbot
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <form className="ticket p-3 sm:p-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="ticket-head text-3xl">PIECE</h2>
          <label className="mt-3 block text-sm font-semibold">
            Notes
            <input
              className="field"
              value={input.description ?? ""}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="newsletter / invoice / occupant"
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Piece
            <select
              className="field"
              value={input.piece}
              onChange={(e) => patch("piece", e.target.value as PieceKind)}
            >
              <option value="letter">Letter</option>
              <option value="postcard">Postcard</option>
              <option value="flat">Flat</option>
              <option value="self-mailer">Self-mailer</option>
              <option value="eddm-flat">EDDM flat</option>
              <option value="card">Card</option>
              <option value="envelope">Envelope</option>
              <option value="booklet">Booklet</option>
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">
              Qty
              <input
                type="number"
                className="field"
                value={input.qty}
                onChange={(e) => patch("qty", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              Weight (oz)
              <input
                type="number"
                step={0.1}
                className="field"
                value={input.weightOz}
                onChange={(e) => patch("weightOz", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              W (in)
              <input
                type="number"
                step={0.125}
                className="field"
                value={input.widthIn}
                onChange={(e) => patch("widthIn", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              H (in)
              <input
                type="number"
                step={0.125}
                className="field"
                value={input.heightIn}
                onChange={(e) => patch("heightIn", Number(e.target.value))}
              />
            </label>
            <label className="text-sm font-semibold">
              T (in)
              <input
                type="number"
                step={0.001}
                className="field"
                value={input.thicknessIn}
                onChange={(e) => patch("thicknessIn", Number(e.target.value))}
              />
            </label>
          </div>
          <p className="mt-2 text-xs opacity-70">
            Enter the <strong>finished</strong> piece. An 11×17 parent is not a USPS shape.
          </p>
          <label className="mt-3 block text-sm font-semibold">
            Addressing
            <select
              className="field"
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
              className="field"
              value={input.fold}
              onChange={(e) => patch("fold", e.target.value as MailInput["fold"])}
            >
              <option value="none">None</option>
              <option value="half">Half</option>
              <option value="tri">Tri</option>
              <option value="letter">Letter</option>
              <option value="quarter">Quarter</option>
              <option value="self-mailer">Self-mailer</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Content test
            <select
              className="field"
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
              className="field"
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
            Nonprofit — client Form 3624 (pending = regular MM, 703.1.9)
          </label>
        </form>

        <section className="ticket p-3 sm:p-4">
          <h2 className="ticket-head text-3xl">ADVICE</h2>
          <p className="mt-2 text-sm">{advice.contentGate.why}</p>
          <p className="mt-2 text-sm opacity-70">
            Finished piece {fin.widthIn.toFixed(3)}×{fin.heightIn.toFixed(3)}×{fin.thicknessIn.toFixed(3)} in — USPS{" "}
            {advice.pieceGate.uspsShape}
            {advice.pieceGate.parentSheet ? ". Parent sheet is not a USPS shape." : "."}
          </p>

          <h3 className="ticket-head mt-6 text-2xl">Say this / Why / Shop</h3>
          <p className="text-sm opacity-70">Content test before cheap postage. Decision order is fixed.</p>
          <ol className="mt-2 space-y-3">
            {advice.decisions.map((d) => (
              <DecisionCard key={d.id} line={d} />
            ))}
          </ol>

          {advice.eddmIndicia && (
            <div className="rule mt-4 pb-3">
              <h3 className="ticket-head text-2xl">EDDM-Retail indicia mock</h3>
              <p className="mt-1 text-xs opacity-70">
                {advice.eddmIndicia.typeSpec}, {advice.eddmIndicia.clearIn}&quot; clear. No permit number.
              </p>
              <p className="mono mt-2 text-sm leading-5">
                {advice.eddmIndicia.lines.map((ln) => (
                  <span key={ln} className="block">
                    {ln}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-sm">
                Simplified address: <strong>{advice.eddmIndicia.simplifiedAddress}</strong>
              </p>
            </div>
          )}

          <h3 className="ticket-head mt-6 text-2xl">Actionable now</h3>
          <CellTable cells={advice.actionable} empty="No hardcoded actionable cell for this piece." />

          <h3 className="ticket-head mt-6 text-2xl">Once eligible</h3>
          <p className="text-sm opacity-70">
            <TermLabel term="permit">Permit/CRID</TermLabel> commercial MM and FCM presort are{" "}
            <strong>NOT OPEN</strong>. No CRID or imprint on file — do not guess open. Cells stay visible with{" "}
            <span className="mono">shop_blockers: permit_not_open</span>.
          </p>
          <p className="mt-1 text-sm opacity-70">
            Entry: <TermLabel term="entry">Origin / DSCF / DDU</TermLabel>. DDU letter prices are not offered.
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
            <li>
              <TermLabel term="fcm">First-Class (FCM)</TermLabel> — {advice.speed.fcm}
            </li>
            <li>
              <TermLabel term="mm">Marketing Mail (MM)</TermLabel> — {advice.speed.mm}
            </li>
            <li>
              <TermLabel term="eddm">EDDM-Retail</TermLabel> — {advice.speed.eddm}
            </li>
          </ul>
          {(input.piece === "letter" || input.piece === "self-mailer" || input.piece === "card") && (
            <p className="mt-2 text-sm">
              <TermLabel term="nonmachinable">Nonmachinable</TermLabel> letters pick up $0.49 (p.6 n.1) when they
              cannot run on USPS machines.
            </p>
          )}
          {(advice.selfMailer.tabbedRequired || input.piece === "booklet" || input.piece === "envelope") && (
            <p className="mt-2 text-sm">
              <TermLabel term="tabbed">Tabbed self-mailer</TermLabel> — {advice.selfMailer.note}
            </p>
          )}

          <h3 className="ticket-head mt-6 text-2xl">Induction</h3>
          <p className="mt-2 text-sm">
            {advice.induction.bmeu.name}: {advice.induction.bmeu.address}, {advice.induction.bmeu.city}{" "}
            {advice.induction.bmeu.zip}. {advice.induction.bmeu.phone}.
          </p>
          <p className="mt-1 text-sm">
            Dest SCF {advice.induction.destScfZips}: {advice.induction.destScf}. DDU letter prices not offered.
          </p>
          <p className="mt-1 text-sm">
            One meter: Pitney Bowes Connect+ 2000. Do not plan a second Select+. No confirmed addresser (no_addresser).
            No confirmed inserter. Do not offer IMsb for client mail. Postal Wizard stays locked until permit/CRID is
            open. MAILBOT is email only — never assigned mailing.
          </p>
          <p className="mt-3 text-xs opacity-60">
            <TermLabel term="notice123">{advice.notice.name}</TermLabel> effective {advice.notice.effective}.{" "}
            {advice.notice.miss} Open cells: p.6. Locked: p.13 (min 500), p.17–20. Do not interpolate ounces or sorts.
          </p>
        </section>
      </div>
    </div>
  );
}

function DecisionCard({ line }: { line: StaffLine }) {
  const tone =
    line.kind === "reject" ? "text-[var(--stamp)]" : line.kind === "hold" ? "text-[var(--amber)]" : "text-[var(--ok)]";
  return (
    <li className="rule pb-3">
      <p className={`mono text-[10px] uppercase tracking-widest ${tone}`}>{line.kind}</p>
      <p className="mt-1 text-sm">
        <strong>Say this.</strong> {line.say}
      </p>
      <p className="mt-1 text-sm">
        <strong>Why (DMM).</strong> {line.why}
      </p>
      <p className="mt-1 text-sm">
        <strong>What we do in this shop.</strong> {line.shop}
      </p>
    </li>
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
            <td className="mono">{c.page == null ? "—" : `p.${c.page}`}</td>
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
