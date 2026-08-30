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

/** Letter on tabloid tiles exactly (8.5+8.5=17, 11=11). No gripper, no trim waste. */
export function isExactTile(finish: { w: number; h: number }, parent: ParentSheet): boolean {
  const letter = { w: 8.5, h: 11 };
  const tabloid = { w: 11, h: 17 };
  return dimsMatch(finish, letter) && dimsMatch(parent, tabloid);
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

export function nestOnParent(job: JobInput, parent: ParentSheet): NestResult | null {
  const finish = { w: job.finishW, h: job.finishH };
  const exactTile = isExactTile(finish, parent);
  const sameSize = dimsMatch(finish, parent);

  let gripperApplied = false;
  let trimApplied = false;
  let usableW = parent.w;
  let usableH = parent.h;
  let pieceW = finish.w;
  let pieceH = finish.h;

  if (exactTile || sameSize) {
    gripperApplied = false;
    trimApplied = false;
  } else {
    gripperApplied = true;
    trimApplied = true;
    usableH = parent.h - GRIPPER_IN;
    pieceW = finish.w + TRIM_IN * 2;
    pieceH = finish.h + TRIM_IN * 2;
  }

  const same = pack(pieceW, pieceH, usableW, usableH);
  const rotated = pack(pieceH, pieceW, usableW, usableH);

  let best = same;
  let orientation: NestResult["orientation"] = "same";
  if (rotated.nUp > same.nUp) {
    best = rotated;
    orientation = "rotated";
  } else if (rotated.nUp === same.nUp && rotated.nUp > 0 && exactTile) {
    // Prefer the 2-across-the-17" edge for the classic one-cut.
    if (rotated.cols * (orientation === "same" ? pieceH : pieceW) > same.cols * pieceW) {
      best = rotated;
      orientation = "rotated";
    }
  }

  if (exactTile) {
    best = { cols: 1, rows: 2, nUp: 2 };
    orientation = "rotated";
    usableW = parent.w;
    usableH = parent.h;
  }

  if (sameSize) {
    best = { cols: 1, rows: 1, nUp: 1 };
    orientation = approx(finish.w, parent.w) ? "same" : "rotated";
  }

  if (best.nUp < 1) return null;

  const sheetsToBuy = Math.ceil(job.qty / best.nUp);
  const impressions = sheetsToBuy * job.sides;
  const buyScore = sheetsToBuy * parent.buyWeight;

  const cuts = cutPlan(finish, parent, best.nUp, exactTile, sameSize);

  return {
    parent,
    nUp: best.nUp,
    orientation,
    cols: best.cols,
    rows: best.rows,
    exactTile,
    gripperApplied,
    trimApplied,
    sheetsToBuy,
    impressions,
    buyScore,
    usableW,
    usableH,
    cuts,
  };
}

function cutPlan(
  finish: { w: number; h: number },
  parent: ParentSheet,
  nUp: number,
  exactTile: boolean,
  sameSize: boolean,
): NestResult["cuts"] {
  if (sameSize || nUp === 1) {
    return {
      machineId: "challenge-305-crt",
      clicks: 0,
      why: "Run as finish size — no parent cut.",
    };
  }
  if (exactTile && nUp === 2) {
    return {
      machineId: "challenge-305-crt",
      clicks: 1,
      why: "One Challenge 305 CRT click splits 11×17 into two 8.5×11 (one click vs two on a larger parent).",
    };
  }
  const clicks = nUp <= 2 ? 1 : nUp <= 4 ? 2 : 3;
  return {
    machineId: "challenge-305-crt",
    clicks,
    why: `${nUp}-up on ${parent.label} → ${clicks} Challenge 305 CRT click${clicks === 1 ? "" : "s"} (30.5 in knife).`,
  };
}

export function rankParents(job: JobInput): NestResult[] {
  const nests = PARENTS.map((p) => nestOnParent(job, p)).filter(
    (n): n is NestResult => n !== null,
  );
  return nests.sort((a, b) => {
    if (a.buyScore !== b.buyScore) return a.buyScore - b.buyScore;
    if (a.impressions !== b.impressions) return a.impressions - b.impressions;
    if (a.cuts.clicks !== b.cuts.clicks) return a.cuts.clicks - b.cuts.clicks;
    return a.parent.w * a.parent.h - b.parent.w * b.parent.h;
  });
}

export function allParents(): ParentSheet[] {
  return PARENTS;
}
