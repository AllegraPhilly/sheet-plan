import { emptyCuts } from "./cut-count";
import { approx, dimsMatch } from "./nest";
import { PARENTS, type JobInput, type NestResult } from "./types";

export const SADDLE_PAGES_ERROR =
  "Saddle booklet page count must be 4, 8, 12, … (multiple of 4). Do not pad blank pages.";

export const SADDLE_FINISH_ERROR =
  "Saddle booklet planning is 8.5×11 folded on 11×17 (4 pages per sheet). Not letter 2-up cut.";

export function isSaddleJob(job: Pick<JobInput, "bind">): boolean {
  return job.bind === "saddle";
}

export function saddlePagesOk(pages: number | undefined): pages is number {
  return typeof pages === "number" && Number.isFinite(pages) && pages >= 4 && pages % 4 === 0;
}

export function saddlePageError(pages: number | undefined): string | null {
  return saddlePagesOk(pages) ? null : SADDLE_PAGES_ERROR;
}

export function isLetterBookletFinish(finish: { w: number; h: number }): boolean {
  return dimsMatch(finish, { w: 8.5, h: 11 });
}

export function isCoverStock(job: Pick<JobInput, "stockHint" | "description">): boolean {
  const blob = `${job.stockHint ?? ""} ${job.description ?? ""}`.toLowerCase();
  return /cover|card\b|100#|80#\s*c/.test(blob);
}

export function sheetsPerSaddleBooklet(pages: number): number {
  return pages / 4;
}

/** One 11×17 folded signature — not an 8.5×11 2-up Challenge cut. */
export function nestSaddle(job: JobInput): NestResult {
  const pages = job.pages;
  if (!saddlePagesOk(pages)) {
    throw new Error(SADDLE_PAGES_ERROR);
  }
  if (!isLetterBookletFinish({ w: job.finishW, h: job.finishH })) {
    throw new Error(SADDLE_FINISH_ERROR);
  }
  const tabloid = PARENTS.find((p) => p.id === "tabloid")!;
  const perBook = sheetsPerSaddleBooklet(pages);
  const sheetsToBuy = job.qty * perBook;
  const impressions = sheetsToBuy * 2;
  const orientation =
    approx(job.finishW, 8.5) && approx(job.finishH, 11) ? ("same" as const) : ("rotated" as const);
  return {
    parent: tabloid,
    nUp: 1,
    orientation,
    sheetTurned: true,
    needsFileRotate: false,
    cols: 2,
    rows: 1,
    exactTile: true,
    gripperApplied: false,
    trimApplied: false,
    saddle: true,
    sheetsToBuy,
    impressions,
    buyScore: sheetsToBuy * tabloid.buyWeight,
    usableW: 17,
    usableH: 11,
    cuts: {
      ...emptyCuts(
        "Cut count: 0. Fold at the 17 in midline — not a letter cut. 0 splits, no face trim.",
      ),
      brief: "0 splits, no face trim",
    },
  };
}
