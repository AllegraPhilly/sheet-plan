import { describe, expect, it } from "vitest";
import {
  FINISH_PRESETS,
  applyFinishPreset,
  matchFinishPreset,
  presetById,
} from "@/lib/planner/finish-sizes";
import { planFromJob } from "@/lib/planner/plan";
import { defaultTicket } from "@/lib/planner/ticket-text";

describe("finish size shortcut — not a whitelist", () => {
  it("lists Custom first, then the shop shortcuts including booklet fills", () => {
    expect(FINISH_PRESETS[0]).toEqual({ id: "custom", label: "Custom" });
    expect(FINISH_PRESETS.map((p) => p.label)).toEqual([
      "Custom",
      "Business card 3.5×2",
      "Postcard 4×6",
      "Rack card 4×9",
      "5×7",
      "Digest 5.5×8.5",
      "Digest booklet 5.5×8.5",
      "6×9",
      "Letter 8.5×11",
      "Letter booklet 8.5×11",
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

  it("letter booklet fills saddle ticket and keeps operator pages", () => {
    const preset = presetById("letter-booklet")!;
    const filled = applyFinishPreset({ ...defaultTicket(), pages: 20 }, preset);
    expect(filled.finishW).toBe(8.5);
    expect(filled.finishH).toBe(11);
    expect(filled.fold).toBe("half");
    expect(filled.bind).toBe("saddle");
    expect(filled.sides).toBe(2);
    expect(filled.pages).toBe(20);
    expect(matchFinishPreset(8.5, 11, filled)).toBe("letter-booklet");
    const letterPlan = planFromJob(filled);
    expect(letterPlan.recommended.saddle).toBe(true);
    expect(letterPlan.recommended.inlineBooklet).toBe(true);
    expect(letterPlan.recommended.parent.id).toBe("tabloid");
    expect(letterPlan.recommended.nUp).toBe(1);
    expect(letterPlan.finishing.map((s) => s.machineId)).toContain("xerox-pr-booklet-maker-finisher");
    expect(letterPlan.finishing.map((s) => s.machineId)).not.toContain("challenge-305-crt");
  });

  it("digest booklet fills 5.5×8.5 saddle; letter flats do not force saddle", () => {
    const digest = applyFinishPreset(defaultTicket(), presetById("digest-booklet")!);
    expect(digest).toMatchObject({
      finishW: 5.5,
      finishH: 8.5,
      fold: "half",
      bind: "saddle",
      sides: 2,
    });

    const letterFlat = applyFinishPreset(digest, presetById("letter")!);
    expect(letterFlat.bind).toBe("none");
    expect(letterFlat.fold).toBe("none");
    expect(letterFlat.finishW).toBe(8.5);
    expect(letterFlat.finishH).toBe(11);
    expect(matchFinishPreset(8.5, 11, letterFlat)).toBe("letter");

    const fiveBySeven = applyFinishPreset(digest, presetById("5x7")!);
    expect(fiveBySeven.bind).toBe("saddle");
    expect(fiveBySeven.finishW).toBe(5);
    expect(fiveBySeven.finishH).toBe(7);

    const digestPlan = planFromJob({ ...digest, pages: 8, description: "digest saddle" });
    expect(digestPlan.recommended.inlineBooklet).toBe(true);
    expect(digestPlan.recommended.parent.id).toBe("tabloid");
    expect(digestPlan.recommended.nUp).toBe(1);
    expect(digestPlan.finishing.map((s) => s.machineId)).toContain("xerox-pr-booklet-maker-finisher");
    expect(digestPlan.finishing.map((s) => s.machineId)).toContain("challenge-305-crt");
  });
});
