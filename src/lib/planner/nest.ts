import { cutsFromNest } from "./cut-count";
import {
  GRIPPER_IN,
  PARENTS,
  TRIM_IN,
  type JobInput,
  type NestResult,
  type ParentSheet,
} from "./types";

const EPS = 0.02;

export function approx(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

export function dimsMatch(
  a: { w: number; h: number },
  b: { w: number; h: number },
): boolean {
  return (
    (approx(a.w, b.w) && approx(a.h, b.h)) ||
    (approx(a.w, b.h) && approx(a.h, b.w))
  );
}

export type ExactTileLayout = {
  cols: number;
  rows: number;
  nUp: number;
  orientation: "same" | "rotated";
  sheetTurned: boolean;
};

export function feedSize(parent: ParentSheet, sheetTurned: boolean): { w: number; h: number } {
  return sheetTurned ? { w: parent.h, h: parent.w } : { w: parent.w, h: parent.h };
}

/**
 * Finish tiles the parent on an integer grid with no leftover.
 * Prefers pieces the same way as the file (turn the sheet) over rotating art.
 * Letter on tabloid: 17×11 feed, 2-across. 6×9 on 12×18: 2×2. 5.5×8.5 on 11×17: 2×2.
 */
export function exactTileOnFeed(
  finish: { w: number; h: number },
  parent: ParentSheet,
  sheetTurned: boolean,
  orientation: NestResult["orientation"],
): ExactTileLayout | null {
  const feed = feedSize(parent, sheetTurned);
  const pieceW = orientation === "same" ? finish.w : finish.h;
  const pieceH = orientation === "same" ? finish.h : finish.w;
  if (pieceW <= 0 || pieceH <= 0) return null;
  const cols = Math.round(feed.w / pieceW);
  const rows = Math.round(feed.h / pieceH);
  const nUp = cols * rows;
  if (cols < 1 || rows < 1 || nUp < 2) return null;
  if (approx(cols * pieceW, feed.w) && approx(rows * pieceH, feed.h)) {
    return { cols, rows, nUp, orientation, sheetTurned };
  }
  return null;
}

export function exactTileLayout(
  finish: { w: number; h: number },
  parent: ParentSheet,
): ExactTileLayout | null {
  const candidates: ExactTileLayout[] = [];
  for (const sheetTurned of [false, true] as const) {
    for (const orientation of ["same", "rotated"] as const) {
      const tile = exactTileOnFeed(finish, parent, sheetTurned, orientation);
      if (tile) candidates.push(tile);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.nUp !== b.nUp) return b.nUp - a.nUp;
    if (a.orientation !== b.orientation) return a.orientation === "same" ? -1 : 1;
    return Number(a.sheetTurned) - Number(b.sheetTurned);
  });
  return candidates[0];
}

export function isExactTile(finish: { w: number; h: number }, parent: ParentSheet): boolean {
  return exactTileLayout(finish, parent) !== null;
}

export function isClassicLetterTabloid(finish: { w: number; h: number }, parent: ParentSheet): boolean {
  return dimsMatch(finish, { w: 8.5, h: 11 }) && dimsMatch(parent, { w: 11, h: 17 });
}

function pack(
  pieceW: number,
  pieceH: number,
  usableW: number,
  usableH: number,
): { cols: number; rows: number; nUp: number } {
  const cols = Math.floor((usableW + EPS) / pieceW);
  const rows = Math.floor((usableH + EPS) / pieceH);
  const nUp = Math.max(0, cols) * Math.max(0, rows);
  return { cols: Math.max(0, cols), rows: Math.max(0, rows), nUp };
}

export type NestOptions = {
  /** When false (default), only same-way-as-file nests. Sheet may still turn. */
  allowFileRotate?: boolean;
};

function pieceSize(
  finish: { w: number; h: number },
  orientation: NestResult["orientation"],
  trimApplied: boolean,
): { w: number; h: number } {
  const rawW = orientation === "same" ? finish.w : finish.h;
  const rawH = orientation === "same" ? finish.h : finish.w;
  const pad = trimApplied ? TRIM_IN * 2 : 0;
  return { w: rawW + pad, h: rawH + pad };
}

function finishLabel(finish: { w: number; h: number }): string {
  return `${finish.w}×${finish.h}`;
}

/** Operator line for prepress / Versant / Challenge. Ticket visual only — not a JDF export. */
export function repeatCaption(
  finish: { w: number; h: number },
  nest: Pick<
    NestResult,
    "nUp" | "cols" | "rows" | "sheetTurned" | "needsFileRotate" | "exactTile"
  >,
): string {
  const size = finishLabel(finish);
  if (nest.nUp <= 1) {
    return nest.needsFileRotate
      ? "1-up, file rotated 90°. Prepress would have to rotate the file."
      : "1-up, same as the file. No parent cut.";
  }
  const head = nest.needsFileRotate
    ? `Repeat ${nest.nUp}-up, file rotated 90°. Prepress would have to rotate the file.`
    : `Repeat ${nest.nUp}-up, all same way.`;
  const sheet = nest.sheetTurned && !nest.needsFileRotate ? " Sheet turned for feed." : "";
  const bothAxes = nest.cols > 1 && nest.rows > 1;
  if (!bothAxes) {
    return `${head}${sheet} Cut 1: split to ${size}.`;
  }
  return `${head}${sheet} Cut 1: split to strips. Cut 2: cut strips to ${size}.`;
}

function cutPlan(
  finish: { w: number; h: number },
  nest: Pick<
    NestResult,
    | "parent"
    | "nUp"
    | "cols"
    | "rows"
    | "orientation"
    | "sheetTurned"
    | "exactTile"
    | "gripperApplied"
    | "trimApplied"
    | "needsFileRotate"
  >,
): NestResult["cuts"] {
  return cutsFromNest(finish, nest);
}

function compareNests(a: NestResult, b: NestResult): number {
  if (a.buyScore !== b.buyScore) return a.buyScore - b.buyScore;
  if (a.impressions !== b.impressions) return a.impressions - b.impressions;
  if (a.needsFileRotate !== b.needsFileRotate) return a.needsFileRotate ? 1 : -1;
  if (a.cuts.clicks !== b.cuts.clicks) return a.cuts.clicks - b.cuts.clicks;
  if (a.sheetTurned !== b.sheetTurned) return a.sheetTurned ? 1 : -1;
  return a.parent.w * a.parent.h - b.parent.w * b.parent.h;
}

function packOnFeed(
  finish: { w: number; h: number },
  parent: ParentSheet,
  sheetTurned: boolean,
  orientation: NestResult["orientation"],
  job: JobInput,
): NestResult | null {
  const feed = feedSize(parent, sheetTurned);
  const sameSize = dimsMatch(finish, parent);
  const tile = exactTileOnFeed(finish, parent, sheetTurned, orientation);
  const useTile = tile !== null;

  let gripperApplied = false;
  let trimApplied = false;
  let usableW = feed.w;
  let usableH = feed.h;
  let cols = 0;
  let rows = 0;
  let nUp = 0;
  let exactTile = false;

  if (useTile) {
    exactTile = true;
    cols = tile.cols;
    rows = tile.rows;
    nUp = tile.nUp;
  } else if (sameSize && orientation === "same" && !sheetTurned && approx(finish.w, parent.w)) {
    cols = 1;
    rows = 1;
    nUp = 1;
  } else if (sameSize && orientation === "same" && sheetTurned && approx(finish.w, parent.h)) {
    cols = 1;
    rows = 1;
    nUp = 1;
  } else if (sameSize && orientation === "rotated" && !sheetTurned && !approx(finish.w, parent.w)) {
    cols = 1;
    rows = 1;
    nUp = 1;
  } else {
    gripperApplied = true;
    trimApplied = true;
    usableH = feed.h - GRIPPER_IN;
    const piece = pieceSize(finish, orientation, true);
    const packed = pack(piece.w, piece.h, usableW, usableH);
    cols = packed.cols;
    rows = packed.rows;
    nUp = packed.nUp;
  }

  if (nUp < 1) return null;

  const sheetsToBuy = Math.ceil(job.qty / nUp);
  const impressions = sheetsToBuy * job.sides;
  const buyScore = sheetsToBuy * parent.buyWeight;
  const needsFileRotate = orientation === "rotated";
  const nestBits = {
    parent,
    nUp,
    cols,
    rows,
    orientation,
    sheetTurned,
    exactTile,
    gripperApplied,
    trimApplied,
    needsFileRotate,
  };

  return {
    parent,
    nUp,
    orientation,
    sheetTurned,
    needsFileRotate,
    cols,
    rows,
    exactTile,
    gripperApplied,
    trimApplied,
    saddle: false,
    sheetsToBuy,
    impressions,
    buyScore,
    usableW,
    usableH,
    cuts: cutPlan(finish, nestBits),
  };
}

function pickBest(candidates: NestResult[]): NestResult | null {
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.nUp !== b.nUp) return b.nUp - a.nUp;
    if (a.needsFileRotate !== b.needsFileRotate) return a.needsFileRotate ? 1 : -1;
    if (a.exactTile !== b.exactTile) return a.exactTile ? -1 : 1;
    if (a.sheetTurned !== b.sheetTurned) return a.sheetTurned ? 1 : -1;
    return 0;
  });
  return candidates[0];
}

export function nestOnParent(
  job: JobInput,
  parent: ParentSheet,
  opts: NestOptions = {},
): NestResult | null {
  const finish = { w: job.finishW, h: job.finishH };
  const allowFileRotate = opts.allowFileRotate === true;
  const orientations: NestResult["orientation"][] = allowFileRotate
    ? ["same", "rotated"]
    : ["same"];

  const candidates: NestResult[] = [];
  for (const sheetTurned of [false, true] as const) {
    for (const orientation of orientations) {
      const nest = packOnFeed(finish, parent, sheetTurned, orientation, job);
      if (nest) candidates.push(nest);
    }
  }
  return pickBest(candidates);
}

export function nestKey(nest: NestResult): string {
  return `${nest.parent.id}:${nest.needsFileRotate ? "rotate" : "same"}:${nest.sheetTurned ? "turned" : "catalog"}`;
}

export function rankParents(job: JobInput): NestResult[] {
  const sameWay = PARENTS.map((p) => nestOnParent(job, p, { allowFileRotate: false })).filter(
    (n): n is NestResult => n !== null,
  );
  sameWay.sort(compareNests);

  const extras: NestResult[] = [];
  for (const p of PARENTS) {
    const same = sameWay.find((n) => n.parent.id === p.id);
    const withRotate = nestOnParent(job, p, { allowFileRotate: true });
    if (withRotate?.needsFileRotate && (!same || withRotate.nUp > same.nUp)) {
      extras.push(withRotate);
    }
  }
  extras.sort(compareNests);

  if (sameWay.length === 0) return extras;
  return [...sameWay, ...extras];
}

export function allParents(): ParentSheet[] {
  return PARENTS;
}
