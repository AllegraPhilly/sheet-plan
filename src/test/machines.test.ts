import { describe, expect, it } from "vitest";
import { CONFIDENT_IDS, FORBIDDEN_UI_STRINGS, MACHINES, confidentMachines, machineById } from "@/lib/machines";

describe("floor catalog", () => {
  it("includes every required confident id", () => {
    for (const id of CONFIDENT_IDS) {
      const m = machineById(id);
      expect(m, id).toBeTruthy();
      expect(m?.confidence).toBe("confident");
    }
    expect(confidentMachines()).toHaveLength(CONFIDENT_IDS.length);
  });

  it("Xerox PR Booklet Maker Finisher is the Versant in-line module — no invented serial", () => {
    const fin = machineById("xerox-pr-booklet-maker-finisher")!;
    expect(fin.name).toBe("Xerox Production Ready (PR) Booklet Maker Finisher");
    expect(fin.kind).toBe("finishing");
    expect(fin.confidence).toBe("confident");
    expect(fin.role).toMatch(/in-line fold \+ saddle-staple on Versant 4100/i);
    expect(fin.maxSheetIn).toEqual({ w: 13, h: 19.2 });
    const blob = JSON.stringify(fin).toLowerCase();
    expect(blob).not.toMatch(/squarefold|plockmatic|\bdfa\b/);
    expect(blob).not.toMatch(/\bPZZ\d|\bserial\s*\d/);
    expect(blob).not.toContain("fiery");
    expect(fin.notes.join(" ")).toMatch(/7\.17/);
    expect(fin.notes.join(" ")).toMatch(/30 sheets/);
    expect(fin.notes.join(" ")).toMatch(/KB0400109/);
    expect(fin.notes.join(" ")).toMatch(/All-color saddles only/i);
  });

  it("Accurio 6120 has in-line saddle — mixed saddles are not forced onto Versant", () => {
    const acc = machineById("accurio-6120")!;
    expect(acc.notes.join(" ")).not.toMatch(/no booklet maker/i);
    expect(acc.notes.join(" ")).toMatch(/in-line saddle/i);
    expect(acc.notes.join(" ")).toMatch(/12\.76/);
    expect(acc.notes.join(" ")).toMatch(/18\.23/);
    expect(acc.notes.join(" ")).toMatch(/11×17/);
    expect(acc.notes.join(" ")).not.toMatch(/Mixed booklets print on the Versant 4100/i);
    expect(acc.notes.join(" ")).not.toMatch(/gather off-press/i);
    expect(acc.floorFacts?.join(" ")).not.toMatch(/no booklet maker/i);
  });

  it("Accurio in-line saddle / booklet maker is catalogued without a module plate id", () => {
    const fin = machineById("accurio-saddle-booklet-maker")!;
    expect(fin.name).toBe("AccurioPress 6120 in-line saddle / booklet maker");
    expect(fin.kind).toBe("finishing");
    expect(fin.confidence).toBe("confident");
    expect(fin.role).toMatch(/in-line fold \+ saddle-staple on AccurioPress 6120/i);
    expect(fin.maxSheetIn).toEqual({ w: 13, h: 19.2 });
    expect(fin.notes.join(" ")).toMatch(/20 sheets/);
    expect(CONFIDENT_IDS).toContain("accurio-saddle-booklet-maker");
    const blob = JSON.stringify({ MACHINES, GLOSSARY: fin });
    expect(blob).not.toMatch(/SD-510|SD-513|SD-506|PI-502/i);
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

  it("catalog copy never invents Accurio saddle module plates", () => {
    const blob = JSON.stringify(MACHINES);
    for (const s of FORBIDDEN_UI_STRINGS) {
      expect(blob.toLowerCase()).not.toContain(s.toLowerCase());
    }
    const salco = machineById("salco-rapid-106e")!;
    expect(salco.notes.join(" ")).toMatch(/overflow/i);
    expect(salco.notes.join(" ")).toMatch(/corner staple/i);
    const versant = machineById("versant-4100")!;
    expect(versant.notes.join(" ")).toMatch(/Color saddles that fit/i);
    expect(versant.notes.join(" ")).not.toMatch(/Color and mixed saddle that fit/i);
  });
});
