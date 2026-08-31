/** Leftover vinyl-on-a-roll estimates. Wound tightness varies. Not a cut file. */

export const SUMMA_USABLE_WIDTH_IN = 53.1;
export const COMMON_CORE_OD_IN = 3;

export type ThicknessUnit = "mils" | "inches";

export type LengthOut = {
  inches: number;
  feet: number;
  yards: number;
};

export function thicknessToInches(value: number, unit: ThicknessUnit): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return unit === "mils" ? value / 1000 : value;
}

export function inchesToFeetYards(inches: number): LengthOut {
  return { inches, feet: inches / 12, yards: inches / 36 };
}

/**
 * Caliper / partial-roll length from outer diameter, core OD, and thickness.
 * Length ≈ π(D² − d²) / (4t)  (same units as D, d, t).
 */
export function caliperLengthInches(
  outerDiameterIn: number,
  coreOuterDiameterIn: number,
  thicknessIn: number,
): number | null {
  if (
    !Number.isFinite(outerDiameterIn) ||
    !Number.isFinite(coreOuterDiameterIn) ||
    !Number.isFinite(thicknessIn)
  ) {
    return null;
  }
  if (!(outerDiameterIn > coreOuterDiameterIn) || !(coreOuterDiameterIn > 0) || !(thicknessIn > 0)) {
    return null;
  }
  return (Math.PI * (outerDiameterIn ** 2 - coreOuterDiameterIn ** 2)) / (4 * thicknessIn);
}

/**
 * Scale remaining length from a known-full roll at a measured OD.
 * remaining = fullLength × (D² − d²) / (D_full² − d²)
 * Cancels thickness — usually closer than a caliper guess.
 */
export function scaleFromFullRoll(
  remainingOuterDiameter: number,
  fullOuterDiameter: number,
  coreOuterDiameter: number,
  fullLength: number,
): number | null {
  if (
    !Number.isFinite(remainingOuterDiameter) ||
    !Number.isFinite(fullOuterDiameter) ||
    !Number.isFinite(coreOuterDiameter) ||
    !Number.isFinite(fullLength)
  ) {
    return null;
  }
  if (
    !(remainingOuterDiameter >= coreOuterDiameter) ||
    !(fullOuterDiameter > coreOuterDiameter) ||
    !(coreOuterDiameter > 0) ||
    !(fullLength > 0)
  ) {
    return null;
  }
  const rem = remainingOuterDiameter ** 2 - coreOuterDiameter ** 2;
  const full = fullOuterDiameter ** 2 - coreOuterDiameter ** 2;
  if (!(full > 0) || rem < 0) return null;
  return fullLength * (rem / full);
}

/**
 * Weight method.
 * remaining = fullLength × (partial − core) / (full − core)
 */
export function remainingByWeight(
  fullRollWeight: number,
  emptyCoreWeight: number,
  partialRollWeight: number,
  fullLength: number,
): number | null {
  if (
    !Number.isFinite(fullRollWeight) ||
    !Number.isFinite(emptyCoreWeight) ||
    !Number.isFinite(partialRollWeight) ||
    !Number.isFinite(fullLength)
  ) {
    return null;
  }
  if (!(fullLength > 0)) return null;
  const denom = fullRollWeight - emptyCoreWeight;
  const numer = partialRollWeight - emptyCoreWeight;
  if (!(denom > 0) || numer < 0) return null;
  return fullLength * (numer / denom);
}

export function formatLength(n: number, digits = 2): string {
  const rounded = Number(n.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
}
