import { describe, expect, it } from "vitest";
import { nestOnParent } from "@/lib/planner/nest";
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

describe("sheet layout geometry", () => {
  it("letter on tabloid is exact 2-up with one horizontal Challenge cut", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "tabloid");
    const layout = layoutFromNest({ finishW: 8.5, finishH: 11 }, nest);

    expect(layout.nUp).toBe(2);
    expect(layout.nUp).toBe(nest.nUp);
    expect(layout.pieces).toHaveLength(2);
    expect(layout.exactTile).toBe(true);
    expect(layout.gripper).toBeNull();
    expect(layout.trimApplied).toBe(false);
    expect(layout.orientation).toBe("rotated");
    expect(layout.pieceW).toBe(11);
    expect(layout.pieceH).toBe(8.5);
    expect(layout.parent).toMatchObject({ w: 11, h: 17, label: "11×17" });

    expect(layout.cuts).toHaveLength(1);
    expect(layout.cuts[0]).toEqual({ x1: 0, y1: 8.5, x2: 11, y2: 8.5 });

    expect(layout.pieces[0].finish).toEqual({ x: 0, y: 0, w: 11, h: 8.5 });
    expect(layout.pieces[1].finish).toEqual({ x: 0, y: 8.5, w: 11, h: 8.5 });
  });

  it("6×9 on 12×18 is exact 4-up with a 2×2 cut grid", () => {
    const nest = nestOf({ w: 6, h: 9 }, "12x18", 5000);
    const layout = layoutFromNest({ finishW: 6, finishH: 9 }, nest);

    expect(nest.nUp).toBe(4);
    expect(layout.nUp).toBe(4);
    expect(layout.pieces).toHaveLength(4);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.exactTile).toBe(true);
    expect(layout.gripper).toBeNull();
    expect(layout.trimApplied).toBe(false);
    expect(layout.orientation).toBe("same");
    expect(layout.parent.label).toBe("12×18");

    expect(layout.cuts).toEqual([
      { x1: 6, y1: 0, x2: 6, y2: 18 },
      { x1: 0, y1: 9, x2: 12, y2: 9 },
    ]);
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

  it("6×9 on 13×19 keeps nest 4-up and shows gripper plus trim inset", () => {
    const nest = nestOf({ w: 6, h: 9 }, "13x19", 5000);
    const layout = layoutFromNest({ finishW: 6, finishH: 9 }, nest);

    expect(nest.nUp).toBe(4);
    expect(nest.exactTile).toBe(false);
    expect(nest.gripperApplied).toBe(true);
    expect(nest.trimApplied).toBe(true);
    expect(layout.nUp).toBe(4);
    expect(layout.pieces).toHaveLength(4);
    expect(layout.gripper).toEqual({
      x: 0,
      y: 19 - GRIPPER_IN,
      w: 13,
      h: GRIPPER_IN,
    });
    expect(layout.trimApplied).toBe(true);
    expect(layout.tileW).toBeCloseTo(6 + TRIM_IN * 2);
    expect(layout.tileH).toBeCloseTo(9 + TRIM_IN * 2);
    expect(layout.pieces[0].finish).toEqual({
      x: TRIM_IN,
      y: TRIM_IN,
      w: 6,
      h: 9,
    });
    expect(layout.cuts).toHaveLength(2);
  });

  it("same-size letter is 1-up with no cut lines", () => {
    const nest = nestOf({ w: 8.5, h: 11 }, "letter");
    const layout = layoutFromNest({ finishW: 8.5, finishH: 11 }, nest);
    expect(layout.nUp).toBe(1);
    expect(layout.pieces).toHaveLength(1);
    expect(layout.cuts).toHaveLength(0);
    expect(layout.gripper).toBeNull();
    expect(layout.pieces[0].finish).toEqual({ x: 0, y: 0, w: 8.5, h: 11 });
  });
});
