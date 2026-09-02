import { describe, expect, it } from "vitest";
import { GLOSSARY } from "@/lib/glossary";
import { nextTipMode } from "@/lib/glossary-tip";

describe("glossary copy", () => {
  it("covers planner and mail terms without inventing rates or a 2–3 day FCM promise", () => {
    expect(GLOSSARY.parent.def).toMatch(/sheet you buy and print on/i);
    expect(GLOSSARY.nUp.def).toMatch(/finished pieces fit on one parent/i);
    expect(GLOSSARY.buyScore.def).toMatch(/not dollars/i);
    expect(GLOSSARY.buyScore.def).toMatch(/lowest wins/i);
    expect(GLOSSARY.impressions.def).toMatch(/press runs the sheet/i);
    expect(GLOSSARY.cutClick.def).toMatch(/Challenge 305 CRT/i);
    expect(GLOSSARY.cutClick.def).toMatch(/post-fold face trim/i);
    expect(GLOSSARY.cutClick.def).toMatch(/fold is not a cut/i);
    expect(GLOSSARY.finish.def).toMatch(/customer gets after cut/i);
    expect(GLOSSARY.gripper.def).toMatch(/0\.25 in/i);
    expect(GLOSSARY.trim.def).toMatch(/0\.125 in/i);
    expect(GLOSSARY.exactTile.def).toMatch(/8\.5×11 on 11×17/i);
    expect(GLOSSARY.fold.def).toMatch(/Baumfolder 714/);
    expect(GLOSSARY.fold.def).toMatch(/14×20/);
    expect(GLOSSARY.fold.def).toMatch(/Stahl B20/);
    expect(GLOSSARY.fold.def).toMatch(/unit top feeder/);
    expect(GLOSSARY.fold.def).toMatch(/no click/);
    expect(GLOSSARY.fold.def).toMatch(/qty ≤ 50/);
    expect(GLOSSARY.fold.def).toMatch(/1–5 sheets per set/);
    expect(GLOSSARY.fold.def).toMatch(/1–3/);
    expect(GLOSSARY.fold.def).not.toMatch(/50 sheets/);
    expect(GLOSSARY.fold.def).not.toMatch(/8PG|right-angle/i);
    expect(GLOSSARY.fold.def).not.toMatch(/PI-502|SD-510/i);
    expect(GLOSSARY.saddle.def).toMatch(/not letter 2-up cut/i);
    expect(GLOSSARY.mixed.def).toMatch(/part color/i);
    expect(GLOSSARY.mixed.def).toMatch(/one Versant stack/i);
    expect(GLOSSARY.mixed.def).toMatch(/too much handling/i);
    expect(GLOSSARY.mixed.def).toMatch(/not all on Versant/i);
    expect(GLOSSARY.saddle.def).toMatch(/AccurioPress 6120 in-line saddle/i);
    expect(GLOSSARY.size.def).toMatch(/not a whitelist/i);
    expect(GLOSSARY.substrate.def).toMatch(/paper, envelope, vinyl, garment, UV/i);
    expect(GLOSSARY.internal.def).toMatch(/not a customer site/i);

    expect(GLOSSARY.fcm.def).toMatch(/1–5 days/);
    expect(GLOSSARY.fcm.def).toMatch(/not a guaranteed 2–3/);
    expect(GLOSSARY.mm.def).toMatch(/once eligible/i);
    expect(GLOSSARY.eddm.def).toMatch(/no permit/i);
    expect(GLOSSARY.permit.def).toMatch(/closed here until confirmed/i);
    expect(GLOSSARY.entry.def).toMatch(/DDU letters are not offered/i);
    expect(GLOSSARY.nonmachinable.def).toMatch(/\$0\.49/);
    expect(GLOSSARY.tabbed.def).toMatch(/without an envelope/i);
    expect(GLOSSARY.notice123.def).toMatch(/never invent a rate/i);
  });

  it("does not store forbidden hosts or Fiery identifiers", () => {
    const blob = JSON.stringify(GLOSSARY).toLowerCase();
    expect(blob).not.toContain("allegraphilly.com");
    expect(blob).not.toContain("fiery");
    expect(blob).not.toContain("vercel");
    expect(blob).not.toMatch(/sd-510|sd-513|sd-506|pi-502/);
  });

  it("aria labels stay short What-is questions", () => {
    expect(GLOSSARY.nUp.label).toBe("n-up");
    expect(GLOSSARY.buyScore.label).toBe("buy score");
    expect(GLOSSARY.notice123.label).toBe("Notice 123");
  });
});

describe("glossary tip open modes", () => {
  it("desktop hover previews; click pins so it stays; click again or dismiss closes", () => {
    expect(nextTipMode("closed", "hover-enter")).toBe("hover");
    expect(nextTipMode("hover", "hover-leave")).toBe("closed");
    expect(nextTipMode("hover", "click")).toBe("pinned");
    expect(nextTipMode("pinned", "hover-leave")).toBe("pinned");
    expect(nextTipMode("pinned", "click")).toBe("closed");
    expect(nextTipMode("closed", "click")).toBe("pinned");
    expect(nextTipMode("pinned", "dismiss")).toBe("closed");
    expect(nextTipMode("hover", "dismiss")).toBe("closed");
  });
});
