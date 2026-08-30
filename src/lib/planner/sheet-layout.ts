import { cutCountCaption, nestFrame, tallyGuillotine, type CutTally } from "./cut-count";
import { repeatCaption } from "./nest";
import { type JobInput, type NestResult } from "./types";

export { finishInNestOrientation } from "./cut-count";

export type LayoutRect = { x: number; y: number; w: number; h: number };

export type LayoutCut = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  n: number;
  axis: "h" | "v";
};

export type LayoutPiece = {
  /** Outer nest cell (includes trim when trimApplied). */
  tile: LayoutRect;
  /** Finish piece in the nested orientation. */
  finish: LayoutRect;
};

/**
 * Top-down nest geometry from existing nestOnParent fields.
 * Does not recompute n-up — piece count is nest.nUp on a nest.cols × nest.rows grid.
 */
export type SheetLayout = {
  parent: { w: number; h: number; label: string };
  nUp: number;
  cols: number;
  rows: number;
  orientation: NestResult["orientation"];
  sheetTurned: boolean;
  needsFileRotate: boolean;
  exactTile: boolean;
  gripperApplied: boolean;
  trimApplied: boolean;
  gripper: LayoutRect | null;
  pieces: LayoutPiece[];
  cuts: LayoutCut[];
  fold: LayoutCut | null;
  pieceW: number;
  pieceH: number;
  tileW: number;
  tileH: number;
  originX: number;
  originY: number;
  caption: string;
  cutTally: CutTally;
};

/** Guillotine: fewer through-cuts first (strips), then cut the strip. */
export function stripAxis(
  cols: number,
  rows: number,
  feedW: number,
  feedH: number,
): "h" | "v" | null {
  if (cols <= 1 && rows <= 1) return null;
  if (cols <= 1) return "h";
  if (rows <= 1) return "v";
  if (rows < cols) return "h";
  if (cols < rows) return "v";
  return feedH >= feedW ? "h" : "v";
}

export function layoutFromNest(
  finish: Pick<JobInput, "finishW" | "finishH">,
  nest: NestResult,
): SheetLayout {
  const { parent, cols, rows, nUp, orientation, exactTile, gripperApplied, trimApplied } = nest;
  const sheetTurned = nest.sheetTurned ?? false;
  const needsFileRotate = nest.needsFileRotate ?? orientation === "rotated";
  const saddle = nest.saddle === true;
  const frame = nestFrame(finish, nest);
  const { feed, piece, tileW, tileH, originX, originY, trimPad, gripperH } = frame;
  const cutTally = saddle
    ? {
        clicks: 0,
        splits: 0,
        faceTrims: 0,
        faceTrimReasons: [],
        splitWhy: "",
        brief: "0 splits, no face trim",
        line: "Cut count: 0. Fold at the 17 in midline — not a letter cut.",
      }
    : tallyGuillotine(finish, nest);

  const gripper = gripperApplied
    ? { x: 0, y: feed.h - gripperH, w: feed.w, h: gripperH }
    : null;

  const pieces: LayoutPiece[] = [];
  const cellCount = Math.max(0, cols) * Math.max(0, rows);
  const drawCount = saddle ? cellCount : Math.min(nUp, cellCount);

  for (let i = 0; i < drawCount; i++) {
    const col = cols > 0 ? i % cols : 0;
    const row = cols > 0 ? Math.floor(i / cols) : 0;
    const tile = {
      x: originX + col * tileW,
      y: originY + row * tileH,
      w: tileW,
      h: tileH,
    };
    pieces.push({
      tile,
      finish: {
        x: tile.x + trimPad,
        y: tile.y + trimPad,
        w: piece.w,
        h: piece.h,
      },
    });
  }

  const fold: LayoutCut | null = saddle
    ? { x1: feed.w / 2, y1: 0, x2: feed.w / 2, y2: feed.h, n: 0, axis: "v" }
    : null;

  const first = stripAxis(cols, rows, feed.w, feed.h);
  const cuts: LayoutCut[] = [];
  if (!saddle && nUp > 1 && first) {
    let n = 1;
    const pushV = () => {
      for (let col = 1; col < cols; col++) {
        const x = originX + col * tileW;
        cuts.push({ x1: x, y1: 0, x2: x, y2: feed.h, n: n++, axis: "v" });
      }
    };
    const pushH = () => {
      for (let row = 1; row < rows; row++) {
        const y = originY + row * tileH;
        cuts.push({ x1: 0, y1: y, x2: feed.w, y2: y, n: n++, axis: "h" });
      }
    };
    if (first === "h") {
      pushH();
      pushV();
    } else {
      pushV();
      pushH();
    }
  }

  return {
    parent: { w: feed.w, h: feed.h, label: parent.label },
    nUp,
    cols,
    rows,
    orientation,
    sheetTurned,
    needsFileRotate,
    exactTile,
    gripperApplied,
    trimApplied,
    gripper,
    pieces,
    cuts,
    fold,
    pieceW: piece.w,
    pieceH: piece.h,
    tileW,
    tileH,
    originX,
    originY,
    caption: saddle
      ? `Saddle signature. Fold at the 17 in midline. 4 pages per sheet. Not a letter cut. ${cutCountCaption(0)}`
      : `${repeatCaption({ w: finish.finishW, h: finish.finishH }, nest)} ${cutCountCaption(cutTally.clicks)}`,
    cutTally,
  };
}
