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

export const MIXED_PACK_BINDS = ["saddle", "coil", "staple", "side-staple"] as const;
export const MIXED_FLAT_BINDS = ["none", "laminate", "shrink", "drill"] as const;

export function isMixedPackBind(bind: JobInput["bind"]): boolean {
  return bind === "saddle" || bind === "coil" || bind === "staple" || bind === "side-staple";
}

export function isMixedFlatBind(bind: JobInput["bind"]): boolean {
  return !isMixedPackBind(bind);
}

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

function alignColorPages(job: JobInput, colorPages: number, pages: number): number {
  return job.bind === "saddle" ? snapSignaturePages(colorPages, pages) : clampInt(colorPages, 0, pages);
}

function packPages(job: JobInput): number {
  if (typeof job.pages === "number" && Number.isFinite(job.pages) && job.pages > 0) return job.pages;
  return job.bind === "saddle" ? 8 : 8;
}

/** Mixed flats: qty is the total. Color qty fills B&W as the remainder. Live on every keystroke. */
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

/** Mixed flats: changing the total keeps color qty if it still fits, else clamp. */
export function setMixedTotal(job: JobInput, qty: number): JobInput {
  const total = Math.max(1, Number.isFinite(qty) ? qty : 1);
  const color = clampInt(job.colorQty ?? total, 0, total);
  return { ...job, qty: total, colorQty: color, bwQty: total - color };
}

export function applyCoverSplit(job: JobInput): JobInput {
  const pages = packPages(job);
  const cover = alignColorPages(job, 4, pages);
  return {
    ...job,
    pages,
    mixedSplit: "cover",
    colorPages: cover,
    bwPages: Math.max(0, pages - cover),
    colorQty: undefined,
    bwQty: undefined,
  };
}

export function setMixedColorPages(job: JobInput, colorPages: number): JobInput {
  const pages = packPages(job);
  const color = alignColorPages(job, colorPages, pages);
  return {
    ...job,
    pages,
    mixedSplit: job.mixedSplit ?? "custom",
    colorPages: color,
    bwPages: Math.max(0, pages - color),
  };
}

export function setMixedBwPages(job: JobInput, bwPages: number): JobInput {
  const pages = packPages(job);
  const bw = alignColorPages(job, bwPages, pages);
  return {
    ...job,
    pages,
    mixedSplit: job.mixedSplit ?? "custom",
    bwPages: bw,
    colorPages: Math.max(0, pages - bw),
  };
}

export function setPackPageCount(job: JobInput, pages: number): JobInput {
  const next: JobInput = { ...job, pages };
  if (job.color !== "mixed") return next;
  if (job.mixedSplit === "custom") return setMixedColorPages(next, job.colorPages ?? 4);
  return applyCoverSplit(next);
}

/** @deprecated use setPackPageCount */
export function setSaddlePageCount(job: JobInput, pages: number): JobInput {
  return setPackPageCount(job, pages);
}

function packBindWord(bind: JobInput["bind"]): string {
  if (bind === "saddle") return "saddle";
  if (bind === "coil") return "coil";
  if (bind === "staple") return "corner staple";
  if (bind === "side-staple") return "side staple";
  return "";
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
    | "mixedSplit"
  >,
): string {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const finishW = Number.isFinite(job.finishW) && job.finishW > 0 ? job.finishW : 8.5;
  const finishH = Number.isFinite(job.finishH) && job.finishH > 0 ? job.finishH : 11;
  if (job.color === "mixed" && isMixedPackBind(job.bind)) {
    const pages = typeof job.pages === "number" && Number.isFinite(job.pages) ? job.pages : undefined;
    const parts = [String(qty), "mixed", `${finishW}×${finishH}`];
    if (pages != null) parts.push(`${pages}-page`);
    const bindWord = packBindWord(job.bind);
    if (bindWord) parts.push(bindWord);
    const cover = job.mixedSplit !== "custom";
    if (cover) {
      parts.push("(color cover / B&W insides)");
    } else {
      const colorPages = job.colorPages ?? 0;
      const bwPages = job.bwPages ?? (pages != null ? pages - colorPages : 0);
      parts.push(`(${colorPages} color / ${bwPages} B&W)`);
    }
    if (job.substrate && job.substrate !== "paper") parts.push(job.substrate);
    return parts.join(" ");
  }
  if (job.bind === "saddle") {
    const pages = typeof job.pages === "number" && Number.isFinite(job.pages) ? job.pages : undefined;
    const parts = [String(qty), COLOR_WORD[job.color] ?? "color", `${finishW}×${finishH}`];
    if (job.color !== "mixed") parts.push("2-sided");
    if (pages != null) parts.push(`${pages}-page`);
    parts.push("saddle booklet");
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

export function mixedPackPageError(job: JobInput): string | null {
  if (job.color !== "mixed" || !isMixedPackBind(job.bind) || job.bind === "saddle") return null;
  const pages = job.pages;
  if (typeof pages !== "number" || !Number.isFinite(pages) || pages < 2) {
    return "Page count is required for a mixed booklet or multi-page pack.";
  }
  const colorPages = job.colorPages ?? 0;
  const bwPages = job.bwPages ?? 0;
  if (colorPages + bwPages !== pages) return "Color pages + B&W pages must equal the page count.";
  return null;
}

/** Leaves to nest per press for a mixed pack. Qty is books, not a color/B&W sheet split. */
export function mixedPackSheetQtys(job: JobInput): { color: number; bw: number } {
  const pages = packPages(job);
  const colorPages = job.colorPages ?? Math.min(4, pages);
  const bwPages = job.bwPages ?? Math.max(0, pages - colorPages);
  const sides = job.sides === 2 ? 2 : 1;
  const books = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  return {
    color: books * Math.max(0, Math.ceil(colorPages / sides)),
    bw: books * Math.max(0, Math.ceil(bwPages / sides)),
  };
}

export function applyMixedDefaults(job: JobInput): JobInput {
  if (job.color !== "mixed") return { ...job };
  if (isMixedPackBind(job.bind)) {
    const next: JobInput = { ...job };
    if (job.bind === "saddle") {
      next.sides = 2;
      next.fold = "half";
    }
    if (job.mixedSplit === "custom") {
      const pages = packPages(next);
      next.pages = pages;
      return setMixedColorPages(next, next.colorPages ?? 4);
    }
    return applyCoverSplit(next);
  }
  const flats = setMixedTotal({ ...job, mixedSplit: undefined, colorPages: undefined, bwPages: undefined }, job.qty);
  return flats;
}
