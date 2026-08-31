import { describe, expect, it } from "vitest";
import {
  evenGaps,
  grommetsOnEdge,
  placeAlongEdge,
  planGrommets,
  type GrommetInput,
} from "./grommets";

const shop: GrommetInput = {
  widthIn: 36,
  heightIn: 24,
  insetIn: 1,
  maxSpacingIn: 24,
  corners: true,
  extra: { top: 0, bottom: 0, left: 0, right: 0 },
};

describe("even grommet spacing", () => {
  it("36×24 in, 1 in inset, 24 in max: corners + one mid on the longs", () => {
    const plan = planGrommets(shop);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(evenGaps(34, 24)).toBe(2);
    expect(plan.edges.top.count).toBe(3);
    expect(plan.edges.bottom.count).toBe(3);
    expect(plan.edges.left.count).toBe(2);
    expect(plan.edges.right.count).toBe(2);
    expect(plan.total).toBe(6);
    expect(plan.edges.top.fromCornerIn[0]).toBeCloseTo(1);
    expect(plan.edges.top.fromCornerIn[1]).toBeCloseTo(18);
    expect(plan.edges.top.fromCornerIn[2]).toBeCloseTo(35);
    expect(plan.edges.top.gapIn).toBeLessThanOrEqual(24);
    expect(plan.edges.left.gapIn).toBeLessThanOrEqual(24);
  });

  it("10 ft × 3 ft banner at 24 in max needs 14 grommets", () => {
    const plan = planGrommets({ ...shop, widthIn: 120, heightIn: 36 });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.edges.top.count).toBe(6);
    expect(plan.edges.left.count).toBe(3);
    expect(plan.total).toBe(14);
    expect(plan.edges.top.gapIn!).toBeLessThanOrEqual(24);
    expect(plan.edges.left.gapIn!).toBeLessThanOrEqual(24);
  });

  it("optional extra along top adds one, still even and ≤ max", () => {
    const plan = planGrommets({
      ...shop,
      extra: { top: 1, bottom: 0, left: 0, right: 0 },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.edges.top.count).toBe(4);
    expect(plan.edges.bottom.count).toBe(3);
    expect(plan.total).toBe(7);
    expect(plan.edges.top.gapIn!).toBeLessThanOrEqual(24);
    expect(plan.edges.top.fromCornerIn).toHaveLength(4);
    expect(plan.edges.top.fromCornerIn[0]).toBeCloseTo(1);
    expect(plan.edges.top.fromCornerIn[3]).toBeCloseTo(35);
  });

  it("unchecking corners drops the four corners and keeps interiors", () => {
    expect(grommetsOnEdge(34, 24, false, 0)).toBe(1);
    expect(grommetsOnEdge(22, 24, false, 0)).toBe(0);
    const plan = planGrommets({ ...shop, corners: false });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.edges.top.count).toBe(1);
    expect(plan.edges.left.count).toBe(0);
    expect(plan.total).toBe(2);
    expect(plan.points.every((p) => p.x !== 1 || p.y !== 1)).toBe(true);
    expect(placeAlongEdge(1, 1, 34, false)[0]).toBeCloseTo(18);
  });

  it("rejects a finish smaller than twice the inset", () => {
    const plan = planGrommets({ ...shop, widthIn: 2, insetIn: 1 });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toMatch(/inset/i);
  });
});
