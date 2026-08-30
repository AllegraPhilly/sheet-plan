import type { JobInput } from "./types";

const BIND_WORD: Record<NonNullable<JobInput["bind"]>, string> = {
  none: "",
  staple: "stitch",
  coil: "coil",
  drill: "drill",
  laminate: "laminate",
  shrink: "shrink",
};

const FOLD_WORD: Record<NonNullable<JobInput["fold"]>, string> = {
  none: "",
  half: "half fold",
  tri: "tri fold",
  letter: "letter fold",
  z: "Z fold",
};

const COLOR_WORD: Record<JobInput["color"], string> = {
  color: "color",
  bw: "B&W",
  auto: "auto color",
};

/** One line from the ticket fields so a phone user does not type a paragraph. */
export function autoDescription(job: Pick<JobInput, "qty" | "finishW" | "finishH" | "color" | "sides" | "fold" | "bind" | "substrate">): string {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const finishW = Number.isFinite(job.finishW) && job.finishW > 0 ? job.finishW : 8.5;
  const finishH = Number.isFinite(job.finishH) && job.finishH > 0 ? job.finishH : 11;
  const parts = [
    String(qty),
    COLOR_WORD[job.color] ?? "color",
    `${finishW}×${finishH}`,
    job.sides === 2 ? "2-sided" : "1-sided",
  ];
  const fold = job.fold ? FOLD_WORD[job.fold] : "";
  if (fold) parts.push(fold);
  const bind = job.bind ? BIND_WORD[job.bind] : "";
  if (bind) parts.push(bind);
  if (job.substrate && job.substrate !== "paper") parts.push(job.substrate);
  return parts.join(" ");
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultTicket(): JobInput {
  const job: JobInput = {
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
  return { ...job, description: autoDescription(job) };
}
