"use client";

import { useMemo, useState } from "react";
import { inspectFileInBrowser } from "@/lib/inspect/browser-inspect";
import { inferFinishFromMedia, type InspectedFile } from "@/lib/inspect/file-inspect";
import { planFromJob } from "@/lib/planner/plan";
import type { ColorPath, JobInput, ProductionPlan } from "@/lib/planner/types";

const empty: JobInput = {
  description: "",
  qty: 500,
  finishW: 8.5,
  finishH: 11,
  color: "color",
  sides: 1,
  fold: "none",
  bind: "none",
  substrate: "paper",
};

export function PlannerView() {
  const [job, setJob] = useState<JobInput>(empty);
  const [inspected, setInspected] = useState<InspectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const plan: ProductionPlan | null = useMemo(() => {
    if (!touched && !job.description && !inspected) return null;
    return planFromJob(
      { ...job, description: job.description || `${job.qty} ${job.finishW}×${job.finishH}` },
      inspected ? "file" : job.description ? "text" : "form",
    );
  }, [job, inspected, touched]);

  function patch<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setTouched(true);
    setJob((j) => ({ ...j, [key]: value }));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const info = await inspectFileInBrowser(file);
      setInspected(info);
      setTouched(true);
      if (info.widthIn && info.heightIn) {
        const finish = inferFinishFromMedia(info.widthIn, info.heightIn);
        setJob((j) => ({
          ...j,
          finishW: finish.w,
          finishH: finish.h,
          description: j.description || file.name,
        }));
      }
    } catch {
      setError("Could not inspect that file in the browser. Enter finish size by hand.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <form
        className="ticket p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
        }}
      >
        <h2 className="ticket-head text-3xl">JOB TICKET</h2>
        <p className="mb-4 text-sm opacity-70">Describe the job and/or drop a file. Logic stays in this browser.</p>

        <label className="mb-3 block text-sm font-semibold">
          What are we making?
          <textarea
            className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
            rows={3}
            placeholder="500 color flyers 8.5x11, trim and deliver"
            value={job.description}
            onChange={(e) => patch("description", e.target.value)}
          />
        </label>

        <label className="mb-3 block text-sm font-semibold">
          File (PDF or image)
          <input
            type="file"
            accept="application/pdf,image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {inspected && (
          <p className="mono mb-3 text-xs">
            {inspected.name} · {inspected.pages} pg ·{" "}
            {inspected.widthIn && inspected.heightIn
              ? `${inspected.widthIn}×${inspected.heightIn} in`
              : "size unknown"}
          </p>
        )}
        {error && <p className="mb-3 text-sm text-[var(--stamp)]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Num label="Qty" value={job.qty} onChange={(n) => patch("qty", Math.max(1, n))} />
          <Num label="Finish W (in)" value={job.finishW} step={0.125} onChange={(n) => patch("finishW", n)} />
          <Num label="Finish H (in)" value={job.finishH} step={0.125} onChange={(n) => patch("finishH", n)} />
          <label className="text-sm font-semibold">
            Color
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={job.color}
              onChange={(e) => patch("color", e.target.value as ColorPath)}
            >
              <option value="color">Color</option>
              <option value="bw">B&W</option>
              <option value="auto">Auto</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Sides
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={job.sides}
              onChange={(e) => patch("sides", Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>1-sided</option>
              <option value={2}>2-sided</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Substrate
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={job.substrate}
              onChange={(e) => patch("substrate", e.target.value as JobInput["substrate"])}
            >
              <option value="paper">Paper</option>
              <option value="envelope">Envelope</option>
              <option value="vinyl">Vinyl</option>
              <option value="garment">Garment</option>
              <option value="uv">UV / specialty</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Fold
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={job.fold}
              onChange={(e) => patch("fold", e.target.value as JobInput["fold"])}
            >
              <option value="none">None</option>
              <option value="half">Half</option>
              <option value="tri">Tri</option>
              <option value="letter">Letter</option>
              <option value="z">Z</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Bind / pack
            <select
              className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
              value={job.bind}
              onChange={(e) => patch("bind", e.target.value as JobInput["bind"])}
            >
              <option value="none">None</option>
              <option value="staple">Stitch</option>
              <option value="coil">Coil</option>
              <option value="drill">Drill</option>
              <option value="laminate">Laminate</option>
              <option value="shrink">Shrink</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="mt-4 w-full bg-[var(--ink)] py-3 font-semibold tracking-wide text-[var(--paper)]"
        >
          Build PLAN
        </button>
      </form>

      <section className="ticket p-5">
        {!plan ? (
          <p className="opacity-70">Enter a job. Classic check: 8.5×11 color → 11×17 2-up, one Challenge click.</p>
        ) : (
          <PlanCard plan={plan} />
        )}
      </section>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        type="number"
        step={step}
        className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function PlanCard({ plan }: { plan: ProductionPlan }) {
  const r = plan.recommended;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="ticket-head text-3xl">PLAN</h2>
        <span className="stamp px-2 py-0.5 text-[10px]">Not a quote</span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Row k="Press" v={`${plan.press.name} — ${plan.press.action}`} />
        <Row k="Parent to buy" v={`${r.parent.label} · ${r.sheetsToBuy} sheets · ${r.nUp}-up`} />
        <Row k="Impressions" v={`${r.impressions} (${r.nUp}-up click-save)`} />
        <Row k="Cut" v={`${r.cuts.why}`} />
      </dl>

      <h3 className="ticket-head mt-6 text-2xl">Why</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {plan.why.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>

      {plan.finishing.length > 0 && (
        <>
          <h3 className="ticket-head mt-6 text-2xl">Finishing</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {plan.finishing.map((s) => (
              <li key={s.machineId}>
                <span className="font-semibold">{s.name}</span> — {s.action}
              </li>
            ))}
          </ul>
        </>
      )}

      {plan.alsoConsider.length > 0 && (
        <>
          <h3 className="ticket-head mt-6 text-2xl">Also consider</h3>
          <ul className="mt-2 space-y-1 text-sm opacity-80">
            {plan.alsoConsider.map((s) => (
              <li key={s.machineId}>
                {s.name} — {s.action}
              </li>
            ))}
          </ul>
        </>
      )}

      {plan.alternatives.length > 0 && (
        <>
          <h3 className="ticket-head mt-6 text-2xl">Other parents (buy score)</h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="rule">
                <th className="py-1">Parent</th>
                <th>n-up</th>
                <th>Sheets</th>
                <th>Clicks</th>
                <th>Buy score</th>
              </tr>
            </thead>
            <tbody>
              {[r, ...plan.alternatives].map((n) => (
                <tr key={n.parent.id} className="rule">
                  <td className="py-1">{n.parent.label}</td>
                  <td>{n.nUp}</td>
                  <td>{n.sheetsToBuy}</td>
                  <td>{n.impressions}</td>
                  <td className="mono">{n.buyScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {plan.warnings.map((w) => (
        <p key={w} className="mt-4 text-sm text-[var(--stamp)]">
          {w}
        </p>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rule pb-2">
      <dt className="mono text-[10px] uppercase tracking-widest opacity-60">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
