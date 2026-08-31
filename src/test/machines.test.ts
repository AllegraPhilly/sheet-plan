import { describe, expect, it } from "vitest";
import { CONFIDENT_IDS, MACHINES, confidentMachines, machineById } from "@/lib/machines";

describe("floor catalog", () => {
  it("includes every required confident id", () => {
    for (const id of CONFIDENT_IDS) {
      const m = machineById(id);
      expect(m, id).toBeTruthy();
      expect(m?.confidence).toBe("confident");
    }
    expect(confidentMachines()).toHaveLength(CONFIDENT_IDS.length);
  });

  it("Accurio 6120 has no booklet maker — mixed booklets gather off-press", () => {
    const acc = machineById("accurio-6120")!;
    expect(acc.notes.join(" ")).toMatch(/no booklet maker/i);
    expect(acc.notes.join(" ")).toMatch(/gather off-press/i);
    expect(acc.notes.join(" ")).toMatch(/do not load Versant covers into the Konica/i);
    expect(acc.floorFacts?.join(" ")).toMatch(/no booklet maker/i);
  });

  it("Challenge 305 CRT knife/clamp facts; Summa is vinyl not paper", () => {
    const cut = machineById("challenge-305-crt")!;
    expect(cut.floorFacts?.join(" ")).toMatch(/30\.5/);
    expect(cut.floorFacts?.join(" ")).toMatch(/3\.5/);
    const vinyl = machineById("summa-s2t140")!;
    expect(vinyl.kind).toBe("vinyl");
    expect(vinyl.notes.join(" ")).toMatch(/not a paper/i);
  });

  it("MAILBOT is skip / email only", () => {
    const bot = machineById("mailbot")!;
    expect(bot.confidence).toBe("skip");
    expect(bot.kind).toBe("email-only");
  });

  it("no meter serials or USPS account IDs on meter machines", () => {
    const meters = MACHINES.filter((m) => m.kind === "meter" || m.kind === "inserter");
    const text = JSON.stringify(meters);
    expect(text).not.toMatch(/\bPZZ\d|\bserial\s*\d|CRID|permit #|account id/i);
  });
});
