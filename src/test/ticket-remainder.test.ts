import { describe, expect, it } from "vitest";
import { alternateParentHint } from "@/lib/planner/cut-count";
import { planFromJob } from "@/lib/planner/plan";
import {
  applyMixedDefaults,
  setMixedBwPages,
  setMixedBwQty,
  setMixedColorPages,
  setMixedColorQty,
  setMixedTotal,
  setSaddlePageCount,
} from "@/lib/planner/ticket-text";
import { PARENTS, type JobInput, type NestResult } from "@/lib/planner/types";

const mixedFlat = (over: Partial<JobInput> = {}): JobInput => ({
  description: "500 mixed 8.5x11",
  qty: 500,
  finishW: 8.5,
  finishH: 11,
  color: "mixed",
  sides: 1,
  fold: "none",
  bind: "none",
  substrate: "paper",
  ...over,
});

describe("mixed remainder — qty is the total", () => {
  it("Color qty 250 of 500 fills B&W 250 and does not change the total", () => {
    const started = applyMixedDefaults(mixedFlat());
    expect(started.colorQty).toBe(500);
    expect(started.bwQty).toBe(0);
    const next = setMixedColorQty(started, 250);
    expect(next.qty).toBe(500);
    expect(next.colorQty).toBe(250);
    expect(next.bwQty).toBe(250);
  });

  it("editing B&W fills Color = total − B&W and clamps 0…total", () => {
    const base = setMixedColorQty(mixedFlat(), 250);
    const next = setMixedBwQty(base, 100);
    expect(next.qty).toBe(500);
    expect(next.bwQty).toBe(100);
    expect(next.colorQty).toBe(400);
    expect(setMixedColorQty(base, 900).colorQty).toBe(500);
    expect(setMixedColorQty(base, 900).bwQty).toBe(0);
    expect(setMixedBwQty(base, -3).bwQty).toBe(0);
    expect(setMixedBwQty(base, -3).colorQty).toBe(500);
  });

  it("changing the total keeps color qty and fills B&W", () => {
    const next = setMixedTotal(setMixedColorQty(mixedFlat(), 250), 600);
    expect(next.qty).toBe(600);
    expect(next.colorQty).toBe(250);
    expect(next.bwQty).toBe(350);
  });

  it("still splits Versant vs Accurio on the remainder", () => {
    const ticket = setMixedColorQty(mixedFlat(), 250);
    const plan = planFromJob(ticket);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0].press.machineId).toBe("versant-4100");
    expect(plan.lines![1].press.machineId).toBe("accurio-6120");
    expect(plan.lines![0].nest.sheetsToBuy).toBe(Math.ceil(250 / 2));
    expect(plan.lines![1].nest.sheetsToBuy).toBe(Math.ceil(250 / 2));
  });
});

describe("mixed saddle remainder — sum is page count, both ÷4", () => {
  it("defaults color pages to 4 and B&W to the rest", () => {
    const next = applyMixedDefaults({
      ...mixedFlat(),
      bind: "saddle",
      fold: "half",
      sides: 2,
      pages: 20,
    });
    expect(next.colorPages).toBe(4);
    expect(next.bwPages).toBe(16);
  });

  it("editing either side keeps the sum and snaps to signatures", () => {
    const base = applyMixedDefaults({
      ...mixedFlat(),
      bind: "saddle",
      fold: "half",
      sides: 2,
      pages: 20,
    });
    const color = setMixedColorPages(base, 7);
    expect(color.colorPages).toBe(8);
    expect(color.bwPages).toBe(12);
    expect(color.pages).toBe(20);
    const bw = setMixedBwPages(base, 4);
    expect(bw.bwPages).toBe(4);
    expect(bw.colorPages).toBe(16);
    const pages = setSaddlePageCount(base, 12);
    expect(pages.pages).toBe(12);
    expect(pages.colorPages).toBe(4);
    expect(pages.bwPages).toBe(8);
  });
});

describe("alternate parent cut copy", () => {
  it("says if letter 1-up instead: 4 face trims — never Cut count:", () => {
    const nest = {
      parent: PARENTS[0],
      nUp: 1,
      cuts: {
        machineId: "challenge-305-crt" as const,
        clicks: 4,
        splits: 0,
        faceTrims: 4,
        faceTrimReasons: ["gripper leftover"],
        splitWhy: "",
        brief: "0 splits, 4 face trim",
        why: "Cut count: 4. 0 splits, 4 face trim.",
      },
    } as Pick<NestResult, "parent" | "nUp" | "cuts">;
    expect(alternateParentHint(nest)).toBe("if letter 1-up instead: 4 face trims");
    expect(alternateParentHint(nest)).not.toMatch(/Cut count:/);
  });
});
