import type { MailInput, UspsShape } from "./types";

/** Machinable letter (DMM 201). Length = longer side. */
export const LETTER_GATE = {
  minL: 5,
  maxL: 11.5,
  minH: 3.5,
  maxH: 6.125,
  minT: 0.007,
  minTIfLarge: 0.009,
  largeL: 6,
  largeH: 4.25,
  maxT: 0.25,
  minAspect: 1.3,
  maxAspect: 2.5,
  maxOz: 3.5,
} as const;

/**
 * Folded self-mailer letter (DMM 201.3.14) — smaller than an enveloped letter.
 * Max 6" H × 10.5" L, max 3 oz. Tabs 201.3.11.
 */
export const FSM_LETTER = {
  maxL: 10.5,
  maxH: 6,
  maxOz: 3,
  minPanels: 2,
  maxPanels: 12,
  paperLe1oz: "70# book",
  paperGt1oz: "80#",
  tabIn: 1,
  tabInOver1oz: 1.5,
  cheatSheet: "https://postalpro.usps.com/node/2711",
} as const;

/** Retail card / postcard. Notice 123 p.6. */
export const CARD_GATE = {
  minL: 5,
  maxL: 6,
  minH: 3.5,
  maxH: 4.25,
  maxT: 0.016,
} as const;

/**
 * EDDM-Retail flats only.
 * One dimension must exceed 10.5" L or 6.125" H or 0.25" T.
 * Max 15×12×0.75; min 5×3.5×0.007.
 */
export const EDDM_FLAT_GATE = {
  exceedL: 10.5,
  exceedH: 6.125,
  exceedT: 0.25,
  maxL: 15,
  maxH: 12,
  maxT: 0.75,
  minL: 5,
  minH: 3.5,
  minT: 0.007,
  maxOz: 3.3,
  minQty: 200,
  minLb: 50,
  maxPerZipDay: 5000,
} as const;

export function sides(widthIn: number, heightIn: number): { L: number; H: number } {
  return { L: Math.max(widthIn, heightIn), H: Math.min(widthIn, heightIn) };
}

/** Folded finish. Staff should still type the finished piece; this only helps when a fold is set. */
export function finishedDims(input: MailInput): { widthIn: number; heightIn: number; thicknessIn: number } {
  const { widthIn: w, heightIn: h, thicknessIn: t } = input;
  const { L, H } = sides(w, h);
  if (input.fold === "half") {
    return { widthIn: H, heightIn: L / 2, thicknessIn: t * 2 };
  }
  if (input.fold === "quarter") {
    return { widthIn: w / 2, heightIn: h / 2, thicknessIn: t * 4 };
  }
  if (input.fold === "tri" || input.fold === "letter") {
    return { widthIn: H, heightIn: L / 3, thicknessIn: t * 3 };
  }
  if (input.fold === "self-mailer") {
    if (letterSized(w, h, t) || letterSized(H, L / 2, t * 2)) {
      if (letterSized(w, h, t)) return { widthIn: w, heightIn: h, thicknessIn: t };
      return { widthIn: H, heightIn: L / 2, thicknessIn: t * 2 };
    }
    return { widthIn: H, heightIn: L / 2, thicknessIn: t * 2 };
  }
  return { widthIn: w, heightIn: h, thicknessIn: t };
}

export function letterSized(widthIn: number, heightIn: number, thicknessIn = 0.01): boolean {
  const { L, H } = sides(widthIn, heightIn);
  return L >= LETTER_GATE.minL && L <= LETTER_GATE.maxL && H >= LETTER_GATE.minH && H <= LETTER_GATE.maxH && thicknessIn <= LETTER_GATE.maxT;
}

export function postcardSized(widthIn: number, heightIn: number, thicknessIn: number): boolean {
  const { L, H } = sides(widthIn, heightIn);
  return (
    L >= CARD_GATE.minL &&
    L <= CARD_GATE.maxL &&
    H >= CARD_GATE.minH &&
    H <= CARD_GATE.maxH &&
    thicknessIn <= CARD_GATE.maxT
  );
}

export function minLetterThickness(L: number, H: number): number {
  return L > LETTER_GATE.largeL || H > LETTER_GATE.largeH ? LETTER_GATE.minTIfLarge : LETTER_GATE.minT;
}

export function letterAspectOk(widthIn: number, heightIn: number): boolean {
  const { L, H } = sides(widthIn, heightIn);
  if (H <= 0) return false;
  const aspect = L / H;
  return aspect >= LETTER_GATE.minAspect && aspect <= LETTER_GATE.maxAspect;
}

export function machinableLetter(widthIn: number, heightIn: number, thicknessIn: number, weightOz: number): boolean {
  if (!letterSized(widthIn, heightIn, thicknessIn)) return false;
  if (weightOz > LETTER_GATE.maxOz) return false;
  const { L, H } = sides(widthIn, heightIn);
  if (thicknessIn < minLetterThickness(L, H)) return false;
  return letterAspectOk(widthIn, heightIn);
}

export function fsmTabInches(weightOz: number): number {
  return weightOz > 1 ? FSM_LETTER.tabInOver1oz : FSM_LETTER.tabIn;
}

/** FSM letter gate — tighter than an enveloped letter (max H 6, not 6.125). */
export function fsmLetterOk(
  widthIn: number,
  heightIn: number,
  weightOz: number,
): boolean {
  const { L, H } = sides(widthIn, heightIn);
  return L <= FSM_LETTER.maxL && H <= FSM_LETTER.maxH && weightOz <= FSM_LETTER.maxOz;
}

export function isLetterSelfMailer(input: MailInput, finished: { widthIn: number; heightIn: number; thicknessIn: number }): boolean {
  const folded =
    input.piece === "self-mailer" ||
    input.fold === "self-mailer" ||
    input.fold === "half" ||
    input.fold === "tri" ||
    input.fold === "letter" ||
    input.fold === "quarter";
  if (input.piece === "envelope" || input.piece === "booklet") return false;
  if (!folded && input.piece !== "self-mailer") return false;
  return letterSized(finished.widthIn, finished.heightIn, finished.thicknessIn);
}

export function eddmFlatShape(widthIn: number, heightIn: number, thicknessIn: number): boolean {
  const { L, H } = sides(widthIn, heightIn);
  const exceeds = L > EDDM_FLAT_GATE.exceedL || H > EDDM_FLAT_GATE.exceedH || thicknessIn > EDDM_FLAT_GATE.exceedT;
  const withinMax = L <= EDDM_FLAT_GATE.maxL && H <= EDDM_FLAT_GATE.maxH && thicknessIn <= EDDM_FLAT_GATE.maxT;
  const withinMin = L >= EDDM_FLAT_GATE.minL && H >= EDDM_FLAT_GATE.minH && thicknessIn >= EDDM_FLAT_GATE.minT;
  return exceeds && withinMax && withinMin;
}

export function fcmFlatShape(widthIn: number, heightIn: number, thicknessIn: number): boolean {
  const { L, H } = sides(widthIn, heightIn);
  const exceedsLetter = L > LETTER_GATE.maxL || H > LETTER_GATE.maxH || thicknessIn > LETTER_GATE.maxT;
  const withinFlatMax = L <= 15 && H <= 12 && thicknessIn <= 0.75;
  return exceedsLetter && withinFlatMax;
}

export function looksLikeParentSheet(widthIn: number, heightIn: number): boolean {
  const { L, H } = sides(widthIn, heightIn);
  return (
    (H === 11 && L === 17) ||
    (H === 12 && L === 18) ||
    (H === 13 && L === 19) ||
    (H === 13 && L === 19.2)
  );
}

export function meetsEddmQtyOrWeight(qty: number, weightOz: number): boolean {
  return qty >= EDDM_FLAT_GATE.minQty || qty * weightOz >= EDDM_FLAT_GATE.minLb * 16;
}

export function classifyUspsShape(
  widthIn: number,
  heightIn: number,
  thicknessIn: number,
): UspsShape {
  if (looksLikeParentSheet(widthIn, heightIn)) return "parent-sheet";
  if (postcardSized(widthIn, heightIn, thicknessIn)) return "card";
  if (letterSized(widthIn, heightIn, thicknessIn)) return "letter";
  if (fcmFlatShape(widthIn, heightIn, thicknessIn) || eddmFlatShape(widthIn, heightIn, thicknessIn)) return "flat";
  return "other";
}

export function wantsEddm(input: MailInput): boolean {
  return input.piece === "eddm-flat" || input.addressing === "occupant-eddm" || input.goal === "saturation";
}
