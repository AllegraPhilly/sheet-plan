import { emptyCuts } from "./cut-count";
import { approx, dimsMatch, nestOnParent, rankParents } from "./nest";
import { PARENTS, type JobInput, type NestResult, type ParentSheet } from "./types";

export const SADDLE_PAGES_ERROR =
  "Saddle booklet page count must be 4, 8, 12, … (multiple of 4). Do not pad blank pages.";

export const SADDLE_MIXED_SUM_ERROR =
  "Color pages + B&W pages must equal the page count.";

export const SADDLE_MIXED_SIG_ERROR =
  "Color pages and B&W pages must each be 0, 4, 8, … (whole signatures).";

export const SADDLE_NO_PARENT_ERROR = "No shop parent fits that saddle signature.";

/** Xerox PR Booklet Maker Finisher saddle-stitch cap (Colotech+ 90 uncoated). */
export const PR_BOOKLET_MAX_SHEETS = 30;
/** Accurio in-line saddle cap until a module plate is on file. */
export const ACCURIO_BOOKLET_MAX_SHEETS = 20;
/** Booklet sheet window (Xerox KB0400109). A raw 10×7 signature does not fit. */
export const PR_BOOKLET_MIN_SHEET = { w: 7.17, h: 10.12 };
export const PR_BOOKLET_MAX_SHEET = { w: 13, h: 19.2 };
/** 11×17 in-line folds to this book. Smaller finish face-trims after. */
export const INLINE_FOLD_BOOK = { w: 8.5, h: 11 };
/** Accurio tray max unless PF-710 (not assumed). */
export const ACCURIO_TRAY_MAX = { w: 12.76, h: 18.23 };
/** Job-qty cap for Accurio unit top feeder folds — pieces, not sheets in the fold. */
export const ACCURIO_TOP_FEEDER_MAX_QTY = 50;

export type InlineBookletOn = "versant" | "accurio";

export function isSaddleJob(job: Pick<JobInput, "bind">): boolean {
  return job.bind === "saddle";
}

export function saddlePagesOk(pages: number | undefined): pages is number {
  return typeof pages === "number" && Number.isFinite(pages) && pages >= 4 && pages % 4 === 0;
}

export function saddlePageError(pages: number | undefined): string | null {
  return saddlePagesOk(pages) ? null : SADDLE_PAGES_ERROR;
}

export function isCoverStock(job: Pick<JobInput, "stockHint" | "description">): boolean {
  const blob = `${job.stockHint ?? ""} ${job.description ?? ""}`.toLowerCase();
  return /cover|card\b|100#|80#\s*c/.test(blob);
}

export function sheetsPerSaddleBooklet(pages: number): number {
  return pages / 4;
}

export function finishFitsInside(
  finish: { w: number; h: number },
  container: { w: number; h: number },
): boolean {
  return (
    (finish.w <= container.w + 0.02 && finish.h <= container.h + 0.02) ||
    (finish.w <= container.h + 0.02 && finish.h <= container.w + 0.02)
  );
}

/** Sheet through the PR Booklet Maker — min 7.17×10.12, max 13×19.2. */
export function sheetFitsPrBookletMaker(sheet: { w: number; h: number }): boolean {
  const fits = (w: number, h: number) =>
    w + 0.02 >= PR_BOOKLET_MIN_SHEET.w &&
    h + 0.02 >= PR_BOOKLET_MIN_SHEET.h &&
    w <= PR_BOOKLET_MAX_SHEET.w + 0.02 &&
    h <= PR_BOOKLET_MAX_SHEET.h + 0.02;
  return fits(sheet.w, sheet.h) || fits(sheet.h, sheet.w);
}

export function needsInlineFaceTrim(job: Pick<JobInput, "finishW" | "finishH">): boolean {
  return !dimsMatch({ w: job.finishW, h: job.finishH }, INLINE_FOLD_BOOK);
}

function inlineFinishFits(job: JobInput): boolean {
  if (!isSaddleJob(job)) return false;
  if (job.substrate !== "paper") return false;
  if (!saddlePagesOk(job.pages)) return false;
  return finishFitsInside({ w: job.finishW, h: job.finishH }, INLINE_FOLD_BOOK);
}

/**
 * All-color paper saddle that fits the Versant PR Booklet Maker.
 * B&W and mixed-with-B&W insides stay Accurio in-line. Over 30 sheets/book is offline.
 * Parent is always 11×17 1-up — a raw 10×7 signature cannot feed the finisher.
 */
export function canInlineVersantBooklet(job: JobInput): boolean {
  if (!inlineFinishFits(job)) return false;
  if (job.color === "bw") return false;
  if (job.color === "mixed" && (job.bwPages ?? 0) > 0) return false;
  if (sheetsPerSaddleBooklet(job.pages!) > PR_BOOKLET_MAX_SHEETS) return false;
  return true;
}

/**
 * B&W or mixed (color cover / B&W insides) paper saddle on Accurio in-line.
 * All-color stays Versant PR. Over 20 sheets/book is Salco overflow.
 * Same 11×17 1-up signature as Versant in-line. Do not pick 12×18.
 */
export function canInlineAccurioBooklet(job: JobInput): boolean {
  if (!inlineFinishFits(job)) return false;
  if (job.color === "color") return false;
  if (job.color === "mixed" && (job.bwPages ?? 0) === 0) return false;
  if (sheetsPerSaddleBooklet(job.pages!) > ACCURIO_BOOKLET_MAX_SHEETS) return false;
  return true;
}

/** Double one finish dimension — portrait W×H (5×7) becomes 10×7. */
export function signatureSheet(
  finish: { w: number; h: number },
  doubled: "w" | "h" = "w",
): { w: number; h: number; doubled: "w" | "h" } {
  if (doubled === "h") return { w: finish.w, h: finish.h * 2, doubled: "h" };
  return { w: finish.w * 2, h: finish.h, doubled: "w" };
}

export function mixedSaddleError(job: JobInput): string | null {
  if (job.color !== "mixed") return null;
  const pages = job.pages;
  if (!saddlePagesOk(pages)) return SADDLE_PAGES_ERROR;
  const colorPages = job.colorPages ?? 0;
  const bwPages = job.bwPages ?? 0;
  if (colorPages + bwPages !== pages) return SADDLE_MIXED_SUM_ERROR;
  if (colorPages % 4 !== 0 || bwPages % 4 !== 0) return SADDLE_MIXED_SIG_ERROR;
  return null;
}

function signatureQty(job: JobInput, pages = job.pages): number {
  if (!saddlePagesOk(pages)) return 0;
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  return sheetsPerSaddleBooklet(pages) * qty;
}

function nestSignature(
  job: JobInput,
  sig: { w: number; h: number; doubled: "w" | "h" },
  signatures: number,
): NestResult[] {
  const sigJob: JobInput = {
    ...job,
    description: job.description,
    qty: Math.max(1, signatures),
    finishW: sig.w,
    finishH: sig.h,
    sides: 2,
    bind: "none",
    fold: "none",
    color: job.color === "bw" ? "bw" : "color",
  };
  return rankParents(sigJob).map((n) => stampSaddle(n, sig));
}

function signatureExact(nest: NestResult): boolean {
  const sig = nest.signature;
  if (!sig) return nest.exactTile;
  return nest.exactTile || (nest.nUp === 1 && dimsMatch(sig, nest.parent));
}

function compareSaddleNests(a: NestResult, b: NestResult): number {
  const aExact = signatureExact(a);
  const bExact = signatureExact(b);
  if (aExact !== bExact) return aExact ? -1 : 1;
  if (a.needsFileRotate !== b.needsFileRotate) return a.needsFileRotate ? 1 : -1;
  if (a.nUp !== b.nUp) return b.nUp - a.nUp;
  if (a.buyScore !== b.buyScore) return a.buyScore - b.buyScore;
  if (a.impressions !== b.impressions) return a.impressions - b.impressions;
  if ((a.signature?.doubled === "w") !== (b.signature?.doubled === "w")) {
    return a.signature?.doubled === "w" ? -1 : 1;
  }
  return 0;
}

function stampSaddle(
  nest: NestResult,
  sig: { w: number; h: number; doubled: "w" | "h" },
): NestResult {
  const classic =
    nest.nUp === 1 &&
    (dimsMatch(sig, nest.parent) ||
      (approx(sig.w, 17) && approx(sig.h, 11) && nest.parent.id === "tabloid"));
  const cuts = classic
    ? {
        ...emptyCuts(
          `Cut count: 0. Fold at the ${sig.w} in midline — not a letter cut. 0 splits, no face trim.`,
        ),
        brief: "0 splits, no face trim",
      }
    : {
        ...nest.cuts,
        why: `${nest.cuts.why} Gang splits of the parent (signatures), not finish letter 2-up cuts.`,
      };
  return {
    ...nest,
    saddle: true,
    signature: sig,
    cuts,
  };
}

export function nestInlineBooklet(job: JobInput, on: InlineBookletOn): NestResult {
  const pages = job.pages;
  if (!saddlePagesOk(pages)) {
    throw new Error(SADDLE_PAGES_ERROR);
  }
  const tabloid = PARENTS.find((p) => p.id === "tabloid");
  if (!tabloid) throw new Error(SADDLE_NO_PARENT_ERROR);
  const signatures = signatureQty(job, pages);
  const sig = { w: 17, h: 11, doubled: "w" as const };
  const base = nestOnParent(
    {
      ...job,
      qty: Math.max(1, signatures),
      finishW: sig.w,
      finishH: sig.h,
      sides: 2,
      bind: "none",
      fold: "none",
      color: job.color === "bw" ? "bw" : "color",
    },
    tabloid,
  );
  if (!base) throw new Error(SADDLE_NO_PARENT_ERROR);
  const faceTrim = needsInlineFaceTrim(job);
  const finishLabel = `${job.finishW}×${job.finishH}`;
  const why = faceTrim
    ? `Cut count: 1. Fold is not a Challenge cut. 11×17 in-line folds to 8.5×11; then 1 face trim to ${finishLabel} on the Challenge.`
    : `Cut count: 0. Fold at the 17 in midline — not a letter cut. 0 splits, no face trim.`;
  return {
    ...base,
    nUp: 1,
    cols: 1,
    rows: 1,
    saddle: true,
    inlineBooklet: true,
    inlineBookletOn: on,
    inlineFaceTrim: faceTrim,
    signature: sig,
    sheetsToBuy: signatures,
    impressions: signatures * 2,
    buyScore: signatures * tabloid.buyWeight,
    cuts: {
      ...emptyCuts(why),
      clicks: faceTrim ? 1 : 0,
      splits: 0,
      faceTrims: faceTrim ? 1 : 0,
      faceTrimReasons: faceTrim ? ["8.5×11 book to finish after in-line fold"] : [],
      brief: faceTrim ? "0 splits, 1 face trim" : "0 splits, no face trim",
    },
  };
}

/** Color in-line path — 11×17 1-up through the Versant PR Booklet Maker. */
export function nestInlineVersantBooklet(job: JobInput): NestResult {
  return nestInlineBooklet(job, "versant");
}

export function saddleAlternatives(job: JobInput, recommended: NestResult): NestResult[] {
  if (recommended.inlineBooklet) return [];
  const sig = recommended.signature;
  if (!sig) return [];
  const signatures = signatureQty(job);
  const sigJob: JobInput = {
    ...job,
    qty: Math.max(1, signatures),
    finishW: sig.w,
    finishH: sig.h,
    sides: 2,
    bind: "none",
    fold: "none",
    color: job.color === "bw" ? "bw" : "color",
  };
  return rankParents(sigJob)
    .filter((n) => n.parent.id !== recommended.parent.id)
    .map((n) => stampSaddle(n, sig));
}

function pickSignatureNest(job: JobInput, signatures: number): NestResult {
  const finish = { w: job.finishW, h: job.finishH };
  const cands: NestResult[] = [];
  for (const doubled of ["w", "h"] as const) {
    const sig = signatureSheet(finish, doubled);
    cands.push(...nestSignature(job, sig, signatures));
  }
  if (cands.length === 0) {
    throw new Error(SADDLE_NO_PARENT_ERROR);
  }
  cands.sort(compareSaddleNests);
  return cands[0];
}

/** Color → Versant PR; B&W/mixed → Accurio in-line when under cap. Else cheapest signature nest. */
export function nestSaddle(job: JobInput): NestResult {
  const pages = job.pages;
  if (!saddlePagesOk(pages)) {
    throw new Error(SADDLE_PAGES_ERROR);
  }
  const mixedErr = mixedSaddleError(job);
  if (mixedErr) throw new Error(mixedErr);
  if (canInlineVersantBooklet(job)) {
    return nestInlineBooklet(job, "versant");
  }
  if (canInlineAccurioBooklet(job)) {
    return nestInlineBooklet(job, "accurio");
  }
  return pickSignatureNest(job, signatureQty(job, pages));
}

export function nestSaddleForPages(job: JobInput, pages: number): NestResult {
  if (!saddlePagesOk(pages)) {
    throw new Error(SADDLE_PAGES_ERROR);
  }
  return pickSignatureNest({ ...job, pages }, signatureQty({ ...job, pages }, pages));
}

export function isClassicLetterSignature(nest: NestResult, finish: { w: number; h: number }): boolean {
  return (
    nest.saddle === true &&
    nest.nUp === 1 &&
    nest.cuts.clicks === 0 &&
    dimsMatch(finish, { w: 8.5, h: 11 }) &&
    nest.parent.id === "tabloid"
  );
}

export function parentFitsSignature(parent: ParentSheet, sig: { w: number; h: number }): boolean {
  const fits = (pw: number, ph: number) => pw + 0.02 >= sig.w && ph + 0.02 >= sig.h;
  return fits(parent.w, parent.h) || fits(parent.h, parent.w);
}
