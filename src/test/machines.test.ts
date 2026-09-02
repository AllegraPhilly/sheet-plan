import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIDENT_IDS, FORBIDDEN_UI_STRINGS, MACHINES, confidentMachines, machineById } from "@/lib/machines";

function walkSrc(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkSrc(full));
    else if (/\.(ts|tsx|js|mjs|css|md|json)$/i.test(name)) out.push(full);
  }
  return out;
}

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

  it("Accurio unit top feeder is confident fold-only, no click, no invented plate", () => {
    const feeder = machineById("accurio-top-feeder")!;
    expect(CONFIDENT_IDS).toContain("accurio-top-feeder");
    expect(feeder.name).toBe("AccurioPress 6120 unit top feeder");
    expect(feeder.kind).toBe("folder");
    expect(feeder.confidence).toBe("confident");
    expect(feeder.role).toMatch(/fold already-complete sheets on Accurio with no click/i);
    expect(feeder.maxSheetIn).toEqual({ w: 12.76, h: 18.23 });
    const notes = feeder.notes.join(" ");
    expect(notes).toMatch(/no click|bypasses click/i);
    expect(notes).toMatch(/job qty ≤ 50/);
    expect(notes).not.toMatch(/50 sheets/);
    expect(notes).toMatch(/1–5 sheets per set/);
    expect(notes).toMatch(/1–3 sheets per set/);
    expect(notes).toMatch(/~35 sets/);
    expect(notes).toMatch(/not mixed-saddle cover insert/i);
    expect(notes).toMatch(/do not pick 12×18/i);
    expect(notes).toMatch(/12\.76/);
    expect(notes).not.toMatch(/PI-502|SD-510|SD-513|SD-506/i);
    expect(JSON.stringify(feeder)).not.toMatch(/PI-502|SD-510/i);
    expect(machineById("accurio-6120")!.notes.join(" ")).toMatch(/unit top feeder/);
    expect(machineById("accurio-6120")!.notes.join(" ")).toMatch(/engine fold-only is still forbidden/i);
    expect(machineById("accurio-saddle-booklet-maker")!.notes.join(" ")).toMatch(/unit top feeder/);
    expect(machineById("accurio-saddle-booklet-maker")!.notes.join(" ")).toMatch(/not mixed-saddle cover insert/i);
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
    expect(cut.floorFacts?.join(" ")).toMatch(/97116F/);
    const vinyl = machineById("summa-s2t140")!;
    expect(vinyl.kind).toBe("vinyl");
    expect(vinyl.notes.join(" ")).toMatch(/not a paper/i);
  });

  it("Baumfolder 714 is tabletop air-feed, 14×20, serial 86-B-235, USPS fold-mailer only", () => {
    const baum = machineById("baumfolder-714")!;
    expect(baum.confidence).toBe("confident");
    expect(baum.kind).toBe("folder");
    expect(baum.role).toMatch(/tabletop air-feed/i);
    expect(baum.maxSheetIn).toEqual({ w: 14, h: 20 });
    expect(JSON.stringify(baum)).toMatch(/86-B-235/);
    expect(baum.notes.join(" ")).toMatch(/fold-mailer/i);
    expect(baum.notes.join(" ")).toMatch(/letter/i);
    expect(JSON.stringify(baum).toLowerCase()).not.toMatch(/glue kit/);
  });

  it("Stahl 1220B-4-P-3 is confident pile-feed buckle folder, 20×33, serial 120LG0087", () => {
    const stahl = machineById("stahl-folder")!;
    expect(CONFIDENT_IDS).toContain("stahl-folder");
    expect(stahl.confidence).toBe("confident");
    expect(stahl.kind).toBe("folder");
    expect(stahl.name).toMatch(/1220B-4-P-3/);
    expect(stahl.name).toMatch(/Stahlfolder B20/);
    expect(stahl.role).toMatch(/pile-feed buckle folder/i);
    expect(stahl.maxSheetIn).toEqual({ w: 20, h: 33 });
    expect(JSON.stringify(stahl)).toMatch(/120LG0087/);
    const notes = stahl.notes.join(" ");
    expect(notes).toMatch(/do not assign fold-mailer/i);
    expect(notes).toMatch(/do not assume an 8-page right-angle/i);
    expect(notes).toMatch(/8PG/);
    expect(notes).toMatch(/4 buckle plates/i);
    expect(notes).not.toMatch(/fold-mailer stays on Stahl|assign fold-mailer to Stahl/i);
    expect(JSON.stringify(MACHINES)).not.toMatch(/SD-510|SD-513|SD-506|PI-502/i);
  });

  it("does not claim an 8-page right-angle / 8PG unit as installed", () => {
    const blob = JSON.stringify(MACHINES);
    expect(blob).not.toMatch(/8PG (installed|on the floor|equipped)/i);
    expect(blob).not.toMatch(/right-angle unit is installed/i);
    expect(machineById("stahl-folder")!.notes.join(" ")).toMatch(/until a second plate/i);
  });

  it("wrong Baum serial is gone from the repo", () => {
    const srcRoot = new URL("..", import.meta.url).pathname;
    const files = walkSrc(srcRoot);
    const wrong = /88[.\-]B[.\-]233/;
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(wrong);
    }
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

  it("UI catalog never claims PI-502 or SD-510 is installed", () => {
    const blob = JSON.stringify(MACHINES);
    expect(blob).not.toMatch(/PI-502|SD-510|SD-513|SD-506/i);
    const srcRoot = new URL("../", import.meta.url).pathname;
    for (const file of walkSrc(srcRoot)) {
      if (file.includes("/test/")) continue;
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/PI-502|SD-510/i);
    }
  });
});
