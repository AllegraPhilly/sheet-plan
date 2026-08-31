import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function src(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

describe("wide trial isolation and copy", () => {
  it("is a TRIAL shop helper with no dollars, franchise domain, or Fiery", () => {
    const blob = [
      src("./WideView.tsx"),
      src("./BannerSvg.tsx"),
      src("./grommets.ts"),
      src("./leftover.ts"),
    ].join("\n");
    expect(blob).toMatch(/TRIAL/);
    expect(blob).toMatch(/not a quote/i);
    expect(blob).toMatch(/ESTIMATE/);
    expect(blob).toMatch(/Summa S2 T140/);
    expect(blob).toMatch(/53\.1/);
    expect(blob).toMatch(/not a paper guillotine/i);
    expect(blob).toMatch(/SEAL 44 Ultra Plus/);
    expect(blob).toMatch(/fuzzy/i);
    expect(blob).toMatch(/300 vs 3000/);
    expect(blob).not.toMatch(/allegraphilly\.com/i);
    expect(blob).not.toMatch(/fiery/i);
    expect(blob).not.toMatch(/\$\d/);
    expect(blob).not.toMatch(/dollar quote/i);
    expect(blob).not.toMatch(/postage/i);
    expect(blob).not.toMatch(/ALLEGRA(?! Philadelphia)/);
    expect(blob).not.toMatch(/Latex 3\d{2,3}(?!\s*vs)/);
  });
});
