import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_UI_STRINGS } from "@/lib/machines";

function src(rel: string): string {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

describe("Allegra 2026 shop-floor identity", () => {
  it("uses 2026 hex colors and Roboto, not Trajan or receipt novelty fonts", () => {
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
    expect(css).toMatch(/#f7f5fb/i);
    expect(layout).toMatch(/Roboto/);
    expect(layout).toMatch(/Caveat/);
    expect(blob.toLowerCase()).not.toContain("trajan");
    expect(blob.toLowerCase()).not.toContain("barlow");
    expect(blob.toLowerCase()).not.toContain("ibm plex");
    expect(svg).toMatch(/Roboto/);
  });

  it("ships the official 4-color standalone A and a light header, not a purple billboard", () => {
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
    expect(shell).toMatch(/Allegra Philadelphia/);
    expect(shell).not.toMatch(/MARKETING/);
    expect(shell).not.toMatch(/PRINT • MAIL/);
    expect(shell).not.toMatch(/Stone Sans/);
    expect(shell).not.toMatch(/ALLEGRA(?! Philadelphia)/);
    expect(layout).not.toMatch(/watermark/);
    expect(css).toMatch(/\.hairline/);
    expect(css).toMatch(/\.nav-tab-active/);
    expect(shell).not.toMatch(/bg-\[var\(--purple\)\]/);
  });

  it("keeps INTERNAL / independently owned copy and no fake wordmark file", () => {
    const shell = src("components/AppShell.tsx");
    expect(shell).toMatch(/INTERNAL/);
    expect(shell).toMatch(/Independently owned and operated/);
    expect(shell).toMatch(/No franchise wordmark/);
    expect(shell.toLowerCase()).not.toContain("wordmark.svg");
    expect(shell.toLowerCase()).not.toContain("logo.svg");
    expect(src("app/layout.tsx")).toMatch(/Caveat/);
    expect(shell).toMatch(/hand/);
    expect(src("components/PlannerView.tsx")).not.toMatch(/className="[^"]*hand/);
  });

  it("does not store allegraphilly.com, Fiery, or Vercel in identity files", () => {
    const blob = [
      src("app/globals.css"),
      src("app/layout.tsx"),
      src("components/AppShell.tsx"),
    ]
      .join("\n")
      .toLowerCase();
    for (const s of FORBIDDEN_UI_STRINGS) {
      expect(blob).not.toContain(s.toLowerCase());
    }
    expect(blob).not.toContain("vercel");
  });
});
