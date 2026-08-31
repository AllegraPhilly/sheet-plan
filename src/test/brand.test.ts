import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_UI_STRINGS } from "@/lib/machines";

function src(rel: string): string {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

describe("Allegra 2026 shop-floor identity", () => {
  it("uses 2026 hex colors and Roboto only — no Caveat, Trajan, or receipt novelty fonts", () => {
    const css = src("app/globals.css");
    const layout = src("app/layout.tsx");
    const shell = src("components/AppShell.tsx");
    const svg = src("components/SheetLayoutSvg.tsx");
    const blob = `${css}\n${layout}\n${shell}\n${svg}`;

    expect(css).toMatch(/#522e90/i);
    expect(css).toMatch(/#ee3e42/i);
    expect(css).toMatch(/#408eb2/i);
    expect(css).toMatch(/#fcba30/i);
    expect(css).toMatch(/#26a046/i);
    expect(layout).toMatch(/Roboto/);
    expect(layout).not.toMatch(/Caveat/);
    expect(css).not.toMatch(/Caveat/);
    expect(css).not.toMatch(/--font-caveat/);
    expect(css).not.toMatch(/\.hand\s*\{/);
    expect(blob.toLowerCase()).not.toContain("trajan");
    expect(blob.toLowerCase()).not.toContain("barlow");
    expect(blob.toLowerCase()).not.toContain("ibm plex");
    expect(blob.toLowerCase()).not.toContain("stone sans");
    expect(svg).toMatch(/Roboto/);
  });

  it("ships the official 4-color A in the header and official horizontal lockup in the footer", () => {
    const root = new URL("../../", import.meta.url);
    expect(existsSync(new URL("public/brand/allegra-a.svg", root))).toBe(true);
    expect(existsSync(new URL("public/brand/allegra-a.png", root))).toBe(true);
    expect(existsSync(new URL("public/brand/allegra-lockup.svg", root))).toBe(true);
    expect(existsSync(new URL("public/brand/allegra-lockup.png", root))).toBe(true);
    const png = readFileSync(new URL("public/brand/allegra-a.png", root));
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    const lockupPng = readFileSync(new URL("public/brand/allegra-lockup.png", root));
    expect(lockupPng.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    const lockupSvg = readFileSync(new URL("public/brand/allegra-lockup.svg", root), "utf8");
    expect(lockupSvg).toMatch(/authorized Alliance Franchise Brands art/);
    expect(lockupSvg).not.toMatch(/Stone Sans/);

    const shell = src("components/AppShell.tsx");
    const layout = src("app/layout.tsx");
    const css = src("app/globals.css");
    const header = shell.slice(0, shell.indexOf("<footer"));
    const footer = shell.slice(shell.indexOf("<footer"));
    expect(header).toMatch(/brand\/allegra-a/);
    expect(header).toMatch(/Sheet Plan/);
    expect(header).toMatch(/Wide \(trial\)/);
    expect(header).toMatch(/function navActive/);
    expect(header).toMatch(/\/floor\/wide\//);
    expect(header).toMatch(/bg-\[var\(--purple\)\]/);
    expect(header).not.toMatch(/Allegra Philadelphia/);
    expect(header).not.toMatch(/MARKETING/);
    expect(header).not.toMatch(/PRINT • MAIL/);
    expect(header).not.toMatch(/Stone Sans/);
    expect(header).not.toMatch(/ALLEGRA/);
    expect(footer).toMatch(/brand\/allegra-lockup/);
    expect(footer).not.toMatch(/Stone Sans/);
    expect(layout).not.toMatch(/watermark/);
    expect(css).toMatch(/\.nav-tab-active/);
    expect(css).toMatch(/\.nav-tab-active::after[\s\S]*?var\(--gold\)/);
    expect(css).toMatch(/\.brand-chip/);
    expect(css).toMatch(/\.brand-mark\s*\{[\s\S]*?height:\s*2\.5rem/);
    expect(css).toMatch(/border-left:\s*4px solid var\(--purple\)/);
  });

  it("keeps INTERNAL as a quiet Roboto label and no independently-owned footnote", () => {
    const shell = src("components/AppShell.tsx");
    expect(shell).toMatch(/INTERNAL/);
    expect(shell).toMatch(/quiet-note/);
    expect(shell).toMatch(/INTERNAL staff tool/);
    expect(shell).not.toMatch(/internal-pill/);
    expect(shell).not.toMatch(/\bhand\b/);
    expect(shell).not.toMatch(/independently owned and operated/i);
    expect(shell).not.toMatch(/Independently owned and operated/);
    expect(shell.toLowerCase()).not.toContain("wordmark.svg");
    expect(shell.toLowerCase()).not.toContain("logo.svg");
    expect(src("app/layout.tsx")).not.toMatch(/Caveat/);
    expect(src("components/PlannerView.tsx")).not.toMatch(/className="[^"]*hand/);
    const planner = src("components/PlannerView.tsx");
    expect(planner).toMatch(/role="alert"/);
    expect(planner.match(/role="alert"/g)?.length).toBe(1);
  });

  it("uses normal section heads, not shouty 3xl ticket titles", () => {
    const planner = src("components/PlannerView.tsx");
    const mail = src("components/MailAdvisorView.tsx");
    const floor = src("components/FloorView.tsx");
    expect(planner).not.toMatch(/ticket-head text-3xl/);
    expect(mail).not.toMatch(/ticket-head text-3xl/);
    expect(floor).not.toMatch(/ticket-head text-3xl/);
    expect(src("app/globals.css")).toMatch(/\.ticket-head\s*\{[\s\S]*?font-size:\s*1\.125rem/);
  });

  it("contains native date and form fields so they cannot overflow the ticket", () => {
    const css = src("app/globals.css");
    const fieldBlock = css.match(/\.field\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(fieldBlock).toMatch(/width:\s*100%/);
    expect(fieldBlock).toMatch(/box-sizing:\s*border-box/);
    expect(fieldBlock).toMatch(/min-width:\s*0/);
    expect(css).toMatch(/\.ticket label[\s\S]*?min-width:\s*0/);
    expect(src("components/PlannerView.tsx")).toMatch(
      /overflow-hidden[\s\S]*?Job date[\s\S]*?type="date"/,
    );
  });

  it("keeps one Cut count heading on the chosen plan, never on the alternate layout", () => {
    const planner = src("components/PlannerView.tsx");
    const svg = src("components/SheetLayoutSvg.tsx");
    expect(planner).toMatch(/Cut count: \{cuts\.clicks\}/);
    expect(svg).not.toMatch(/Cut count:/);
    expect(svg).toMatch(/alternateParentHint/);
    expect(src("components/PlannerView.tsx")).toMatch(/Corner staple/);
    expect(src("components/PlannerView.tsx")).toMatch(/Side staple/);
    expect(src("components/PlannerView.tsx")).not.toMatch(/>Stitch</);
    expect(src("components/PlannerView.tsx")).not.toMatch(/Perfect bind/);
  });

  it("does not store allegraphilly.com, Fiery, or Vercel in identity files", () => {
    const blob = [src("app/globals.css"), src("app/layout.tsx"), src("components/AppShell.tsx")]
      .join("\n")
      .toLowerCase();
    for (const s of FORBIDDEN_UI_STRINGS) {
      expect(blob).not.toContain(s.toLowerCase());
    }
    expect(blob).not.toContain("vercel");
  });
});
