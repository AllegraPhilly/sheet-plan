"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TermLabel } from "@/components/GlossaryTip";
import { SheetLayoutSvg } from "@/components/SheetLayoutSvg";
import { inspectFileInBrowser } from "@/lib/inspect/browser-inspect";
import { inferFinishFromMedia, type InspectedFile } from "@/lib/inspect/file-inspect";
import { nestKey } from "@/lib/planner/nest";
import { safePlanFromJob } from "@/lib/planner/plan";
import {
  deleteSavedJob,
  loadSavedJobs,
  newSavedJobId,
  savedJobLabel,
  upsertSavedJob,
  type SavedJob,
} from "@/lib/planner/saved-jobs";
import { commitNumberField, parseNumberDraft } from "@/lib/planner/num-field";
import { applyFinishPreset, FINISH_PRESETS, matchFinishPreset, presetById } from "@/lib/planner/finish-sizes";
import {
  applyCoverSplit,
  applyMixedDefaults,
  autoDescription,
  defaultTicket,
  isMixedFlatBind,
  isMixedPackBind,
  setMixedBwPages,
  setMixedBwQty,
  setMixedColorPages,
  setMixedColorQty,
  setMixedTotal,
  setPackPageCount,
  todayISO,
} from "@/lib/planner/ticket-text";
import type { ColorPath, JobInput, ProductionPlan } from "@/lib/planner/types";
import type { GlossaryKey } from "@/lib/glossary";

const fieldClass = "field";

function ticketJob(job: JobInput): JobInput {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const finishW = Number.isFinite(job.finishW) && job.finishW > 0 ? job.finishW : 8.5;
  const finishH = Number.isFinite(job.finishH) && job.finishH > 0 ? job.finishH : 11;
  const next = { ...job, qty, finishW, finishH };
  return {
    ...next,
    description: job.description.trim() || autoDescription(next),
  };
}

function parsedFrom(job: JobInput, inspected: InspectedFile | null): ProductionPlan["parsedFrom"] {
  if (inspected) return "file";
  if (job.description.trim()) return "text";
  return "form";
}

export function PlannerView() {
  const [job, setJob] = useState<JobInput>(defaultTicket);
  const [customer, setCustomer] = useState("");
  const [jobDate, setJobDate] = useState(todayISO);
  const [inspected, setInspected] = useState<InspectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const descDirtyRef = useRef(false);
  const planPaneRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSaved(loadSavedJobs());
  }, []);

  const built = useMemo(() => {
    if (!touched && !inspected) {
      return { plan: null as ProductionPlan | null, error: null as string | null };
    }
    return safePlanFromJob(ticketJob(job), parsedFrom(job, inspected));
  }, [job, inspected, touched]);

  const plan = built.plan;
  const planError = error ?? built.error;

  function revealPlanPane() {
    requestAnimationFrame(() => {
      planPaneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      planPaneRef.current?.focus({ preventScroll: true });
    });
  }

  function patch<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setTouched(true);
    setNotice(null);
    setJob((j) => {
      const next = { ...j, [key]: value };
      if (key !== "description" && !descDirtyRef.current) {
        next.description = autoDescription(next);
      }
      return next;
    });
  }

  function onDescriptionChange(value: string) {
    setTouched(true);
    setNotice(null);
    if (!value.trim()) {
      descDirtyRef.current = false;
      setJob((j) => ({ ...j, description: autoDescription(j) }));
      return;
    }
    descDirtyRef.current = true;
    setJob((j) => ({ ...j, description: value }));
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
        setJob((j) => {
          const next = { ...j, finishW: finish.w, finishH: finish.h };
          if (!descDirtyRef.current) next.description = autoDescription(next);
          return next;
        });
      }
    } catch {
      setError("Could not inspect that file in the browser. Enter finish size by hand.");
    }
  }

  function persistTicket() {
    setError(null);
    setTouched(true);
    const ticket = ticketJob(job);
    const result = safePlanFromJob(ticket, parsedFrom(job, inspected));
    if (result.error) setError(result.error);
    const entry: SavedJob = {
      id: openId ?? newSavedJobId(),
      savedAt: new Date().toISOString(),
      customer: customer.trim(),
      jobDate,
      ticket,
      plan: result.plan,
      planError: result.error,
    };
    setOpenId(entry.id);
    setSaved(upsertSavedJob(entry));
    setNotice("Saved on this phone. Not a quote.");
    if (result.error) revealPlanPane();
  }

  function openSaved(entry: SavedJob) {
    descDirtyRef.current = true;
    setOpenId(entry.id);
    setCustomer(entry.customer);
    setJobDate(entry.jobDate);
    setJob(entry.ticket);
    setInspected(null);
    setTouched(true);
    setError(entry.planError);
    setNotice(null);
    revealPlanPane();
  }

  function removeSaved(id: string) {
    const row = saved.find((j) => j.id === id);
    const ok = window.confirm(`Delete ${row ? savedJobLabel(row) : "this ticket"} from this phone?`);
    if (!ok) return;
    setSaved(deleteSavedJob(id));
    if (openId === id) setOpenId(null);
  }

  function newTicket() {
    descDirtyRef.current = false;
    setJob(defaultTicket());
    setCustomer("");
    setJobDate(todayISO());
    setInspected(null);
    setTouched(false);
    setError(null);
    setNotice(null);
    setOpenId(null);
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="grid gap-4">
        <form
          className="ticket p-3 sm:p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setTouched(true);
            const result = safePlanFromJob(ticketJob(job), parsedFrom(job, inspected));
            if (result.error) setError(result.error);
            revealPlanPane();
          }}
        >
          <h2 className="ticket-head">JOB TICKET</h2>
          <p className="mb-4 text-sm opacity-70">
            Not a quote. Saves on this phone.
          </p>

          <label className="mb-3 block text-sm font-semibold">
            Customer name
            <input
              className={fieldClass}
              autoComplete="organization"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setNotice(null);
              }}
              placeholder="Walk-up"
            />
          </label>
          <label className="mb-3 block min-w-0 text-sm font-semibold">
            Job date
            <input
              type="date"
              className={fieldClass}
              value={jobDate}
              onChange={(e) => setJobDate(e.target.value || todayISO())}
            />
          </label>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <Num
              label="Qty"
              value={job.qty}
              min={1}
              onChange={(n) => {
                if (job.color === "mixed" && isMixedFlatBind(job.bind)) {
                  setTouched(true);
                  setNotice(null);
                  setJob((j) => {
                    const next = setMixedTotal(j, n);
                    if (!descDirtyRef.current) next.description = autoDescription(next);
                    return next;
                  });
                  return;
                }
                patch("qty", n);
              }}
            />
            <label className="min-w-0 text-sm font-semibold">
              <TermLabel term="size">Size</TermLabel>
              <select
                className={fieldClass}
                value={matchFinishPreset(job.finishW, job.finishH, job)}
                onChange={(e) => {
                  const preset = presetById(e.target.value);
                  if (!preset?.w || !preset.h) return;
                  setTouched(true);
                  setNotice(null);
                  setJob((j) => {
                    const next = applyFinishPreset(j, preset);
                    if (!descDirtyRef.current) next.description = autoDescription(next);
                    return next;
                  });
                }}
              >
                {FINISH_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <Num
              label="Finish W (in)"
              term="finish"
              value={job.finishW}
              step={0.125}
              onChange={(n) => patch("finishW", n)}
            />
            <Num
              label="Finish H (in)"
              term="finish"
              value={job.finishH}
              step={0.125}
              onChange={(n) => patch("finishH", n)}
            />
            <label className="min-w-0 text-sm font-semibold">
              <TermLabel term="mixed">Color</TermLabel>
              <select
                className={fieldClass}
                value={job.color}
                onChange={(e) => {
                  const color = e.target.value as ColorPath;
                  setTouched(true);
                  setNotice(null);
                  setJob((j) => {
                    let next: JobInput = { ...j, color };
                    if (color === "mixed") next = applyMixedDefaults(next);
                    if (!descDirtyRef.current) next.description = autoDescription(next);
                    return next;
                  });
                }}
              >
                <option value="color">Color</option>
                <option value="bw">B&W</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold">
              Sides
              <select
                className={fieldClass}
                value={job.sides}
                onChange={(e) => patch("sides", Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>1-sided</option>
                <option value={2}>2-sided</option>
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold">
              <TermLabel term="substrate">Substrate</TermLabel>
              <select
                className={fieldClass}
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
            <label className="min-w-0 text-sm font-semibold">
              Fold
              <select
                className={fieldClass}
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
            <label className="min-w-0 text-sm font-semibold">
              Bind / pack
              <select
                className={fieldClass}
                value={job.bind}
                onChange={(e) => {
                  const bind = e.target.value as JobInput["bind"];
                  setTouched(true);
                  setNotice(null);
                  setJob((j) => {
                    let next: JobInput = { ...j, bind };
                    if (bind === "saddle") {
                      next.sides = 2;
                      next.fold = "half";
                      if (!next.pages || next.pages < 4) next.pages = 8;
                    }
                    if (bind === "staple" || bind === "side-staple") {
                      next.fold = "none";
                    }
                    if (next.color === "mixed") next = applyMixedDefaults(next);
                    if (!descDirtyRef.current) next.description = autoDescription(next);
                    return next;
                  });
                }}
              >
                <option value="none">None</option>
                <option value="staple">Corner staple</option>
                <option value="side-staple">Side staple</option>
                <option value="saddle">Saddle booklet</option>
                <option value="coil">Coil</option>
                <option value="drill">Drill</option>
                <option value="laminate">Laminate</option>
                <option value="shrink">Shrink</option>
              </select>
            </label>
            {(job.bind === "saddle" || (job.color === "mixed" && isMixedPackBind(job.bind))) && (
              <Num
                label="Pages"
                term="saddle"
                value={job.pages ?? 8}
                min={1}
                step={1}
                onChange={(n) => {
                  setTouched(true);
                  setNotice(null);
                  setJob((j) => {
                    const next = setPackPageCount(j, n);
                    if (!descDirtyRef.current) next.description = autoDescription(next);
                    return next;
                  });
                }}
              />
            )}
            {job.color === "mixed" && isMixedPackBind(job.bind) && (
              <label className="min-w-0 text-sm font-semibold sm:col-span-2">
                <TermLabel term="mixed">Mixed split</TermLabel>
                <select
                  className={fieldClass}
                  value={job.mixedSplit ?? "cover"}
                  onChange={(e) => {
                    const mixedSplit = e.target.value as "cover" | "custom";
                    setTouched(true);
                    setNotice(null);
                    setJob((j) => {
                      const next =
                        mixedSplit === "cover"
                          ? applyCoverSplit({ ...j, mixedSplit })
                          : setMixedColorPages({ ...j, mixedSplit: "custom" }, j.colorPages ?? 4);
                      if (!descDirtyRef.current) next.description = autoDescription(next);
                      return next;
                    });
                  }}
                >
                  <option value="cover">Cover color, insides B&W</option>
                  <option value="custom">Custom page split</option>
                </select>
                {(job.mixedSplit ?? "cover") === "cover" && (
                  <span className="mt-1 block text-xs font-normal opacity-70">
                    {job.bind === "saddle"
                      ? "Cover is 4 color pages, remaining pages B&W. Versant prints color cover shells; Accurio prints B&W insides and saddles in-line. Qty is books, not a color/B&W sheet split."
                      : "Cover is 4 color pages, remaining pages B&W. Whole book prints on Versant 4100. Qty is books, not a color/B&W sheet split."}
                  </span>
                )}
              </label>
            )}
            {job.color === "mixed" && isMixedPackBind(job.bind) && job.mixedSplit === "custom" && (
              <>
                <Num
                  label="Color pages"
                  term="mixed"
                  value={job.colorPages ?? 4}
                  min={0}
                  step={job.bind === "saddle" ? 4 : 1}
                  onChange={(n) => {
                    setTouched(true);
                    setNotice(null);
                    setJob((j) => {
                      const next = setMixedColorPages(j, n);
                      if (!descDirtyRef.current) next.description = autoDescription(next);
                      return next;
                    });
                  }}
                />
                <Num
                  label="B&W pages"
                  term="mixed"
                  value={job.bwPages ?? 0}
                  min={0}
                  step={job.bind === "saddle" ? 4 : 1}
                  onChange={(n) => {
                    setTouched(true);
                    setNotice(null);
                    setJob((j) => {
                      const next = setMixedBwPages(j, n);
                      if (!descDirtyRef.current) next.description = autoDescription(next);
                      return next;
                    });
                  }}
                />
              </>
            )}
            {job.color === "mixed" && isMixedFlatBind(job.bind) && (
              <>
                <MixedQty
                  label="Color qty"
                  value={job.colorQty ?? job.qty}
                  onChange={(n) => {
                    setTouched(true);
                    setNotice(null);
                    setJob((j) => {
                      const next = setMixedColorQty(j, n);
                      if (!descDirtyRef.current) next.description = autoDescription(next);
                      return next;
                    });
                  }}
                />
                <MixedQty
                  label="B&W qty"
                  value={job.bwQty ?? Math.max(0, job.qty - (job.colorQty ?? job.qty))}
                  onChange={(n) => {
                    setTouched(true);
                    setNotice(null);
                    setJob((j) => {
                      const next = setMixedBwQty(j, n);
                      if (!descDirtyRef.current) next.description = autoDescription(next);
                      return next;
                    });
                  }}
                />
              </>
            )}
          </div>

          <label className="mt-3 block text-sm font-semibold">
            Job line (auto — you can edit)
            <textarea
              className={fieldClass}
              rows={2}
              value={job.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </label>

          <label className="mt-3 block text-sm font-semibold">
            File (PDF or image)
            <input
              type="file"
              accept="application/pdf,image/*"
              className="mt-1 block w-full text-sm"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          {inspected && (
            <p className="mono mb-1 mt-2 text-xs">
              {inspected.name} · {inspected.pages} pg ·{" "}
              {inspected.widthIn && inspected.heightIn
                ? `${inspected.widthIn}×${inspected.heightIn} in`
                : "size unknown"}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button type="submit" className="btn-primary">
              Build PLAN
            </button>
            <button type="button" className="btn-secondary" onClick={persistTicket}>
              Save on this phone
            </button>
            <button type="button" className="min-h-11 text-sm underline-offset-2 underline" onClick={newTicket}>
              New ticket
            </button>
          </div>
          {notice && (
            <p className="mt-3 text-sm text-[var(--ok)]" role="status">
              {notice}
            </p>
          )}
        </form>

        <section className="ticket p-3 sm:p-4" aria-label="Saved jobs on this phone">
          <h2 className="ticket-head">SAVED JOBS</h2>
          <p className="mb-3 text-sm opacity-70">This browser only. Clearing site data drops the list.</p>
          {saved.length === 0 ? (
            <p className="text-sm opacity-70">No tickets on this phone yet.</p>
          ) : (
            <ul>
              {saved.map((entry) => (
                <li key={entry.id} className="rule flex items-stretch gap-2 py-2 last:border-b-0">
                  <button
                    type="button"
                    className={`min-h-12 flex-1 py-2 text-left ${openId === entry.id ? "font-semibold" : ""}`}
                    onClick={() => openSaved(entry)}
                  >
                    <span className="block">{entry.customer.trim() || "Walk-up"}</span>
                    <span className="block text-sm opacity-70">
                      {entry.jobDate} · {entry.ticket.description}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-danger min-h-12 shrink-0 px-3 text-sm"
                    aria-label={`Delete ${savedJobLabel(entry)}`}
                    onClick={() => removeSaved(entry.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        ref={planPaneRef}
        id="plan-pane"
        tabIndex={-1}
        className="ticket scroll-mt-4 p-3 outline-none sm:p-4"
      >
        {planError && !plan ? (
          <p className="text-[var(--stamp)]" role="alert">
            {planError}
          </p>
        ) : !plan ? (
          <p className="opacity-70">
            Enter a job. Classic check: 8.5×11 color → 11×17{" "}
            <TermLabel term="nUp">2-up</TermLabel>, one Challenge <TermLabel term="cutClick">click</TermLabel>.
          </p>
        ) : (
          <PlanCard plan={plan} customer={customer} jobDate={jobDate} />
        )}
      </section>
    </div>
  );
}

/** Live remainder field — onChange fires on every keystroke, including a cleared box (0). */
function MixedQty({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : "");

  useEffect(() => {
    if (draft === null) return;
    const parsed = parseNumberDraft(draft);
    if (parsed !== value && !(parsed === null && value === 0)) setDraft(null);
  }, [value, draft]);

  return (
    <label className="min-w-0 text-sm font-semibold">
      <TermLabel term="mixed">{label}</TermLabel>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        className={fieldClass}
        value={shown}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseNumberDraft(raw);
          onChange(parsed === null ? 0 : parsed);
        }}
        onBlur={() => {
          onChange(commitNumberField(draft ?? shown, { min: 0, fallback: value }));
          setDraft(null);
        }}
      />
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  term,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  term?: GlossaryKey;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : "");

  function commit() {
    const fallback = Number.isFinite(value) ? value : min;
    onChange(commitNumberField(draft ?? shown, { min, fallback }));
    setDraft(null);
  }

  return (
    <label className="min-w-0 text-sm font-semibold">
      {term ? <TermLabel term={term}>{label}</TermLabel> : label}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        className={fieldClass}
        value={shown}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseNumberDraft(raw);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={commit}
      />
    </label>
  );
}

function PlanCard({
  plan,
  customer,
  jobDate,
}: {
  plan: ProductionPlan;
  customer: string;
  jobDate: string;
}) {
  const r = plan.recommended;
  const press = plan.press;
  const why = plan.why ?? [];
  const finishing = plan.finishing ?? [];
  const also = plan.alsoConsider ?? [];
  const alts = plan.alternatives ?? [];
  const warnings = plan.warnings ?? [];
  const who = customer.trim();
  const parents = r ? [r, ...alts] : [];
  const recommendedKey = r ? nestKey(r) : null;
  const [layoutKey, setLayoutKey] = useState<string | null>(null);

  useEffect(() => {
    setLayoutKey(null);
  }, [recommendedKey, plan.job.finishW, plan.job.finishH, plan.job.qty]);

  const shown = parents.find((n) => nestKey(n) === layoutKey) ?? r;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="ticket-head">PLAN</h2>
        <span className="quiet-note">Not a quote</span>
      </div>
      {(who || jobDate) && (
        <p className="mb-3 text-sm">
          {who || "Walk-up"}
          {jobDate ? ` · ${jobDate}` : ""}
        </p>
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {(plan.lines?.length ?? 0) > 1 ? (
          plan.lines!.map((line) => (
            <Row
              key={line.role}
              k={line.role === "color" ? "Color press" : "B&W press"}
              v={`${line.press.name} — ${line.nest.parent.label} · ${line.nest.sheetsToBuy} sheets · ${line.nest.nUp}-up`}
            />
          ))
        ) : (
          <Row k="Press" v={`${press?.name ?? "Unassigned"} — ${press?.action ?? "no press step"}`} />
        )}
        <Row
          k="Parent to buy"
          term="parent"
          v={
            r?.parent
              ? r.saddle
                ? `${r.parent.label} · ${r.sheetsToBuy} sheets · saddle signature ${r.signature ? `${r.signature.w}×${r.signature.h}` : ""} (${r.nUp}-up, 4 pages/sheet)`
                : `${r.parent.label} · ${r.sheetsToBuy} sheets · ${r.nUp}-up`
              : "No parent nest for this ticket."
          }
        />
        <Row
          k="Impressions"
          term="impressions"
          v={
            r
              ? plan.lines && plan.lines.length > 1 && r.saddle
                ? plan.lines
                    .map((line) => {
                      const ink = line.role === "color" ? "color" : "B&W";
                      return `${line.nest.impressions} ${ink} duplex on ${line.press.name}`;
                    })
                    .join("; ")
                : r.saddle
                  ? `${r.impressions} (duplex on ${r.parent.label})`
                  : `${r.impressions} (${r.nUp}-up click-save)`
              : "—"
          }
        />
        {r?.cuts ? (
          <CutRow cuts={r.cuts} />
        ) : (
          <Row k="Cut count" term="cutClick" v="No cut plan." />
        )}
        <Row
          k="Buy score"
          term="buyScore"
          v={r && Number.isFinite(r.buyScore) ? r.buyScore.toFixed(1) : "—"}
        />
      </dl>
      {r && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {r.saddle ? (
            <TermLabel term="saddle">Saddle signature</TermLabel>
          ) : (
            <TermLabel term="nUp">{r.nUp}-up</TermLabel>
          )}
          <TermLabel term="exactTile">Exact tile {r.exactTile ? "yes" : "no"}</TermLabel>
          <TermLabel term="gripper">Gripper {r.gripperApplied ? "0.25 in" : "off"}</TermLabel>
          <TermLabel term="trim">Trim {r.trimApplied ? "0.125 in" : "off"}</TermLabel>
        </p>
      )}

      {shown && (
        <SheetLayoutSvg
          finish={plan.job}
          nest={shown}
          isRecommended={!!r && nestKey(shown) === nestKey(r)}
        />
      )}

      <h3 className="ticket-head mt-6">Why</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {why.length === 0 ? (
          <li>Plan built from the ticket fields.</li>
        ) : (
          why.map((w) => <li key={w}>{w}</li>)
        )}
      </ul>

      {finishing.length > 0 && (
        <>
          <h3 className="ticket-head mt-6">Finishing</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {finishing.map((s) => (
              <li key={s.machineId}>
                <span className="font-semibold">{s.name}</span> — {s.action}
              </li>
            ))}
          </ul>
        </>
      )}

      {also.length > 0 && (
        <>
          <h3 className="ticket-head mt-6">Also consider</h3>
          <ul className="mt-2 space-y-1 text-sm opacity-80">
            {also.map((s) => (
              <li key={s.machineId}>
                {s.name} — {s.action}
              </li>
            ))}
          </ul>
        </>
      )}

      {alts.length > 0 && r && (
        <>
          <h3 className="ticket-head mt-6">Other parents (buy score)</h3>
          <div className="overflow-x-auto">
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
                {parents.map((n) => {
                  const id = nestKey(n);
                  const isShown = shown ? nestKey(shown) === id : false;
                  const name = n.needsFileRotate
                    ? `${n.parent?.label ?? "—"} · rotate file`
                    : (n.parent?.label ?? "—");
                  return (
                    <tr key={id} className="rule">
                      <td className="py-2">
                        <div>{name}</div>
                        <button
                          type="button"
                          className={`mt-1 min-h-11 px-2 text-sm font-semibold underline-offset-2 ${
                            isShown ? "btn-ghost-active no-underline" : "underline"
                          }`}
                          aria-pressed={isShown}
                          aria-label={`See layout for ${name}`}
                          onClick={() => {
                            setLayoutKey(id);
                            requestAnimationFrame(() => {
                              document.getElementById("sheet-layout")?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              });
                            });
                          }}
                        >
                          See layout
                        </button>
                      </td>
                      <td>{n.nUp}</td>
                      <td>{n.sheetsToBuy}</td>
                      <td>{n.impressions}</td>
                      <td className="mono">{Number.isFinite(n.buyScore) ? n.buyScore.toFixed(1) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {warnings.map((w) => (
        <p key={w} className="mt-4 text-sm text-[var(--stamp)]">
          {w}
        </p>
      ))}
    </div>
  );
}

function Row({ k, v, term }: { k: string; v: string; term?: GlossaryKey }) {
  return (
    <div className="rule pb-2">
      <dt className="mono text-[10px] uppercase tracking-widest opacity-60">
        {term ? <TermLabel term={term}>{k}</TermLabel> : k}
      </dt>
      <dd>{v}</dd>
    </div>
  );
}

function CutRow({ cuts }: { cuts: NonNullable<ProductionPlan["recommended"]>["cuts"] }) {
  const face =
    cuts.faceTrims === 0
      ? "Face trim: no"
      : `Face trim: yes, ${cuts.faceTrims} (${cuts.faceTrimReasons.join(", ")})`;
  const splits =
    cuts.splits === 0 ? "Splits: 0" : `Splits: ${cuts.splits} (${cuts.splitWhy})`;
  return (
    <div className="rule pb-2 sm:col-span-2">
      <dt className="mono text-[10px] uppercase tracking-widest opacity-60">
        <TermLabel term="cutClick">Cut count</TermLabel>
      </dt>
      <dd className="text-base leading-snug">
        <div className="font-semibold">Cut count: {cuts.clicks}</div>
        <div>{cuts.brief}</div>
        <div>{face}</div>
        <div>{splits}</div>
      </dd>
    </div>
  );
}
