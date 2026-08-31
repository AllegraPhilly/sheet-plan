import { describe, expect, it } from "vitest";
import {
  COMMON_CORE_OD_IN,
  SUMMA_USABLE_WIDTH_IN,
  caliperLengthInches,
  inchesToFeetYards,
  remainingByWeight,
  scaleFromFullRoll,
  thicknessToInches,
} from "./leftover";

describe("leftover roll estimates", () => {
  it("caliper: π(D² − d²)/(4t) for 8 in OD, 3 in core, 10 mil", () => {
    const t = thicknessToInches(10, "mils");
    expect(t).toBeCloseTo(0.01);
    expect(thicknessToInches(0.01, "inches")).toBeCloseTo(0.01);
    const inches = caliperLengthInches(8, 3, t!);
    expect(inches).toBeCloseTo((Math.PI * (64 - 9)) / (4 * 0.01));
    const out = inchesToFeetYards(inches!);
    expect(out.feet).toBeCloseTo(inches! / 12);
    expect(out.yards).toBeCloseTo(inches! / 36);
    expect(out.feet).toBeCloseTo(359.97, 1);
  });

  it("full-roll OD scale: 150 ft full at 10 in, remaining 8 in, 3 in core", () => {
    const remaining = scaleFromFullRoll(8, 10, 3, 150);
    expect(remaining).toBeCloseTo(150 * (64 - 9) / (100 - 9));
    expect(remaining).toBeCloseTo(90.66, 1);
  });

  it("weight: 150 ft full, 50 lb full, 2 lb core, 20 lb partial", () => {
    const remaining = remainingByWeight(50, 2, 20, 150);
    expect(remaining).toBeCloseTo(150 * (18 / 48));
    expect(remaining).toBe(56.25);
  });

  it("refuses blank/invalid inputs and keeps Summa width as a hint constant", () => {
    expect(caliperLengthInches(8, 3, 0)).toBeNull();
    expect(caliperLengthInches(3, 3, 0.01)).toBeNull();
    expect(thicknessToInches(Number.NaN, "mils")).toBeNull();
    expect(scaleFromFullRoll(8, 10, 3, 0)).toBeNull();
    expect(remainingByWeight(50, 50, 20, 150)).toBeNull();
    expect(COMMON_CORE_OD_IN).toBe(3);
    expect(SUMMA_USABLE_WIDTH_IN).toBeCloseTo(53.1);
  });
});
