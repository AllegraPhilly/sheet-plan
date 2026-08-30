import { describe, expect, it } from "vitest";
import { FORBIDDEN_UI_STRINGS, MACHINES, neverRouteIds } from "@/lib/machines";
import { isExactTile, nestOnParent, rankParents } from "@/lib/planner/nest";
import { planFromDescription, planFromJob } from "@/lib/planner/plan";
import { PARENTS, VERSANT_PLAN_MAX, type JobInput } from "@/lib/planner/types";

const letterJob = (over: Partial<JobInput> = {}): JobInput => ({
  description: "500 flyers 8.5x11 color",
  qty: 500,
  finishW: 8.5,
  finishH: 11,
  color: "color",
  sides: 1,
  fold: "none",
  bind: "none",
  substrate: "paper",
  ...over,
});

describe("classic letter plan", () => {
  it("finish 8.5×11 → buy 11×17 2-up → Challenge 305 CRT one click", () => {
    const plan = planFromJob(letterJob());
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(2);
    expect(plan.recommended.exactTile).toBe(true);
    expect(plan.recommended.gripperApplied).toBe(false);
    expect(plan.recommended.cuts.machineId).toBe("challenge-305-crt");
    expect(plan.recommended.cuts.clicks).toBe(1);
    expect(plan.recommended.sheetsToBuy).toBe(250);
    expect(plan.recommended.impressions).toBe(250);
    expect(plan.why.join(" ")).toMatch(/one click vs two/i);
    expect(plan.press.machineId).toBe("versant-4100");
  });

  it("recommends cheapest parent to BUY (buyScore), not only floor stock", () => {
    const ranked = rankParents(letterJob());
    expect(ranked[0].parent.id).toBe("tabloid");
    for (const row of ranked.slice(1)) {
      expect(row.buyScore).toBeGreaterThanOrEqual(ranked[0].buyScore);
    }
    const letterOnly = nestOnParent(letterJob(), PARENTS[0]);
    expect(letterOnly?.impressions).toBe(500);
    expect(ranked[0].impressions).toBeLessThan(letterOnly!.impressions);
  });

  it("B&W routes to Accurio 6120", () => {
    const plan = planFromJob(letterJob({ color: "bw", description: "500 letters bw" }));
    expect(plan.press.machineId).toBe("accurio-6120");
  });
});

describe("routing confidence", () => {
  it("never routes skip machines (MAILBOT)", () => {
    const plan = planFromDescription("200 color postcards 4x6 mail them");
    const ids = [plan.press, ...plan.finishing, ...plan.alsoConsider].map((s) => s.machineId);
    expect(ids).not.toContain("mailbot");
    expect(neverRouteIds()).toContain("mailbot");
  });

  it("vinyl goes to Summa, not Challenge", () => {
    const plan = planFromDescription("10 vinyl decals 12x12");
    expect(plan.press.machineId).toBe("summa-s2t140");
    expect(plan.finishing.every((s) => s.machineId !== "challenge-305-crt")).toBe(true);
  });

  it("envelopes go to Enpress, not Versant", () => {
    const plan = planFromDescription("250 #10 envelopes color");
    expect(plan.press.machineId).toBe("xante-enpress");
  });
});

describe("Versant planning parent", () => {
  it("planning max is 13×19.2 — extra-long 13×47.2 is not a default parent", () => {
    expect(VERSANT_PLAN_MAX).toEqual({ w: 13, h: 19.2 });
    expect(PARENTS.every((p) => p.h <= 19.2 && p.w <= 13)).toBe(true);
    const catalog = JSON.stringify(MACHINES);
    expect(catalog).toMatch(/13×47\.2/);
    expect(catalog).toMatch(/not a default parent/i);
  });
});

describe("secrets and brand", () => {
  it("does not store Versant serial PZZ447134 or Fiery or allegraphilly.com", () => {
    const blob = JSON.stringify({ MACHINES, PARENTS });
    for (const s of FORBIDDEN_UI_STRINGS) {
      expect(blob.toLowerCase()).not.toContain(s.toLowerCase());
    }
  });
});

describe("exact-tile helper", () => {
  it("letter on tabloid is exact tile", () => {
    expect(isExactTile({ w: 8.5, h: 11 }, PARENTS[1])).toBe(true);
    expect(isExactTile({ w: 5, h: 7 }, PARENTS[1])).toBe(false);
  });
});
