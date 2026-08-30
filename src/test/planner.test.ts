import { describe, expect, it } from "vitest";
import { FORBIDDEN_UI_STRINGS, MACHINES, machineById, neverRouteIds } from "@/lib/machines";
import { exactTileLayout, isExactTile, nestOnParent, rankParents } from "@/lib/planner/nest";
import { commitNumberField, parseNumberDraft } from "@/lib/planner/num-field";
import { mustStep, planFromDescription, planFromJob, safePlanFromJob } from "@/lib/planner/plan";
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
  it("default 8.5×11 color ticket with no typed description still plans 11×17 2-up Challenge cut", () => {
    const { plan, error } = safePlanFromJob({
      description: "",
      qty: 500,
      finishW: 8.5,
      finishH: 11,
      color: "color",
      sides: 1,
      fold: "none",
      bind: "none",
      substrate: "paper",
    });
    expect(error).toBeNull();
    expect(plan).toBeTruthy();
    expect(plan!.recommended.parent.id).toBe("tabloid");
    expect(plan!.recommended.nUp).toBe(2);
    expect(plan!.recommended.exactTile).toBe(true);
    expect(plan!.recommended.orientation).toBe("same");
    expect(plan!.recommended.sheetTurned).toBe(true);
    expect(plan!.recommended.needsFileRotate).toBe(false);
    expect(plan!.recommended.cols).toBe(2);
    expect(plan!.recommended.rows).toBe(1);
    expect(plan!.recommended.cuts.machineId).toBe("challenge-305-crt");
    expect(plan!.recommended.cuts.clicks).toBe(1);
    expect(plan!.press.machineId).toBe("versant-4100");
  });

  it("finish 8.5×11 → buy 11×17 2-up → Challenge 305 CRT one click", () => {
    const plan = planFromJob(letterJob());
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(2);
    expect(plan.recommended.exactTile).toBe(true);
    expect(plan.recommended.orientation).toBe("same");
    expect(plan.recommended.needsFileRotate).toBe(false);
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
    expect(ranked[0].needsFileRotate).toBe(false);
    const sameWay = ranked.filter((n) => !n.needsFileRotate);
    for (const row of sameWay.slice(1)) {
      expect(row.buyScore).toBeGreaterThanOrEqual(sameWay[0].buyScore);
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

describe("planner errors", () => {
  it("mustStep throws when a confident machine is missing", () => {
    expect(() => mustStep("no-such-press", "Print.")).toThrow(/Confident machine missing: no-such-press/);
  });

  it("safePlanFromJob catches mustStep throws instead of blanking the ticket", () => {
    const versant = machineById("versant-4100")!;
    const prev = versant.confidence;
    versant.confidence = "skip";
    try {
      expect(() => planFromJob(letterJob())).toThrow(/Confident machine missing: versant-4100/);
      const { plan, error } = safePlanFromJob(letterJob());
      expect(plan).toBeNull();
      expect(error).toMatch(/Confident machine missing: versant-4100/);
    } finally {
      versant.confidence = prev;
    }
  });
});

describe("exact-tile helper", () => {
  it("letter on tabloid is exact tile", () => {
    expect(isExactTile({ w: 8.5, h: 11 }, PARENTS[1])).toBe(true);
    expect(isExactTile({ w: 5, h: 7 }, PARENTS[1])).toBe(false);
    const layout = exactTileLayout({ w: 8.5, h: 11 }, PARENTS[1]);
    expect(layout).toEqual({ cols: 2, rows: 1, nUp: 2, orientation: "same", sheetTurned: true });
  });

  it("6×9 on 12×18 is an exact 2×2 tile — no gripper/trim, 4-up", () => {
    const parent12 = PARENTS.find((p) => p.id === "12x18")!;
    const parent13 = PARENTS.find((p) => p.id === "13x19")!;
    expect(isExactTile({ w: 6, h: 9 }, parent12)).toBe(true);
    expect(isExactTile({ w: 6, h: 9 }, parent13)).toBe(false);
    expect(exactTileLayout({ w: 6, h: 9 }, parent12)).toEqual({
      cols: 2,
      rows: 2,
      nUp: 4,
      orientation: "same",
      sheetTurned: false,
    });

    const nest = nestOnParent(
      {
        description: "5000 6x9 2-sided",
        qty: 5000,
        finishW: 6,
        finishH: 9,
        color: "color",
        sides: 2,
        fold: "none",
        bind: "none",
        substrate: "paper",
      },
      parent12,
    );
    expect(nest).toBeTruthy();
    expect(nest!.exactTile).toBe(true);
    expect(nest!.nUp).toBe(4);
    expect(nest!.cols).toBe(2);
    expect(nest!.rows).toBe(2);
    expect(nest!.orientation).toBe("same");
    expect(nest!.gripperApplied).toBe(false);
    expect(nest!.trimApplied).toBe(false);
    expect(nest!.sheetsToBuy).toBe(1250);
    expect(nest!.impressions).toBe(2500);
    expect(nest!.buyScore).toBeCloseTo(1250 * ((12 * 18) / (8.5 * 11)), 5);
  });

  it("rankParents picks 12×18 4-up over 13×19 for 5000 / 6×9 / 2-sided", () => {
    const job: JobInput = {
      description: "5000 6x9 color 2-sided",
      qty: 5000,
      finishW: 6,
      finishH: 9,
      color: "color",
      sides: 2,
      fold: "none",
      bind: "none",
      substrate: "paper",
    };
    const ranked = rankParents(job);
    expect(ranked[0].parent.id).toBe("12x18");
    expect(ranked[0].nUp).toBe(4);
    expect(ranked[0].exactTile).toBe(true);
    expect(ranked[0].needsFileRotate).toBe(false);
    expect(ranked[0].orientation).toBe("same");
    expect(ranked[0].buyScore).toBeCloseTo(1250 * ((12 * 18) / (8.5 * 11)), 5);

    const nest13 = ranked.find((n) => n.parent.id === "13x19")!;
    expect(nest13.nUp).toBe(4);
    expect(nest13.exactTile).toBe(false);
    expect(nest13.buyScore).toBeCloseTo(1250 * ((13 * 19) / (8.5 * 11)), 5);
    expect(ranked[0].buyScore).toBeLessThan(nest13.buyScore);

    const plan = planFromJob(job);
    expect(plan.recommended.parent.id).toBe("12x18");
    expect(plan.recommended.nUp).toBe(4);
    expect(plan.why.join(" ")).toMatch(/exact 4-up tile on 12×18/i);
    expect(plan.why.join(" ")).not.toMatch(/8\.5×11 on 11×17/);
  });

  it("5.5×8.5 on 11×17 is an exact 4-up tile (trim would otherwise drop n-up)", () => {
    const tabloid = PARENTS[1];
    expect(isExactTile({ w: 5.5, h: 8.5 }, tabloid)).toBe(true);
    expect(exactTileLayout({ w: 5.5, h: 8.5 }, tabloid)).toEqual({
      cols: 2,
      rows: 2,
      nUp: 4,
      orientation: "same",
      sheetTurned: false,
    });
    const nest = nestOnParent(letterJob({ finishW: 5.5, finishH: 8.5, qty: 400 }), tabloid);
    expect(nest!.nUp).toBe(4);
    expect(nest!.exactTile).toBe(true);
    expect(nest!.gripperApplied).toBe(false);
    expect(nest!.trimApplied).toBe(false);
    expect(nest!.sheetsToBuy).toBe(100);
  });
});

describe("ticket number fields while editing", () => {
  it("does not treat a cleared box as 1 the way Number('') + Math.max(1, n) does", () => {
    expect(Number("")).toBe(0);
    expect(Math.max(1, Number(""))).toBe(1);
    expect(parseNumberDraft("")).toBeNull();
    expect(parseNumberDraft("   ")).toBeNull();
    expect(parseNumberDraft("300")).toBe(300);
  });

  it("cleared Qty then 300 commits 300, not 1300", () => {
    expect(parseNumberDraft("")).toBeNull();
    expect(commitNumberField("300", { min: 1, fallback: 1 })).toBe(300);
    expect(commitNumberField("3", { min: 1, fallback: 1 })).toBe(3);
  });

  it("Qty empty on blur keeps the last valid qty (minimum 1); 0 becomes 1", () => {
    expect(commitNumberField("", { min: 1, fallback: 500 })).toBe(500);
    expect(commitNumberField("0", { min: 1, fallback: 500 })).toBe(1);
    expect(commitNumberField("1", { min: 1, fallback: 500 })).toBe(1);
  });

  it("Finish W/H can stay empty while editing and restore on blur", () => {
    expect(parseNumberDraft("")).toBeNull();
    expect(commitNumberField("", { min: 0, fallback: 8.5 })).toBe(8.5);
    expect(commitNumberField("11", { min: 0, fallback: 8.5 })).toBe(11);
  });
});
