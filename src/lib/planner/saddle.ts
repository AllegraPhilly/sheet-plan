import { emptyCuts } from "./cut-count";
import { approx, dimsMatch, rankParents } from "./nest";
import type { JobInput, NestResult, ParentSheet } from "./types";

export const SADDLE_PAGES_ERROR =
  "Saddle booklet page count must be 4, 8, 12, … (multiple of 4). Do not pad blank pages.";

export const SADDLE_MIXED_SUM_ERROR =
  "Color pages + B&W pages must equal the page count.";

export const SADDLE_MIXED_SIG_ERROR =
  "Color pages and B&W pages must each be 0, 4, 8, … (whole signatures).";

export const SADDLE_NO_PARENT_ERROR = "No shop parent fits that saddle signature.";

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

export function saddleAlternatives(job: JobInput, recommended: NestResult): NestResult[] {
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

/** Folded signature on the cheapest parent that fits — any finish, not letter-only. */
export function nestSaddle(job: JobInput): NestResult {
  const pages = job.pages;
  if (!saddlePagesOk(pages)) {
    throw new Error(SADDLE_PAGES_ERROR);
  }
  const mixedErr = mixedSaddleError(job);
  if (mixedErr) throw new Error(mixedErr);
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
