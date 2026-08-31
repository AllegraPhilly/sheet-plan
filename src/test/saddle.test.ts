import { describe, expect, it } from "vitest";
import { layoutFromNest } from "@/lib/planner/sheet-layout";
import { parseJobText } from "@/lib/planner/parse-job";
import { planFromDescription, planFromJob, safePlanFromJob } from "@/lib/planner/plan";
import { SADDLE_PAGES_ERROR, nestSaddle } from "@/lib/planner/saddle";
import { autoDescription } from "@/lib/planner/ticket-text";
import type { JobInput } from "@/lib/planner/types";

function errorMessage(pages: number): string | null {
  return safePlanFromJob(saddleJob({ pages })).error;
}

const saddleJob = (over: Partial<JobInput> = {}): JobInput => ({
  description: "100 color 8.5x11 16-page saddle booklet",
  qty: 100,
  finishW: 8.5,
  finishH: 11,
  color: "color",
  sides: 2,
  fold: "half",
  bind: "saddle",
  pages: 16,
  substrate: "paper",
  ...over,
});

describe("saddle booklet nest", () => {
  it("8.5×11 saddle is one 11×17 folded signature, 0 letter cuts", () => {
    const nest = nestSaddle(saddleJob());
    expect(nest.parent.id).toBe("tabloid");
    expect(nest.saddle).toBe(true);
    expect(nest.nUp).toBe(1);
    expect(nest.sheetTurned).toBe(true);
    expect(nest.needsFileRotate).toBe(false);
    expect(nest.gripperApplied).toBe(false);
    expect(nest.trimApplied).toBe(false);
    expect(nest.sheetsToBuy).toBe(400);
    expect(nest.impressions).toBe(800);
    expect(nest.buyScore).toBeCloseTo(400 * ((11 * 17) / (8.5 * 11)), 5);
    expect(nest.cuts.clicks).toBe(0);
    expect(nest.cuts.splits).toBe(0);
    expect(nest.cuts.faceTrims).toBe(0);
    expect(nest.cuts.why).toMatch(/not a letter cut/i);
    expect(nest.signature).toMatchObject({ w: 17, h: 11, doubled: "w" });
  });

  it("buy score is ceil(pages/4) sheets per booklet on 11×17", () => {
    const nest = nestSaddle(saddleJob({ qty: 50, pages: 8 }));
    expect(nest.sheetsToBuy).toBe(50 * 2);
    expect(nest.impressions).toBe(200);
  });
});

describe("saddle booklet plan", () => {
  it("color 8.5×11 saddle → Versant, 11×17, no Challenge cut, Baum + Salco saddle", () => {
    const plan = planFromJob(saddleJob());
    expect(plan.press.machineId).toBe("versant-4100");
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.saddle).toBe(true);
    expect(plan.recommended.cuts.clicks).toBe(0);
    expect(plan.recommended.nUp).toBe(1);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).not.toContain("challenge-305-crt");
    expect(ids).toContain("baumfolder-714");
    expect(ids).toContain("salco-rapid-106e");
    expect(plan.finishing.find((s) => s.machineId === "salco-rapid-106e")?.action).toMatch(/saddle stitch/i);
    expect(plan.why.join(" ")).toMatch(/folded signature/i);
    expect(plan.why.join(" ")).toMatch(/not 8\.5×11 2-up cut/i);
    expect(plan.why.join(" ")).not.toMatch(/click-saving/i);
    expect(plan.why.join(" ")).not.toMatch(/exact 2-up tile/i);
  });

  it("B&W saddle → Accurio 6120", () => {
    const plan = planFromJob(saddleJob({ color: "bw", description: "100 bw 16-page saddle booklet" }));
    expect(plan.press.machineId).toBe("accurio-6120");
  });

  it("cover stock creases on Whizard before fold", () => {
    const plan = planFromJob(saddleJob({ stockHint: "cover" }));
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids[0]).toBe("graphic-whizard-creasemaster-plus-ts");
    expect(ids).toContain("baumfolder-714");
    expect(ids).toContain("salco-rapid-106e");
  });

  it("Corner staple stays the flats nest path, not saddle", () => {
    const plan = planFromJob({
      ...saddleJob(),
      bind: "staple",
      pages: undefined,
      fold: "none",
      sides: 1,
      description: "100 color 8.5x11 corner staple",
    });
    expect(plan.recommended.saddle).toBeFalsy();
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(2);
    expect(plan.recommended.cuts.clicks).toBe(1);
    expect(plan.finishing.some((s) => s.machineId === "challenge-305-crt")).toBe(true);
    expect(plan.finishing.find((s) => s.machineId === "salco-rapid-106e")?.action).toMatch(/corner staple/i);
    expect(plan.finishing.find((s) => s.machineId === "salco-rapid-106e")?.action).not.toMatch(/saddle stitch/i);
  });

  it("Side staple is flats n-up then Salco along the left edge", () => {
    const plan = planFromJob({
      ...saddleJob(),
      bind: "side-staple",
      pages: undefined,
      fold: "none",
      sides: 1,
      description: "100 color 8.5x11 side staple",
    });
    expect(plan.recommended.saddle).toBeFalsy();
    expect(plan.recommended.nUp).toBe(2);
    expect(plan.finishing.find((s) => s.machineId === "salco-rapid-106e")?.action).toMatch(/side staple/i);
    expect(plan.finishing.find((s) => s.machineId === "salco-rapid-106e")?.action).not.toMatch(/saddle stitch/i);
  });

  it("page count not divisible by 4 is a hard error — no plan, no blank padding", () => {
    for (const pages of [1, 2, 6, 10, 14, 15]) {
      const { plan, error } = safePlanFromJob(saddleJob({ pages }));
      expect(plan, `pages ${pages}`).toBeNull();
      expect(error).toBe(SADDLE_PAGES_ERROR);
    }
    expect(errorMessage(15)).toMatch(/do not pad/i);
    expect(() => planFromJob(saddleJob({ pages: 10 }))).toThrow(SADDLE_PAGES_ERROR);
    expect(() => nestSaddle(saddleJob({ pages: 7 }))).toThrow(SADDLE_PAGES_ERROR);
  });

  it("Build PLAN and Save share the same hard error — saved snapshot has no plan", () => {
    const built = safePlanFromJob(saddleJob({ pages: 15 }));
    expect(built.plan).toBeNull();
    expect(built.error).toBe(SADDLE_PAGES_ERROR);
    const saved = {
      plan: built.plan,
      planError: built.error,
    };
    expect(saved.plan).toBeNull();
    expect(saved.planError).toBe(SADDLE_PAGES_ERROR);
  });

  it("missing pages is the same hard error", () => {
    const { plan, error } = safePlanFromJob(saddleJob({ pages: undefined }));
    expect(plan).toBeNull();
    expect(error).toBe(SADDLE_PAGES_ERROR);
  });
});

describe("saddle layout is a fold, not Cut 1", () => {
  it("See layout is 17×11 with a midline fold and two pages, zero cut strokes", () => {
    const nest = nestSaddle(saddleJob());
    const layout = layoutFromNest({ finishW: 8.5, finishH: 11 }, nest);
    expect(layout.fold).toMatchObject({ x1: 8.5, y1: 0, x2: 8.5, y2: 11, axis: "v" });
    expect(layout.cuts).toHaveLength(0);
    expect(layout.cutTally.clicks).toBe(0);
    expect(layout.pieces).toHaveLength(2);
    expect(layout.pieces[0].finish).toEqual({ x: 0, y: 0, w: 8.5, h: 11 });
    expect(layout.pieces[1].finish).toEqual({ x: 8.5, y: 0, w: 8.5, h: 11 });
    expect(layout.parent).toMatchObject({ w: 17, h: 11, label: "11×17" });
    expect(layout.caption).toMatch(/saddle signature/i);
    expect(layout.caption).toMatch(/fold at the 17 in midline/i);
    expect(layout.caption).not.toMatch(/Cut count:/);
    expect(layout.caption).not.toMatch(/Cut 1:/);
  });
});

describe("saddle parse and ticket line", () => {
  it("saddle booklet in the job line is not stitch", () => {
    const job = parseJobText("100 color 8.5x11 16-page saddle booklet");
    expect(job.bind).toBe("saddle");
    expect(job.pages).toBe(16);
    expect(job.sides).toBe(2);
    expect(job.fold).toBe("half");
  });

  it("stitch / corner staple without saddle stays corner staple", () => {
    const job = parseJobText("100 color 8.5x11 stitch");
    expect(job.bind).toBe("staple");
    expect(job.pages).toBeUndefined();
    expect(parseJobText("100 color 8.5x11 side staple").bind).toBe("side-staple");
  });

  it("auto line names saddle booklet and page count", () => {
    expect(autoDescription(saddleJob())).toBe("100 color 8.5×11 2-sided 16-page saddle booklet");
  });

  it("planFromDescription reads pages and does not treat it as 2-up cut", () => {
    const plan = planFromDescription("100 color 8.5x11 16-page saddle booklet");
    expect(plan.recommended.saddle).toBe(true);
    expect(plan.recommended.cuts.clicks).toBe(0);
    expect(plan.recommended.nUp).toBe(1);
  });
});

describe("any-size saddle — 5×7 playbill", () => {
  it("585 color 5×7 20-page saddle plans 10×7 signatures 2-up on 11×17", () => {
    const job = saddleJob({
      description: "585 color 5x7 2-sided 20-page saddle booklet",
      qty: 585,
      finishW: 5,
      finishH: 7,
      pages: 20,
    });
    const { plan, error } = safePlanFromJob(job);
    expect(error).toBeNull();
    expect(plan).toBeTruthy();
    expect(plan!.recommended.saddle).toBe(true);
    expect(plan!.recommended.signature).toMatchObject({ w: 10, h: 7 });
    expect(plan!.recommended.parent.id).toBe("tabloid");
    expect(plan!.recommended.nUp).toBe(2);
    expect(plan!.recommended.sheetsToBuy).toBe(1463);
    expect(plan!.recommended.impressions).toBe(2926);
    expect(plan!.recommended.cuts.splits).toBeGreaterThanOrEqual(1);
    expect(plan!.recommended.cuts.why).toMatch(/gang splits/i);
    expect(plan!.recommended.cuts.why).not.toMatch(/Saddle booklet planning is 8\.5×11/);
    expect(plan!.press.machineId).toBe("versant-4100");
    const ids = plan!.finishing.map((s) => s.machineId);
    expect(ids).toContain("challenge-305-crt");
    expect(ids).toContain("baumfolder-714");
    expect(ids).toContain("salco-rapid-106e");
    expect(plan!.why.join(" ")).toMatch(/10×7/);
    expect(plan!.why.join(" ")).not.toMatch(/Saddle booklet planning is 8\.5×11/);
  });

  it("fold half + saddle is valid for 5×7", () => {
    const { plan, error } = safePlanFromJob(
      saddleJob({ finishW: 5, finishH: 7, pages: 20, qty: 585, fold: "half" }),
    );
    expect(error).toBeNull();
    expect(plan?.recommended.saddle).toBe(true);
  });
});

describe("any-size saddle — 2×2", () => {
  it("2×2 8-page saddle plans a 4×2 signature on a shop parent", () => {
    const { plan, error } = safePlanFromJob(
      saddleJob({
        description: "50 color 2x2 8-page saddle booklet",
        qty: 50,
        finishW: 2,
        finishH: 2,
        pages: 8,
      }),
    );
    expect(error).toBeNull();
    expect(plan).toBeTruthy();
    expect(plan!.recommended.saddle).toBe(true);
    expect(plan!.recommended.signature).toMatchObject({ w: 4, h: 2, doubled: "w" });
    expect(plan!.recommended.nUp).toBeGreaterThanOrEqual(1);
    expect(plan!.recommended.sheetsToBuy).toBeGreaterThan(0);
    expect(plan!.finishing.map((s) => s.machineId)).toContain("baumfolder-714");
    expect(plan!.finishing.map((s) => s.machineId)).toContain("salco-rapid-106e");
  });
});

describe("mixed color saddle", () => {
  it("20-page mixed defaults 4 color cover / 16 B&W on two presses", () => {
    const plan = planFromJob(
      saddleJob({
        description: "585 mixed 5×7 20-page saddle (4 color cover / 16 B&W)",
        qty: 585,
        finishW: 5,
        finishH: 7,
        pages: 20,
        color: "mixed",
        colorPages: 4,
        bwPages: 16,
      }),
    );
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0]).toMatchObject({ role: "color", press: { machineId: "versant-4100" } });
    expect(plan.lines![1]).toMatchObject({ role: "bw", press: { machineId: "accurio-6120" } });
    expect(plan.lines![0].nest.saddle).toBe(true);
    expect(plan.finishing.map((s) => s.machineId)).toContain("graphic-whizard-creasemaster-plus-ts");
    expect(plan.finishing.map((s) => s.machineId)).toContain("salco-rapid-106e");
    expect(autoDescription(plan.job)).toMatch(/color cover \/ B&W insides/);
  });

  it("mixed pages that do not sum are a hard error", () => {
    const { plan, error } = safePlanFromJob(
      saddleJob({ color: "mixed", pages: 20, colorPages: 4, bwPages: 12 }),
    );
    expect(plan).toBeNull();
    expect(error).toMatch(/must equal the page count/i);
  });
});
