import { nestFrame, tallyGuillotine, type CutTally } from "./cut-count";
import { repeatCaption } from "./nest";
import { isClassicLetterSignature } from "./saddle";
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
  folds: LayoutCut[];
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
  const sig = nest.signature ?? { w: finish.finishW * 2, h: finish.finishH, doubled: "w" as const };
  const gridFinish = saddle ? { finishW: sig.w, finishH: sig.h } : finish;
  const frame = nestFrame(gridFinish, nest);
  const { feed, piece, tileW, tileH, originX, originY, trimPad, gripperH } = frame;
  const zeroTally: CutTally = {
    clicks: 0,
    splits: 0,
    faceTrims: 0,
    faceTrimReasons: [],
    splitWhy: "",
    brief: "0 splits, no face trim",
    line: nest.cuts.why,
  };
  const cutTally =
    saddle && nest.cuts.clicks === 0 ? zeroTally : tallyGuillotine(gridFinish, nest);

  const gripper = gripperApplied
    ? { x: 0, y: feed.h - gripperH, w: feed.w, h: gripperH }
    : null;

  const pieces: LayoutPiece[] = [];
  const folds: LayoutCut[] = [];
  const cellCount = Math.max(0, cols) * Math.max(0, rows);
  const drawCount = Math.min(nUp, cellCount) || (saddle ? cellCount : 0);

  for (let i = 0; i < Math.max(drawCount, saddle ? Math.max(1, nUp) : 0); i++) {
    if (!saddle && i >= drawCount) break;
    const col = cols > 0 ? i % cols : 0;
    const row = cols > 0 ? Math.floor(i / cols) : 0;
    const tile = {
      x: originX + col * tileW,
      y: originY + row * tileH,
      w: tileW,
      h: tileH,
    };
    if (saddle) {
      const pageW = sig.doubled === "w" ? piece.w / 2 : piece.w;
      const pageH = sig.doubled === "h" ? piece.h / 2 : piece.h;
      const fx = tile.x + trimPad;
      const fy = tile.y + trimPad;
      pieces.push({ tile, finish: { x: fx, y: fy, w: pageW, h: pageH } });
      if (sig.doubled === "w") {
        pieces.push({ tile, finish: { x: fx + pageW, y: fy, w: pageW, h: pageH } });
        folds.push({ x1: fx + pageW, y1: fy, x2: fx + pageW, y2: fy + pageH, n: 0, axis: "v" });
      } else {
        pieces.push({ tile, finish: { x: fx, y: fy + pageH, w: pageW, h: pageH } });
        folds.push({ x1: fx, y1: fy + pageH, x2: fx + pageW, y2: fy + pageH, n: 0, axis: "h" });
      }
    } else {
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
  }

  const fold = folds[0] ?? null;

  const first = stripAxis(cols, rows, feed.w, feed.h);
  const cuts: LayoutCut[] = [];
  const showCuts = !saddle || nest.cuts.clicks > 0;
  if (showCuts && nUp > 1 && first) {
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

  const classicLetter = isClassicLetterSignature(nest, {
    w: finish.finishW,
    h: finish.finishH,
  });

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
    folds,
    pieceW: saddle ? (sig.doubled === "w" ? piece.w / 2 : piece.w) : piece.w,
    pieceH: saddle ? (sig.doubled === "h" ? piece.h / 2 : piece.h) : piece.h,
    tileW,
    tileH,
    originX,
    originY,
    caption: saddle
      ? classicLetter
        ? `Saddle signature. Fold at the 17 in midline. 4 pages per sheet. Not a letter cut.`
        : `Saddle signature ${sig.w}×${sig.h} (${nUp}-up). 4 pages per sheet. Fold at the midline. Not a letter 2-up cut.`
      : `${repeatCaption({ w: finish.finishW, h: finish.finishH }, nest)}`,
    cutTally,
  };
}
