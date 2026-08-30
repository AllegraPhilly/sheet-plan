import type { JobInput } from "./types";

const BIND_WORD: Record<NonNullable<JobInput["bind"]>, string> = {
  none: "",
  staple: "corner staple",
  "side-staple": "side staple",
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

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Snap to a whole signature (0, 4, 8, …) inside 0…pages. */
export function snapSignaturePages(n: number, pages: number): number {
  const hi = Math.max(0, pages);
  const clamped = clampInt(n, 0, hi);
  let snapped = Math.round(clamped / 4) * 4;
  if (snapped > hi) snapped = Math.floor(hi / 4) * 4;
  return Math.max(0, snapped);
}

/** Mixed flats: qty is the total. Color qty fills B&W as the remainder. */
export function setMixedColorQty(job: JobInput, colorQty: number): JobInput {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const color = clampInt(colorQty, 0, qty);
  return { ...job, qty, colorQty: color, bwQty: qty - color };
}

/** Mixed flats: editing B&W fills Color = total − B&W. */
export function setMixedBwQty(job: JobInput, bwQty: number): JobInput {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const bw = clampInt(bwQty, 0, qty);
  return { ...job, qty, bwQty: bw, colorQty: qty - bw };
}

/** Mixed flats: changing the total keeps color qty and fills B&W. */
export function setMixedTotal(job: JobInput, qty: number): JobInput {
  const total = Math.max(1, Number.isFinite(qty) ? qty : 1);
  const color = clampInt(job.colorQty ?? total, 0, total);
  return { ...job, qty: total, colorQty: color, bwQty: total - color };
}

/** Mixed saddle: color pages default 4; B&W = pages − color. Both ÷4. */
export function setMixedColorPages(job: JobInput, colorPages: number): JobInput {
  const pages = job.pages ?? 8;
  const color = snapSignaturePages(colorPages, pages);
  return { ...job, pages, colorPages: color, bwPages: Math.max(0, pages - color) };
}

export function setMixedBwPages(job: JobInput, bwPages: number): JobInput {
  const pages = job.pages ?? 8;
  const bw = snapSignaturePages(bwPages, pages);
  return { ...job, pages, bwPages: bw, colorPages: Math.max(0, pages - bw) };
}

export function setSaddlePageCount(job: JobInput, pages: number): JobInput {
  const next: JobInput = { ...job, pages };
  if (job.color !== "mixed") return next;
  return setMixedColorPages(next, job.colorPages ?? 4);
}

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
    const bwQty = job.bwQty ?? Math.max(0, qty - colorQty);
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
    next.pages = pages;
    next.sides = 2;
    next.fold = "half";
    return setMixedColorPages(next, job.colorPages ?? 4);
  }
  return setMixedTotal(next, job.qty);
}
