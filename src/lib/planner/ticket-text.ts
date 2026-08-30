import type { JobInput } from "./types";

const BIND_WORD: Record<NonNullable<JobInput["bind"]>, string> = {
  none: "",
  staple: "stitch",
  saddle: "saddle booklet",
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
  mixed: "mixed",
};

/** One line from the ticket fields so a phone user does not type a paragraph. */
export function autoDescription(
  job: Pick<
    JobInput,
    | "qty"
    | "finishW"
    | "finishH"
    | "color"
    | "sides"
    | "fold"
    | "bind"
    | "substrate"
    | "pages"
    | "colorPages"
    | "bwPages"
    | "colorQty"
    | "bwQty"
  >,
): string {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const finishW = Number.isFinite(job.finishW) && job.finishW > 0 ? job.finishW : 8.5;
  const finishH = Number.isFinite(job.finishH) && job.finishH > 0 ? job.finishH : 11;
  if (job.bind === "saddle") {
    const pages = typeof job.pages === "number" && Number.isFinite(job.pages) ? job.pages : undefined;
    const parts = [String(qty), COLOR_WORD[job.color] ?? "color", `${finishW}×${finishH}`];
    if (job.color !== "mixed") parts.push("2-sided");
    if (pages != null) parts.push(`${pages}-page`);
    parts.push(job.color === "mixed" ? "saddle" : "saddle booklet");
    if (job.color === "mixed") {
      const colorPages = job.colorPages ?? 0;
      const bwPages = job.bwPages ?? (pages != null ? pages - colorPages : 0);
      parts.push(`(${colorPages} color cover / ${bwPages} B&W)`);
    }
    if (job.substrate && job.substrate !== "paper") parts.push(job.substrate);
    return parts.join(" ");
  }
  if (job.color === "mixed") {
    const colorQty = job.colorQty ?? qty;
    const bwQty = job.bwQty ?? 0;
    return `${qty} mixed ${finishW}×${finishH} (${colorQty} color / ${bwQty} B&W)`;
  }
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

export function applyMixedDefaults(job: JobInput): JobInput {
  const next = { ...job };
  if (job.color !== "mixed") return next;
  if (job.bind === "saddle") {
    const pages = job.pages && job.pages >= 4 ? job.pages : 8;
    const colorPages = Math.min(4, pages);
    next.pages = pages;
    next.colorPages = colorPages;
    next.bwPages = pages - colorPages;
    next.sides = 2;
    next.fold = "half";
  } else {
    next.colorQty = job.colorQty ?? job.qty;
    next.bwQty = job.bwQty ?? 0;
  }
  return next;
}
