import { GRIPPER_IN, TRIM_IN, type JobInput, type NestResult } from "./types";

export type LayoutRect = { x: number; y: number; w: number; h: number };

export type LayoutCut = { x1: number; y1: number; x2: number; y2: number };

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
  exactTile: boolean;
  gripperApplied: boolean;
  trimApplied: boolean;
  gripper: LayoutRect | null;
  pieces: LayoutPiece[];
  cuts: LayoutCut[];
  pieceW: number;
  pieceH: number;
  tileW: number;
  tileH: number;
};

export function finishInNestOrientation(
  finish: Pick<JobInput, "finishW" | "finishH">,
  orientation: NestResult["orientation"],
): { w: number; h: number } {
  if (orientation === "rotated") {
    return { w: finish.finishH, h: finish.finishW };
  }
  return { w: finish.finishW, h: finish.finishH };
}

export function layoutFromNest(
  finish: Pick<JobInput, "finishW" | "finishH">,
  nest: NestResult,
): SheetLayout {
  const { parent, cols, rows, nUp, orientation, exactTile, gripperApplied, trimApplied } = nest;
  const piece = finishInNestOrientation(finish, orientation);
  const trimPad = trimApplied ? TRIM_IN : 0;

  const tileW = exactTile && cols > 0 ? parent.w / cols : piece.w + trimPad * 2;
  const tileH = exactTile && rows > 0 ? parent.h / rows : piece.h + trimPad * 2;

  const gripper = gripperApplied
    ? { x: 0, y: parent.h - GRIPPER_IN, w: parent.w, h: GRIPPER_IN }
    : null;

  const pieces: LayoutPiece[] = [];
  const cellCount = Math.max(0, cols) * Math.max(0, rows);
  const drawCount = Math.min(nUp, cellCount);

  for (let i = 0; i < drawCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tile = { x: col * tileW, y: row * tileH, w: tileW, h: tileH };
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

  const packedW = cols * tileW;
  const packedH = rows * tileH;
  const cuts: LayoutCut[] = [];
  if (nUp > 1) {
    for (let col = 1; col < cols; col++) {
      const x = col * tileW;
      cuts.push({ x1: x, y1: 0, x2: x, y2: packedH });
    }
    for (let row = 1; row < rows; row++) {
      const y = row * tileH;
      cuts.push({ x1: 0, y1: y, x2: packedW, y2: y });
    }
  }

  return {
    parent: { w: parent.w, h: parent.h, label: parent.label },
    nUp,
    cols,
    rows,
    orientation,
    exactTile,
    gripperApplied,
    trimApplied,
    gripper,
    pieces,
    cuts,
    pieceW: piece.w,
    pieceH: piece.h,
    tileW,
    tileH,
  };
}
