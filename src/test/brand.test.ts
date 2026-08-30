import { readFileSync } from "node:fs";
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
    expect(layout).toMatch(/Roboto/);
    expect(layout).toMatch(/Caveat/);
    expect(blob.toLowerCase()).not.toContain("trajan");
    expect(blob.toLowerCase()).not.toContain("barlow");
    expect(blob.toLowerCase()).not.toContain("ibm plex");
    expect(svg).toMatch(/Roboto/);
  });

  it("keeps INTERNAL / independently owned copy and no fake wordmark", () => {
    const shell = src("components/AppShell.tsx");
    const layout = src("app/layout.tsx");
    expect(layout).toMatch(/INTERNAL/);
    expect(shell).toMatch(/INTERNAL/);
    expect(shell).toMatch(/Independently owned and operated/);
    expect(shell).toMatch(/No franchise wordmark/);
    expect(shell.toLowerCase()).not.toContain("<img");
    expect(shell.toLowerCase()).not.toContain("wordmark.svg");
    expect(shell.toLowerCase()).not.toContain("logo.svg");
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
