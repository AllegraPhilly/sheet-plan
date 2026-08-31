import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { alternateParentHint } from "@/lib/planner/cut-count";
import { planFromJob } from "@/lib/planner/plan";
import {
  applyCoverSplit,
  applyMixedDefaults,
  autoDescription,
  isMixedFlatBind,
  isMixedPackBind,
  mixedPackSheetQtys,
  setMixedBwQty,
  setMixedColorPages,
  setMixedColorQty,
  setMixedTotal,
  setPackPageCount,
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

describe("A) mixed flats remainder — live qty split", () => {
  it("500 qty + Color 250 fills B&W 250 on the ticket fields (not after PLAN)", () => {
    const started = applyMixedDefaults(mixedFlat());
    expect(started.colorQty).toBe(500);
    expect(started.bwQty).toBe(0);
    const typed = [2, 25, 250].reduce((job, n) => setMixedColorQty(job, n), started);
    expect(typed.qty).toBe(500);
    expect(typed.colorQty).toBe(250);
    expect(typed.bwQty).toBe(250);
    expect(autoDescription(typed)).toBe("500 mixed 8.5×11 (250 color / 250 B&W)");
  });

  it("editing B&W recomputes Color; both always sum to Qty; clamp 0…total", () => {
    const base = setMixedColorQty(mixedFlat(), 250);
    const next = setMixedBwQty(base, 100);
    expect(next.qty).toBe(500);
    expect(next.bwQty + next.colorQty!).toBe(500);
    expect(next.colorQty).toBe(400);
    expect(setMixedColorQty(base, 0).bwQty).toBe(500);
    expect(setMixedColorQty(base, 900).colorQty).toBe(500);
    expect(setMixedBwQty(base, -3).colorQty).toBe(500);
  });

  it("changing Qty keeps Color if it still fits, else clamp, and refreshes B&W", () => {
    const keep = setMixedTotal(setMixedColorQty(mixedFlat(), 250), 600);
    expect(keep).toMatchObject({ qty: 600, colorQty: 250, bwQty: 350 });
    const clamp = setMixedTotal(setMixedColorQty(mixedFlat(), 250), 200);
    expect(clamp).toMatchObject({ qty: 200, colorQty: 200, bwQty: 0 });
  });

  it("laminate / shrink / drill stay on the qty remainder; packs do not", () => {
    expect(isMixedFlatBind("laminate")).toBe(true);
    expect(isMixedFlatBind("shrink")).toBe(true);
    expect(isMixedFlatBind("drill")).toBe(true);
    expect(isMixedFlatBind("none")).toBe(true);
    expect(isMixedPackBind("saddle")).toBe(true);
    expect(isMixedPackBind("coil")).toBe(true);
    expect(isMixedPackBind("staple")).toBe(true);
    expect(isMixedPackBind("side-staple")).toBe(true);
    const lam = applyMixedDefaults(mixedFlat({ bind: "laminate" }));
    expect(lam.colorQty).toBe(500);
    expect(lam.bwQty).toBe(0);
    expect(applyMixedDefaults(mixedFlat({ bind: "saddle", pages: 20 })).colorQty).toBeUndefined();
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

describe("B) mixed packs — cover/insides, never a qty split", () => {
  it("saddle default is color cover / B&W insides; job line is not 250+250 sheets", () => {
    const next = applyMixedDefaults({
      ...mixedFlat(),
      bind: "saddle",
      fold: "half",
      sides: 2,
      pages: 20,
    });
    expect(next.mixedSplit).toBe("cover");
    expect(next.colorPages).toBe(4);
    expect(next.bwPages).toBe(16);
    expect(next.colorQty).toBeUndefined();
    expect(next.qty).toBe(500);
    expect(autoDescription(next)).toBe("500 mixed 8.5×11 20-page saddle (color cover / B&W insides)");
    expect(autoDescription(next)).not.toMatch(/250 color \/ 250 B&W/);
  });

  it("custom page split sums to page count; saddle still snaps ÷4", () => {
    const base = applyCoverSplit({
      ...mixedFlat(),
      bind: "saddle",
      fold: "half",
      sides: 2,
      pages: 20,
    });
    const color = setMixedColorPages({ ...base, mixedSplit: "custom" }, 7);
    expect(color.colorPages).toBe(8);
    expect(color.bwPages).toBe(12);
    expect(autoDescription(color)).toBe("500 mixed 8.5×11 20-page saddle (8 color / 12 B&W)");
    const pages = setPackPageCount(base, 12);
    expect(pages.pages).toBe(12);
    expect(pages.colorPages).toBe(4);
    expect(pages.bwPages).toBe(8);
  });

  it("coil and corner staple mixed use pages, not Color qty / B&W qty", () => {
    const coil = applyMixedDefaults({ ...mixedFlat(), bind: "coil", sides: 2, pages: 20 });
    expect(coil.mixedSplit).toBe("cover");
    expect(coil.colorPages).toBe(4);
    expect(coil.bwPages).toBe(16);
    expect(coil.colorQty).toBeUndefined();
    expect(autoDescription(coil)).toMatch(/color cover \/ B&W insides/);
    expect(autoDescription(coil)).not.toMatch(/250 color \/ 250 B&W/);
    const qtys = mixedPackSheetQtys(coil);
    expect(qtys.color).toBe(500 * 2);
    expect(qtys.bw).toBe(500 * 8);
    const plan = planFromJob(coil);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines![0].press.machineId).toBe("versant-4100");
    expect(plan.lines![1].press.machineId).toBe("accurio-6120");
    expect(plan.why.join(" ")).toMatch(/500 books/);
    expect(plan.why.join(" ")).toMatch(/Cover: Versant 4100 — color, 4 pages/);
    expect(plan.why.join(" ")).toMatch(/Insides: Accurio 6120 — B&W, 16 pages/);
    expect(plan.why.join(" ")).toMatch(/gather off-press\. Accurio does not make the booklet/);
  });

  it("ticket markup hides Color qty on pack binds and shows cover split", () => {
    const ui = readFileSync(new URL("../components/PlannerView.tsx", import.meta.url), "utf8");
    expect(ui).toMatch(/Cover color, insides B&W/);
    expect(ui).toMatch(/k="Cover"/);
    expect(ui).toMatch(/k="Insides"/);
    expect(ui).toMatch(/k="Bind"/);
    expect(ui).toMatch(/isMixedFlatBind\(job\.bind\)/);
    expect(ui).toMatch(/function MixedQty/);
    expect(ui).toMatch(/onChange\(parsed === null \? 0 : parsed\)/);
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
