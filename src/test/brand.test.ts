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
    expect(css).toMatch(/--paper:\s*#fff/i);
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

  it("ships a small standalone A and Sheet Plan only — no franchise lockup", () => {
    const root = new URL("../../", import.meta.url);
    expect(existsSync(new URL("public/brand/allegra-a.svg", root))).toBe(true);
    expect(existsSync(new URL("public/brand/allegra-a.png", root))).toBe(true);
    const png = readFileSync(new URL("public/brand/allegra-a.png", root));
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);

    const shell = src("components/AppShell.tsx");
    const layout = src("app/layout.tsx");
    const css = src("app/globals.css");
    expect(shell).toMatch(/brand\/allegra-a/);
    expect(shell).toMatch(/Sheet Plan/);
    expect(shell).not.toMatch(/Allegra Philadelphia/);
    expect(shell).not.toMatch(/MARKETING/);
    expect(shell).not.toMatch(/PRINT • MAIL/);
    expect(shell).not.toMatch(/Stone Sans/);
    expect(shell).not.toMatch(/ALLEGRA/);
    expect(layout).not.toMatch(/watermark/);
    expect(css).toMatch(/\.hairline/);
    expect(css).toMatch(/\.nav-tab-active/);
    expect(css).not.toMatch(/\.nav-tab-active::after[\s\S]*?var\(--gold\)/);
    expect(shell).not.toMatch(/bg-\[var\(--purple\)\]/);
  });

  it("keeps INTERNAL as a quiet Roboto label and independently owned copy", () => {
    const shell = src("components/AppShell.tsx");
    expect(shell).toMatch(/INTERNAL/);
    expect(shell).toMatch(/quiet-note/);
    expect(shell).not.toMatch(/internal-pill/);
    expect(shell).not.toMatch(/\bhand\b/);
    expect(shell).toMatch(/Independently owned and operated/);
    expect(shell).toMatch(/No franchise wordmark/);
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
