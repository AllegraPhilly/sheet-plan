import { describe, expect, it } from "vitest";
import {
  FINISH_PRESETS,
  matchFinishPreset,
  presetById,
} from "@/lib/planner/finish-sizes";
import { planFromJob } from "@/lib/planner/plan";
import { defaultTicket } from "@/lib/planner/ticket-text";

describe("finish size shortcut — not a whitelist", () => {
  it("lists Custom first, then the shop shortcuts", () => {
    expect(FINISH_PRESETS[0]).toEqual({ id: "custom", label: "Custom" });
    expect(FINISH_PRESETS.map((p) => p.label)).toEqual([
      "Custom",
      "Business card 3.5×2",
      "Postcard 4×6",
      "Rack card 4×9",
      "5×7",
      "Digest 5.5×8.5",
      "6×9",
      "Letter 8.5×11",
      "Legal 8.5×14",
      "Tabloid 11×17",
    ]);
  });

  it("picking Custom has no W×H and does not overwrite numbers", () => {
    const custom = presetById("custom");
    expect(custom?.w).toBeUndefined();
    expect(custom?.h).toBeUndefined();
    const ticket = defaultTicket();
    expect(ticket.finishW).toBe(8.5);
    expect(ticket.finishH).toBe(11);
  });

  it("named pick fills W×H; editing off the list is Custom and still plans", () => {
    const fiveBySeven = presetById("5x7");
    expect(fiveBySeven).toMatchObject({ w: 5, h: 7 });
    expect(matchFinishPreset(5, 7)).toBe("5x7");
    expect(matchFinishPreset(7, 5)).toBe("5x7");
    expect(matchFinishPreset(8.5, 11)).toBe("letter");
    expect(matchFinishPreset(2, 2)).toBe("custom");

    const plan = planFromJob({
      ...defaultTicket(),
      description: "50 color 2x2",
      qty: 50,
      finishW: 2,
      finishH: 2,
    });
    expect(plan.recommended.nUp).toBeGreaterThan(1);
    expect(plan.recommended.sheetsToBuy).toBeGreaterThan(0);
  });
});
