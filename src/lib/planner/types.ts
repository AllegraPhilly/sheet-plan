export type ColorPath = "color" | "bw" | "auto";

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
  bind?: "none" | "staple" | "coil" | "drill" | "laminate" | "shrink";
  fold?: "none" | "half" | "tri" | "z" | "letter";
  substrate?: "paper" | "vinyl" | "garment" | "envelope" | "uv";
  scannedOriginal?: boolean;
};

export type NestResult = {
  parent: ParentSheet;
  nUp: number;
  orientation: "same" | "rotated";
  cols: number;
  rows: number;
  exactTile: boolean;
  gripperApplied: boolean;
  trimApplied: boolean;
  sheetsToBuy: number;
  impressions: number;
  buyScore: number;
  usableW: number;
  usableH: number;
  cuts: {
    machineId: "challenge-305-crt";
    clicks: number;
    why: string;
  };
};

export type RouteStep = {
  machineId: string;
  name: string;
  action: string;
  confidence: "confident" | "fuzzy";
};

export type ProductionPlan = {
  job: JobInput;
  parsedFrom: "form" | "text" | "file";
  recommended: NestResult;
  alternatives: NestResult[];
  press: RouteStep;
  finishing: RouteStep[];
  alsoConsider: RouteStep[];
  why: string[];
  warnings: string[];
};
