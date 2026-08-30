export type ColorPath = "color" | "bw" | "mixed";

export type ParentId = "letter" | "tabloid" | "12x18" | "13x19";

export type ParentSheet = {
  id: ParentId;
  label: string;
  w: number;
  h: number;
  /** Relative buy-cost weight vs 8.5×11 (area + mill premium). Not a customer quote. */
  buyWeight: number;
};

export const PARENTS: ParentSheet[] = [
  { id: "letter", label: "8.5×11", w: 8.5, h: 11, buyWeight: 1 },
  { id: "tabloid", label: "11×17", w: 11, h: 17, buyWeight: (11 * 17) / (8.5 * 11) },
  { id: "12x18", label: "12×18", w: 12, h: 18, buyWeight: (12 * 18) / (8.5 * 11) },
  { id: "13x19", label: "13×19", w: 13, h: 19, buyWeight: (13 * 19) / (8.5 * 11) },
];

export const TRIM_IN = 0.125;
export const GRIPPER_IN = 0.25;
/** Versant planning parent max. Extra-long 13×47.2 is not a default parent. */
export const VERSANT_PLAN_MAX = { w: 13, h: 19.2 };

export type JobInput = {
  description: string;
  qty: number;
  finishW: number;
  finishH: number;
  color: ColorPath;
  sides: 1 | 2;
  stockHint?: string;
  bind?: "none" | "staple" | "saddle" | "coil" | "drill" | "laminate" | "shrink";
  fold?: "none" | "half" | "tri" | "z" | "letter";
  /** Booklet pages. Saddle requires a multiple of 4 (4, 8, 12, …). */
  pages?: number;
  /** Mixed saddle: color pages (whole signatures). */
  colorPages?: number;
  /** Mixed saddle: B&W pages (whole signatures). */
  bwPages?: number;
  /** Mixed flats: color piece qty. */
  colorQty?: number;
  /** Mixed flats: B&W piece qty. */
  bwQty?: number;
  substrate?: "paper" | "vinyl" | "garment" | "envelope" | "uv";
  scannedOriginal?: boolean;
};

export type NestResult = {
  parent: ParentSheet;
  nUp: number;
  orientation: "same" | "rotated";
  /** Parent drawn/fed as h×w so pieces can stay the same way as the file. */
  sheetTurned: boolean;
  /** True when pieces are rotated vs the customer file (extra prepress work). */
  needsFileRotate: boolean;
  cols: number;
  rows: number;
  exactTile: boolean;
  gripperApplied: boolean;
  trimApplied: boolean;
  /** Folded signature — not a 2-up letter cut of the finish. */
  saddle?: boolean;
  /** Open signature sheet (2× finish in one dimension). */
  signature?: { w: number; h: number; doubled: "w" | "h" };
  sheetsToBuy: number;
  impressions: number;
  buyScore: number;
  usableW: number;
  usableH: number;
  cuts: {
    machineId: "challenge-305-crt";
    /** Total Challenge strokes on this parent (one lift): splits + face trims. */
    clicks: number;
    splits: number;
    faceTrims: number;
    faceTrimReasons: string[];
    splitWhy: string;
    brief: string;
    why: string;
  };
};

export type RouteStep = {
  machineId: string;
  name: string;
  action: string;
  confidence: "confident" | "fuzzy";
};

export type PressLine = {
  role: "color" | "bw";
  press: RouteStep;
  nest: NestResult;
};

export type ProductionPlan = {
  job: JobInput;
  parsedFrom: "form" | "text" | "file";
  recommended: NestResult;
  alternatives: NestResult[];
  press: RouteStep;
  /** Mixed color: Versant line + Accurio line. */
  lines?: PressLine[];
  finishing: RouteStep[];
  alsoConsider: RouteStep[];
  why: string[];
  warnings: string[];
};
