import { describe, expect, it } from "vitest";
import { layoutFromNest } from "@/lib/planner/sheet-layout";
import { parseJobText } from "@/lib/planner/parse-job";
import { MIXED_BOOKLET_WHY, MIXED_SADDLE_WHY, planFromDescription, planFromJob, safePlanFromJob } from "@/lib/planner/plan";
import {
  SADDLE_PAGES_ERROR,
  isClassicLetterSignature,
  nestSaddle,
  sheetFitsPrBookletMaker,
} from "@/lib/planner/saddle";
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

describe("PR Booklet Maker sheet window", () => {
  it("11×17 fits; a raw 10×7 signature does not", () => {
    expect(sheetFitsPrBookletMaker({ w: 11, h: 17 })).toBe(true);
    expect(sheetFitsPrBookletMaker({ w: 17, h: 11 })).toBe(true);
    expect(sheetFitsPrBookletMaker({ w: 10, h: 7 })).toBe(false);
    expect(sheetFitsPrBookletMaker({ w: 8.5, h: 11 })).toBe(true);
  });
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
    expect(isClassicLetterSignature(nest, { w: 8.5, h: 11 })).toBe(true);
  });

  it("buy score is ceil(pages/4) sheets per booklet on 11×17", () => {
    const nest = nestSaddle(saddleJob({ qty: 50, pages: 8 }));
    expect(nest.sheetsToBuy).toBe(50 * 2);
    expect(nest.impressions).toBe(200);
  });
});

describe("saddle booklet plan", () => {
  it("color 8.5×11 saddle → Versant, 11×17, in-line PR Booklet Maker, no Challenge trim", () => {
    const plan = planFromJob(saddleJob());
    expect(plan.press.machineId).toBe("versant-4100");
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.saddle).toBe(true);
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineFaceTrim).toBeFalsy();
    expect(plan.recommended.cuts.clicks).toBe(0);
    expect(plan.recommended.nUp).toBe(1);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
    expect(plan.why.join(" ")).toMatch(/PR Booklet Maker/i);
    expect(plan.why.join(" ")).not.toMatch(/click-saving/i);
    expect(plan.why.join(" ")).not.toMatch(/exact 2-up tile/i);
    expect(plan.why.join(" ")).not.toMatch(/\$/);
    expect(plan.why.join(" ")).not.toMatch(/fiery/i);
  });

  it("classic 8.5×11 8-page saddle is 11×17, cut 0, in-line, no Challenge trim", () => {
    const plan = planFromJob(saddleJob({ qty: 100, pages: 8 }));
    expect(plan.press.machineId).toBe("versant-4100");
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(1);
    expect(plan.recommended.sheetsToBuy).toBe(200);
    expect(plan.recommended.impressions).toBe(400);
    expect(plan.recommended.cuts.clicks).toBe(0);
    expect(plan.recommended.inlineBooklet).toBe(true);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
  });

  it("B&W letter saddle under 20 sheets/book → Accurio 6120 + in-line saddle, not Salco", () => {
    const plan = planFromJob(saddleJob({ color: "bw", description: "100 bw 16-page saddle booklet" }));
    expect(plan.press.machineId).toBe("accurio-6120");
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineBookletOn).toBe("accurio");
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.cuts.clicks).toBe(0);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("accurio-saddle-booklet-maker");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("challenge-305-crt");
  });

  it("color cover stock still skips Whizard on the in-line Versant path", () => {
    const plan = planFromJob(saddleJob({ stockHint: "cover" }));
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("graphic-whizard-creasemaster-plus-ts");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
  });

  it("B&W cover stock still skips Whizard on the in-line Accurio path", () => {
    const plan = planFromJob(saddleJob({ color: "bw", stockHint: "cover", description: "100 bw cover saddle" }));
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("accurio-saddle-booklet-maker");
    expect(ids).not.toContain("graphic-whizard-creasemaster-plus-ts");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
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
  it("585 color 5×7 20-page saddle is Versant 11×17 1-up, 2925 sheets, 5850 clicks, PR booklet + Challenge trim", () => {
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
    expect(plan!.press.machineId).toBe("versant-4100");
    expect(plan!.recommended.saddle).toBe(true);
    expect(plan!.recommended.inlineBooklet).toBe(true);
    expect(plan!.recommended.inlineFaceTrim).toBe(true);
    expect(plan!.recommended.signature).toMatchObject({ w: 17, h: 11 });
    expect(plan!.recommended.parent.id).toBe("tabloid");
    expect(plan!.recommended.nUp).toBe(1);
    expect(plan!.recommended.sheetsToBuy).toBe(2925);
    expect(plan!.recommended.impressions).toBe(5850);
    expect(plan!.recommended.cuts.clicks).toBe(1);
    expect(plan!.recommended.cuts.splits).toBe(0);
    expect(plan!.recommended.cuts.faceTrims).toBe(1);
    expect(plan!.recommended.cuts.brief).toBe("0 splits, 1 face trim");
    expect(plan!.recommended.cuts.why).toMatch(/Cut count: 1/);
    expect(plan!.recommended.cuts.why).toMatch(/fold is not a Challenge cut/i);
    expect(plan!.recommended.cuts.why).toMatch(/11×17 in-line folds to 8\.5×11/i);
    expect(plan!.recommended.cuts.why).toMatch(/1 face trim to 5×7/i);
    expect(isClassicLetterSignature(plan!.recommended, { w: 5, h: 7 })).toBe(false);
    const ids = plan!.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
    expect(plan!.finishing.find((s) => s.machineId === "challenge-305-crt")?.action).toMatch(
      /face-trim 8\.5×11 to 5×7/i,
    );
    const why = plan!.why.join(" ");
    expect(why).toMatch(/2925 sheets 11×17 on Versant 4100/);
    expect(why).toMatch(/PR Booklet Maker/);
    expect(why).toMatch(/Face-trim 8\.5×11 to 5×7 on Challenge 305 CRT/);
    expect(why).not.toMatch(/\$/);
    expect(why).not.toMatch(/fiery/i);
    expect(why).not.toMatch(/Saddle booklet planning is 8\.5×11/);
  });

  it("fold half + saddle is valid for 5×7", () => {
    const { plan, error } = safePlanFromJob(
      saddleJob({ finishW: 5, finishH: 7, pages: 20, qty: 585, fold: "half" }),
    );
    expect(error).toBeNull();
    expect(plan?.recommended.saddle).toBe(true);
    expect(plan?.recommended.inlineBooklet).toBe(true);
  });

  it("B&W 5×7 saddle is Accurio 11×17 in-line + Challenge face trim", () => {
    const plan = planFromJob(
      saddleJob({
        color: "bw",
        description: "585 bw 5x7 20-page saddle booklet",
        qty: 585,
        finishW: 5,
        finishH: 7,
        pages: 20,
      }),
    );
    expect(plan.press.machineId).toBe("accurio-6120");
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineBookletOn).toBe("accurio");
    expect(plan.recommended.signature).toMatchObject({ w: 17, h: 11 });
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(1);
    expect(plan.recommended.cuts.clicks).toBe(1);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("accurio-saddle-booklet-maker");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
  });
});

describe("digest and letter booklet shortcuts use 11×17 in-line", () => {
  it("digest 5.5×8.5 color saddle is 11×17 1-up plus Challenge face-trim", () => {
    const plan = planFromJob(
      saddleJob({
        description: "100 color 5.5x8.5 8-page saddle booklet",
        qty: 100,
        finishW: 5.5,
        finishH: 8.5,
        pages: 8,
      }),
    );
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(1);
    expect(plan.recommended.inlineFaceTrim).toBe(true);
    expect(plan.recommended.cuts.clicks).toBe(1);
    expect(plan.recommended.cuts.splits).toBe(0);
    expect(plan.recommended.cuts.faceTrims).toBe(1);
    expect(plan.recommended.cuts.brief).toBe("0 splits, 1 face trim");
    expect(plan.recommended.cuts.why).toMatch(/Cut count: 1/);
    expect(plan.recommended.cuts.why).toMatch(/1 face trim to 5\.5×8\.5/i);
    expect(isClassicLetterSignature(plan.recommended, { w: 5.5, h: 8.5 })).toBe(false);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
  });

  it("650 mixed 5.5×8.5 8-page in-line saddle is Accurio bind, Versant color shells, Cut count: 1", () => {
    const plan = planFromJob(
      saddleJob({
        description: "650 mixed 5.5x8.5 8-page saddle (color cover / B&W insides)",
        qty: 650,
        finishW: 5.5,
        finishH: 8.5,
        pages: 8,
        color: "mixed",
        colorPages: 4,
        bwPages: 4,
        mixedSplit: "cover",
      }),
    );
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineBookletOn).toBe("accurio");
    expect(plan.recommended.inlineFaceTrim).toBe(true);
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.nUp).toBe(1);
    expect(plan.recommended.sheetsToBuy).toBe(1300);
    expect(plan.recommended.impressions).toBe(2600);
    expect(plan.recommended.cuts.clicks).toBe(1);
    expect(plan.recommended.cuts.splits).toBe(0);
    expect(plan.recommended.cuts.faceTrims).toBe(1);
    expect(plan.recommended.cuts.brief).toBe("0 splits, 1 face trim");
    expect(plan.recommended.cuts.faceTrimReasons).toEqual(["8.5×11 book to finish after in-line fold"]);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0].press.machineId).toBe("versant-4100");
    expect(plan.lines![0].nest.sheetsToBuy).toBe(650);
    expect(plan.lines![0].nest.impressions).toBe(1300);
    expect(plan.lines![1].press.machineId).toBe("accurio-6120");
    expect(plan.lines![1].nest.sheetsToBuy).toBe(650);
    expect(plan.lines![1].nest.impressions).toBe(1300);
    expect(plan.press.action).not.toBe(MIXED_BOOKLET_WHY);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("accurio-saddle-booklet-maker");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("baumfolder-714");
    expect(plan.why).toContain(MIXED_SADDLE_WHY);
    expect(plan.why.join(" ")).not.toMatch(/too much handling/);
    expect(plan.why.join(" ")).not.toContain(MIXED_BOOKLET_WHY);
  });
});

describe("any-size saddle — 2×2", () => {
  it("2×2 8-page color saddle still uses 11×17 in-line then face-trim", () => {
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
    expect(plan!.recommended.inlineBooklet).toBe(true);
    expect(plan!.recommended.parent.id).toBe("tabloid");
    expect(plan!.recommended.nUp).toBe(1);
    expect(plan!.recommended.sheetsToBuy).toBe(100);
    expect(plan!.recommended.cuts.clicks).toBe(1);
    expect(plan!.recommended.cuts.faceTrims).toBe(1);
    const ids = plan!.finishing.map((s) => s.machineId);
    expect(ids).toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
  });
});

describe("PR Booklet Maker sheet-count cap", () => {
  it("30 sheets/book (120 pages) still goes in-line", () => {
    const plan = planFromJob(saddleJob({ pages: 120 }));
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.finishing.map((s) => s.machineId)).toContain("xerox-pr-booklet-maker-finisher");
    expect(plan.finishing.map((s) => s.machineId)).not.toContain("accurio-saddle-booklet-maker");
  });

  it("over 30 sheets/book warns and falls back to offline Baum + Salco", () => {
    const plan = planFromJob(saddleJob({ pages: 124 }));
    expect(plan.recommended.inlineBooklet).toBeFalsy();
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("baumfolder-714");
    expect(ids).toContain("salco-rapid-106e");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
    expect(plan.warnings.join(" ")).toMatch(/30 sheets/i);
    expect(plan.warnings.join(" ")).toMatch(/31 sheets/i);
  });
});

describe("mixed color saddle", () => {
  it("20-page mixed is Versant color shells + Accurio B&W insides + Accurio in-line saddle", () => {
    const plan = planFromJob(
      saddleJob({
        description: "585 mixed 5×7 20-page saddle (color cover / B&W insides)",
        qty: 585,
        finishW: 5,
        finishH: 7,
        pages: 20,
        color: "mixed",
        colorPages: 4,
        bwPages: 16,
        mixedSplit: "cover",
      }),
    );
    expect(plan.recommended.saddle).toBe(true);
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineBookletOn).toBe("accurio");
    expect(plan.recommended.nUp).toBe(1);
    expect(plan.recommended.parent.id).toBe("tabloid");
    expect(plan.recommended.sheetsToBuy).toBe(2925);
    expect(plan.recommended.impressions).toBe(5850);
    expect(plan.recommended.sheetsToBuy).toBe(nestSaddle(plan.job).sheetsToBuy);
    expect(plan.press.action).not.toBe(MIXED_BOOKLET_WHY);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0].press.machineId).toBe("versant-4100");
    expect(plan.lines![0].nest.sheetsToBuy).toBe(585);
    expect(plan.lines![0].nest.impressions).toBe(1170);
    expect(plan.lines![1].press.machineId).toBe("accurio-6120");
    expect(plan.lines![1].nest.sheetsToBuy).toBe(2340);
    expect(plan.lines![1].nest.impressions).toBe(4680);
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("accurio-saddle-booklet-maker");
    expect(ids).toContain("challenge-305-crt");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(ids).not.toContain("graphic-whizard-creasemaster-plus-ts");
    expect(ids).not.toContain("baumfolder-714");
    expect(ids).not.toContain("salco-rapid-106e");
    expect(autoDescription(plan.job)).toMatch(/color cover \/ B&W insides/);
    const ticket = [
      plan.press.machineId,
      plan.press.action,
      ...(plan.lines ?? []).flatMap((l) => [l.press.machineId, l.press.action]),
      ...plan.why,
      ...plan.finishing.map((s) => `${s.machineId} ${s.action}`),
    ].join(" ");
    expect(ticket).toMatch(/accurio/i);
    expect(ticket).not.toMatch(/too much handling/i);
    expect(ticket).not.toContain(MIXED_BOOKLET_WHY);
    expect(ticket).not.toMatch(/gather off-press/i);
    expect(plan.why).toContain(MIXED_SADDLE_WHY);
    expect(plan.why.join(" ")).not.toMatch(/PR Booklet Maker/);
    expect(plan.why.join(" ")).not.toMatch(/Baumfolder 714/);
    expect(plan.why.join(" ")).not.toMatch(/Salco Rapid 106E/);
  });

  it("mixed pages that do not sum are a hard error", () => {
    const { plan, error } = safePlanFromJob(
      saddleJob({ color: "mixed", pages: 20, colorPages: 4, bwPages: 12 }),
    );
    expect(plan).toBeNull();
    expect(error).toMatch(/must equal the page count/i);
  });
});

describe("Accurio in-line saddle sheet-count cap", () => {
  it("20 sheets/book (80 pages) B&W still goes Accurio in-line", () => {
    const plan = planFromJob(saddleJob({ color: "bw", pages: 80, description: "100 bw 80-page saddle" }));
    expect(plan.recommended.inlineBooklet).toBe(true);
    expect(plan.recommended.inlineBookletOn).toBe("accurio");
    expect(plan.finishing.map((s) => s.machineId)).toContain("accurio-saddle-booklet-maker");
    expect(plan.finishing.map((s) => s.machineId)).not.toContain("salco-rapid-106e");
  });

  it("B&W over 20 sheets/book is Salco overflow, not Accurio in-line", () => {
    const plan = planFromJob(saddleJob({ color: "bw", pages: 84, description: "100 bw 84-page saddle" }));
    expect(plan.press.machineId).toBe("accurio-6120");
    expect(plan.recommended.inlineBooklet).toBeFalsy();
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(plan.warnings.join(" ")).toMatch(/20 sheets/i);
    expect(plan.warnings.join(" ")).toMatch(/21 sheets/i);
  });

  it("mixed over 20 sheets/book is Salco overflow, not Accurio in-line", () => {
    const plan = planFromJob(
      saddleJob({
        color: "mixed",
        pages: 84,
        colorPages: 4,
        bwPages: 80,
        mixedSplit: "cover",
        description: "100 mixed 84-page saddle",
      }),
    );
    expect(plan.recommended.inlineBooklet).toBeFalsy();
    expect(plan.press.action).not.toBe(MIXED_BOOKLET_WHY);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0].press.machineId).toBe("versant-4100");
    expect(plan.lines![1].press.machineId).toBe("accurio-6120");
    const ids = plan.finishing.map((s) => s.machineId);
    expect(ids).toContain("salco-rapid-106e");
    expect(ids).not.toContain("accurio-saddle-booklet-maker");
    expect(ids).not.toContain("xerox-pr-booklet-maker-finisher");
    expect(plan.why.join(" ")).not.toContain(MIXED_BOOKLET_WHY);
  });
});
