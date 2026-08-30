import { GRIPPER_IN, TRIM_IN, type JobInput, type NestResult, type ParentSheet } from "./types";

const EPS = 0.02;

export type CutTally = {
  /** Operator strokes on this parent (one lift): splits + face trims. */
  clicks: number;
  splits: number;
  faceTrims: number;
  faceTrimReasons: string[];
  splitWhy: string;
  /** Ticket line, e.g. "2 splits, no face trim". */
  brief: string;
  line: string;
};

export type NestFrame = {
  feed: { w: number; h: number };
  piece: { w: number; h: number };
  tileW: number;
  tileH: number;
  originX: number;
  originY: number;
  trimPad: number;
  gripperH: number;
};

export type CutNest = Pick<
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
>;

function feedOf(parent: ParentSheet, sheetTurned: boolean): { w: number; h: number } {
  return sheetTurned ? { w: parent.h, h: parent.w } : { w: parent.w, h: parent.h };
}

export function finishInNestOrientation(
  finish: Pick<JobInput, "finishW" | "finishH">,
  orientation: NestResult["orientation"],
): { w: number; h: number } {
  if (orientation === "rotated") {
    return { w: finish.finishH, h: finish.finishW };
  }
  return { w: finish.finishW, h: finish.finishH };
}

/** Same packed grid layoutFromNest uses — leftover and trim come from these edges. */
export function nestFrame(
  finish: Pick<JobInput, "finishW" | "finishH">,
  nest: CutNest,
): NestFrame {
  const { parent, cols, rows, orientation, exactTile, gripperApplied, trimApplied, sheetTurned } = nest;
  const feed = feedOf(parent, sheetTurned);
  const piece = finishInNestOrientation(finish, orientation);
  const trimPad = trimApplied ? TRIM_IN : 0;
  const tileW = exactTile && cols > 0 ? feed.w / cols : piece.w + trimPad * 2;
  const tileH = exactTile && rows > 0 ? feed.h / rows : piece.h + trimPad * 2;
  const gripperH = gripperApplied ? GRIPPER_IN : 0;
  const packedW = cols * tileW;
  const packedH = rows * tileH;
  const originX = Math.max(0, (feed.w - packedW) / 2);
  const originY = Math.max(0, (feed.h - gripperH - packedH) / 2);
  return { feed, piece, tileW, tileH, originX, originY, trimPad, gripperH };
}

function leftover(edge: number, limit: number): boolean {
  return edge > EPS && edge < limit - EPS;
}

export function briefCutLine(splits: number, faceTrims: number): string {
  const splitPart = splits === 1 ? "1 split" : `${splits} splits`;
  if (faceTrims === 0) return `${splitPart}, no face trim`;
  const facePart = faceTrims === 1 ? "1 face trim" : `${faceTrims} face trim`;
  return `${splitPart}, ${facePart}`;
}

function splitWhy(splits: number, cols: number, rows: number): string {
  if (splits <= 0) return "";
  if (cols > 1 && rows > 1) return "strip then cut the strip";
  return "between the n-up pieces";
}

function formatLine(clicks: number, faceTrims: number, reasons: string[], splits: number, why: string): string {
  const brief = briefCutLine(splits, faceTrims);
  const face =
    faceTrims === 0 ? "Face trim: no" : `Face trim: yes, ${faceTrims} (${reasons.join(", ")})`;
  const splitPart = splits === 0 ? "Splits: 0" : `Splits: ${splits} (${why})`;
  return `Cut count: ${clicks}. ${brief}. ${face}. ${splitPart}.`;
}

/**
 * Guillotine strokes on one parent lift — not a fake n-up heuristic, not per finished piece.
 * Unique finish-edge through-cuts: strip the sheet, then cut the strip.
 * Face trims are the extra edges when gripper / trim / unused margin remains.
 */
export function tallyGuillotine(
  finish: Pick<JobInput, "finishW" | "finishH">,
  nest: CutNest,
): CutTally {
  const { feed, piece, tileW, tileH, originX, originY, trimPad, gripperH } = nestFrame(finish, nest);
  const { cols, rows, nUp, gripperApplied, trimApplied } = nest;

  const packedW = cols * tileW;
  const packedH = rows * tileH;
  const firstX = originX + trimPad;
  const lastX = originX + packedW - trimPad;
  const firstY = originY + trimPad;
  const lastY = originY + packedH - trimPad;

  const splitX = nUp > 1 && cols > 1 ? cols - 1 : 0;
  const splitY = nUp > 1 && rows > 1 ? rows - 1 : 0;
  const splits = splitX + splitY;

  const leftFace = leftover(firstX, feed.w);
  const rightFace = leftover(lastX, feed.w);
  const topFace = leftover(firstY, feed.h);
  const bottomFace = leftover(lastY, feed.h);
  const outerFaces =
    Number(leftFace) + Number(rightFace) + Number(topFace) + Number(bottomFace);

  const gutterGapX = tileW - piece.w;
  const gutterGapY = tileH - piece.h;
  const gutterFaces = (gutterGapX > EPS ? splitX : 0) + (gutterGapY > EPS ? splitY : 0);

  const faceTrims = outerFaces + gutterFaces;
  const clicks = splits + faceTrims;

  const reasons: string[] = [];
  if (faceTrims > 0) {
    if (gripperApplied && feed.h - lastY > EPS) reasons.push("gripper leftover");
    if (trimApplied) reasons.push("trim/bleed edges");
    const trimAllowance = trimApplied ? TRIM_IN : 0;
    const unusedLeft = firstX > trimAllowance + EPS;
    const unusedRight = feed.w - lastX > trimAllowance + EPS;
    const unusedTop = firstY > trimAllowance + EPS;
    const unusedBottom = feed.h - lastY - gripperH > trimAllowance + EPS;
    if (unusedLeft || unusedRight || unusedTop || unusedBottom) {
      reasons.push("unused parent margin");
    }
    if (reasons.length === 0) reasons.push("leftover edges");
  }

  const why = splitWhy(splits, cols, rows);
  const brief = briefCutLine(splits, faceTrims);
  return {
    clicks,
    splits,
    faceTrims,
    faceTrimReasons: reasons,
    splitWhy: why,
    brief,
    line: formatLine(clicks, faceTrims, reasons, splits, why),
  };
}

export function cutsFromNest(
  finish: { w: number; h: number },
  nest: CutNest,
): NestResult["cuts"] {
  const tally = tallyGuillotine({ finishW: finish.w, finishH: finish.h }, nest);
  return {
    machineId: "challenge-305-crt",
    clicks: tally.clicks,
    splits: tally.splits,
    faceTrims: tally.faceTrims,
    faceTrimReasons: tally.faceTrimReasons,
    splitWhy: tally.splitWhy,
    brief: tally.brief,
    why: tally.line,
  };
}

export function emptyCuts(why: string): NestResult["cuts"] {
  return {
    machineId: "challenge-305-crt",
    clicks: 0,
    splits: 0,
    faceTrims: 0,
    faceTrimReasons: [],
    splitWhy: "",
    brief: briefCutLine(0, 0),
    why,
  };
}

export function cutCountCaption(clicks: number): string {
  return `Cut count: ${clicks}.`;
}
