/**
 * Hardcoded Notice 123 cells only. Effective 2026-07-12.
 * Never invent a rate — callers must treat a miss as NOTICE.miss.
 */
export const NOTICE_EFFECTIVE = "2026-07-12" as const;

export const FCM = {
  letterStamp1oz: { amount: 0.82, page: 6 },
  letterMeter1oz: { amount: 0.78, page: 6 },
  letterStamp2oz: { amount: 1.11, page: 6 },
  letterStamp3oz: { amount: 1.4, page: 6 },
  letterStamp3_5oz: { amount: 1.69, page: 6 },
  letterMeter2oz: { amount: 1.07, page: 6 },
  letterMeter3oz: { amount: 1.36, page: 6 },
  letterMeter3_5oz: { amount: 1.65, page: 6 },
  postcard: { amount: 0.65, page: 6 },
  flat1oz: { amount: 1.69, page: 6 },
  nonmachinable: { amount: 0.49, page: 6 },
  commAuto5digitLetter: { amount: 0.621, page: 13, minQty: 500 },
} as const;

export const EDDM_RETAIL = {
  flatUpTo3_3oz: { amount: 0.26, page: 6 },
  annualFee: { amount: 0, page: null, dmm: "143.1.1" },
} as const;

export const MM = {
  letterAuto5digitOrigin: { amount: 0.395, page: 17 },
  letterAuto5digitDscf: { amount: 0.374, page: 17 },
  letterMixedMach: { amount: 0.473, page: 17 },
  letterDdu: null,
  eddmFlat4ozOrigin: { amount: 0.309, page: 19 },
  eddmFlat4ozDscf: { amount: 0.268, page: 19 },
  eddmFlat4ozDdu: { amount: 0.259, page: 19 },
} as const;

export const FEES = {
  permitImprint: { amount: 390, page: 33 },
  mmAnnual: { amount: 390, page: 33 },
  fcmPresortAnnual: { amount: 390, page: 33 },
} as const;

export function fcmLetterMeter(weightOz: number): { amount: number; page: number } | null {
  if (weightOz <= 1) return FCM.letterMeter1oz;
  if (weightOz <= 2) return FCM.letterMeter2oz;
  if (weightOz <= 3) return FCM.letterMeter3oz;
  if (weightOz <= 3.5) return FCM.letterMeter3_5oz;
  return null;
}

export function fcmLetterStamp(weightOz: number): { amount: number; page: number } | null {
  if (weightOz <= 1) return FCM.letterStamp1oz;
  if (weightOz <= 2) return FCM.letterStamp2oz;
  if (weightOz <= 3) return FCM.letterStamp3oz;
  if (weightOz <= 3.5) return FCM.letterStamp3_5oz;
  return null;
}
