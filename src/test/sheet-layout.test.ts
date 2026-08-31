import { describe, expect, it } from "vitest";
import { nestOnParent, rankParents, repeatCaption } from "@/lib/planner/nest";
import { nestSaddle } from "@/lib/planner/saddle";
import { layoutFromNest } from "@/lib/planner/sheet-layout";
import { GRIPPER_IN, PARENTS, TRIM_IN, type JobInput } from "@/lib/planner/types";

const job = (over: Partial<JobInput> = {}): JobInput => ({
  description: "test",
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

function nestOf(finish: { w: number; h: number }, parentId: (typeof PARENTS)[number]["id"], qty = 500) {
  const parent = PARENTS.find((p) => p.id === parentId)!;
  const nest = nestOnParent(job({ finishW: finish.w, finishH: finish.h, qty }), parent);
  expect(nest).toBeTruthy();
  return nest!;
}

describe("saddle playbill layout is 11×17 in-line fold, not a gang split", () => {
  it("5×7 color saddle is 11×17 1-up with a midline fold and no parent split", () => {
    const nest = nestSaddle({
      description: "585 color 5x7 20-page saddle",
      qty: 585,
      finishW: 5,
      finishH: 7,
      color: "color",
      sides: 2,
      fold: "half",
      bind: "saddle",
      pages: 20,
      substrate: "paper",
    });
    const layout = layoutFromNest({ finishW: 5, finishH: 7 }, nest);
    expect(nest.nUp).toBe(1);
    expect(nest.inlineBooklet).toBe(true);
    expect(nest.parent.id).toBe("tabloid");
    expect(layout.pieces).toHaveLength(2);
    expect(layout.fold).toBeTruthy();
    expect(nest.cuts.clicks).toBe(1);
    expect(nest.cuts.faceTrims).toBe(1);
    expect(layout.cuts).toHaveLength(0);
    expect(layout.cutTally.splits).toBe(0);
    expect(layout.caption).toMatch(/17×11/);
    expect(layout.caption).toMatch(/fold at the midline/i);
    expect(layout.caption).not.toMatch(/10×7/);
    expect(layout.caption).not.toMatch(/Cut 1: split to 8\.5×11/);
  });
});

describe("sheet layout geometry", () => {
  it("letter on tabloid is same-way 2-across on a turned 17×11 feed, one numbered cut", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "tabloid");
    const layout = layoutFromNest({ finishW: 8.5, finishH: 11 }, nest);

    expect(layout.nUp).toBe(2);
    expect(layout.pieces).toHaveLength(2);
    expect(layout.exactTile).toBe(true);
    expect(layout.gripper).toBeNull();
    expect(layout.trimApplied).toBe(false);
    expect(layout.orientation).toBe("same");
    expect(layout.sheetTurned).toBe(true);
    expect(layout.needsFileRotate).toBe(false);
    expect(layout.pieceW).toBe(8.5);
    expect(layout.pieceH).toBe(11);
    expect(layout.parent).toMatchObject({ w: 17, h: 11, label: "11×17" });

    expect(layout.cuts).toHaveLength(1);
    expect(layout.cuts[0]).toMatchObject({ x1: 8.5, y1: 0, x2: 8.5, y2: 11, n: 1, axis: "v" });
    expect(layout.pieces[0].finish).toEqual({ x: 0, y: 0, w: 8.5, h: 11 });
    expect(layout.pieces[1].finish).toEqual({ x: 8.5, y: 0, w: 8.5, h: 11 });
    expect(layout.caption).toMatch(/Repeat 2-up, all same way/);
    expect(layout.caption).toMatch(/Sheet turned for feed/);
    expect(layout.caption).toMatch(/Cut 1: split to 8\.5×11/);
    expect(layout.caption).not.toMatch(/Cut count:/);
    expect(layout.cutTally).toMatchObject({ clicks: 1, splits: 1, faceTrims: 0 });
  });

  it("6×9 on 12×18 is exact 4-up with strip cut 1 then strip-to-finish cut 2", () => {
    const nest = nestOf({ w: 6, h: 9 }, "12x18", 5000);
    const layout = layoutFromNest({ finishW: 6, finishH: 9 }, nest);

    expect(nest.nUp).toBe(4);
    expect(layout.nUp).toBe(4);
    expect(layout.pieces).toHaveLength(4);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.exactTile).toBe(true);
    expect(layout.gripper).toBeNull();
    expect(layout.orientation).toBe("same");
    expect(layout.needsFileRotate).toBe(false);
    expect(layout.parent.label).toBe("12×18");

    expect(layout.cuts.map((c) => ({ n: c.n, axis: c.axis, x: c.x1, y: c.y1 }))).toEqual([
      { n: 1, axis: "h", x: 0, y: 9 },
      { n: 2, axis: "v", x: 6, y: 0 },
    ]);
    expect(layout.caption).toBe(
      "Repeat 4-up, all same way. Cut 1: split to strips. Cut 2: cut strips to 6×9.",
    );
    expect(layout.caption).not.toMatch(/Cut count:/);
    expect(layout.cutTally).toMatchObject({
      clicks: 2,
      splits: 2,
      faceTrims: 0,
      splitWhy: "strip then cut the strip",
    });
    expect(layout.pieces.map((p) => p.finish)).toEqual([
      { x: 0, y: 0, w: 6, h: 9 },
      { x: 6, y: 0, w: 6, h: 9 },
      { x: 0, y: 9, w: 6, h: 9 },
      { x: 6, y: 9, w: 6, h: 9 },
    ]);
  });

  it("does not invent n-up — piece count follows nest.nUp", () => {
    for (const parent of PARENTS) {
      const nest = nestOnParent(job({ finishW: 6, finishH: 9, qty: 5000 }), parent);
      if (!nest) continue;
      const layout = layoutFromNest({ finishW: 6, finishH: 9 }, nest);
      expect(layout.pieces.length).toBe(nest.nUp);
      expect(layout.nUp).toBe(nest.nUp);
    }
  });

  it("6×9 on 13×19 keeps 4-up same-way with even gutters, gripper, numbered through-cuts", () => {
    const nest = nestOf({ w: 6, h: 9 }, "13x19", 5000);
    const layout = layoutFromNest({ finishW: 6, finishH: 9 }, nest);

    expect(nest.nUp).toBe(4);
    expect(nest.exactTile).toBe(false);
    expect(nest.needsFileRotate).toBe(false);
    expect(nest.gripperApplied).toBe(true);
    expect(layout.nUp).toBe(4);
    expect(layout.pieces).toHaveLength(4);
    expect(layout.gripper).toEqual({
      x: 0,
      y: 19 - GRIPPER_IN,
      w: 13,
      h: GRIPPER_IN,
    });
    expect(layout.tileW).toBeCloseTo(6 + TRIM_IN * 2);
    expect(layout.tileH).toBeCloseTo(9 + TRIM_IN * 2);
    const packedW = 2 * layout.tileW;
    const packedH = 2 * layout.tileH;
    expect(layout.originX).toBeCloseTo((13 - packedW) / 2);
    expect(layout.originY).toBeCloseTo((19 - GRIPPER_IN - packedH) / 2);
    expect(layout.pieces[0].finish.x).toBeCloseTo(layout.originX + TRIM_IN);
    expect(layout.pieces[0].finish.y).toBeCloseTo(layout.originY + TRIM_IN);
    expect(layout.cuts).toHaveLength(2);
    expect(layout.cuts[0].n).toBe(1);
    expect(layout.cuts[1].n).toBe(2);
    expect(layout.cuts[0].x2 - layout.cuts[0].x1).toBeCloseTo(13);
    expect(layout.cutTally.splits).toBe(2);
    expect(layout.cutTally.faceTrims).toBeGreaterThan(0);
    expect(layout.cutTally.clicks).toBeGreaterThan(2);
    expect(layout.cutTally.clicks).toBe(layout.cutTally.splits + layout.cutTally.faceTrims);
    expect(layout.cutTally.faceTrimReasons).toEqual(
      expect.arrayContaining(["gripper leftover", "trim/bleed edges", "unused parent margin"]),
    );
    expect(layout.caption).not.toMatch(/Cut count:/);
  });

  it("same-size letter is 1-up with no cut lines", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "letter");
    const layout = layoutFromNest({ finishW: 8.5, finishH: 11 }, nest);
    expect(layout.nUp).toBe(1);
    expect(layout.pieces).toHaveLength(1);
    expect(layout.cuts).toHaveLength(0);
    expect(layout.gripper).toBeNull();
    expect(layout.needsFileRotate).toBe(false);
    expect(layout.pieces[0].finish).toEqual({ x: 0, y: 0, w: 8.5, h: 11 });
    expect(layout.cutTally).toMatchObject({ clicks: 0, splits: 0, faceTrims: 0 });
    expect(layout.caption).not.toMatch(/Cut count:/);
  });
});

describe("Challenge 305 CRT cut totals", () => {
  it("letter on tabloid is 1 split, 0 face trim", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "tabloid");
    expect(nest.exactTile).toBe(true);
    expect(nest.cuts.clicks).toBe(1);
    expect(nest.cuts.splits).toBe(1);
    expect(nest.cuts.faceTrims).toBe(0);
    expect(nest.cuts.splitWhy).toBe("between the n-up pieces");
    expect(nest.cuts.why).toMatch(/Cut count: 1/);
    expect(nest.cuts.brief).toBe("1 split, no face trim");
    expect(nest.cuts.why).toMatch(/Face trim: no/);
    expect(nest.cuts.why).toMatch(/Splits: 1 \(between the n-up pieces\)/);
  });

  it("6×9 on 12×18 exact 4-up is 2 splits, 0 face trim", () => {
    const nest = nestOf({ w: 6, h: 9 }, "12x18", 5000);
    expect(nest.exactTile).toBe(true);
    expect(nest.cuts.clicks).toBe(2);
    expect(nest.cuts.splits).toBe(2);
    expect(nest.cuts.faceTrims).toBe(0);
    expect(nest.cuts.splitWhy).toBe("strip then cut the strip");
    expect(nest.cuts.why).toMatch(/Cut count: 2/);
    expect(nest.cuts.brief).toBe("2 splits, no face trim");
    expect(nest.cuts.why).toMatch(/Face trim: no/);
    expect(nest.cuts.why).toMatch(/Splits: 2 \(strip then cut the strip\)/);
  });

  it("6×9 on 13×19 4-up counts gripper+trim face strokes, not only 2 splits", () => {
    const nest = nestOf({ w: 6, h: 9 }, "13x19", 5000);
    expect(nest.exactTile).toBe(false);
    expect(nest.nUp).toBe(4);
    expect(nest.gripperApplied).toBe(true);
    expect(nest.trimApplied).toBe(true);
    expect(nest.cuts.splits).toBe(2);
    expect(nest.cuts.faceTrims).toBe(6);
    expect(nest.cuts.clicks).toBe(8);
    expect(nest.cuts.why).toMatch(/Cut count: 8/);
    expect(nest.cuts.brief).toBe("2 splits, 6 face trim");
    expect(nest.cuts.why).toMatch(/Face trim: yes, 6/);
    expect(nest.cuts.why).toMatch(/gripper leftover/);
    expect(nest.cuts.why).toMatch(/trim\/bleed edges/);
    expect(nest.cuts.why).toMatch(/unused parent margin/);
  });
});

describe("same-way recommend vs file rotate", () => {
  it("does not recommend a nest that only wins by rotating the file", () => {
    const letter = rankParents(job());
    expect(letter[0].needsFileRotate).toBe(false);
    expect(letter[0].orientation).toBe("same");

    const sixByNine = rankParents(job({ finishW: 6, finishH: 9, qty: 5000 }));
    expect(sixByNine[0].parent.id).toBe("12x18");
    expect(sixByNine[0].needsFileRotate).toBe(false);
    expect(sixByNine[0].nUp).toBe(4);
  });

  it("letter on 12×18 is 2-up by turning the sheet, not rotating art", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "12x18");
    expect(nest.nUp).toBe(2);
    expect(nest.orientation).toBe("same");
    expect(nest.needsFileRotate).toBe(false);
    expect(nest.sheetTurned).toBe(true);
    expect(nest.cols).toBe(2);
    expect(nest.rows).toBe(1);
  });

  it("file-rotate nest is labeled for prepress when asked", () => {
    const parent = PARENTS.find((p) => p.id === "tabloid")!;
    const rotated = nestOnParent(job(), parent, { allowFileRotate: true });
    expect(rotated).toBeTruthy();
    // Same n-up is available same-way, so default pick is not file-rotate.
    const same = nestOnParent(job(), parent);
    expect(same?.needsFileRotate).toBe(false);
    expect(same?.nUp).toBe(rotated!.nUp);
    expect(
      repeatCaption({ w: 8.5, h: 11 }, { ...rotated!, needsFileRotate: true }),
    ).toMatch(/Prepress would have to rotate the file/);
  });
});
