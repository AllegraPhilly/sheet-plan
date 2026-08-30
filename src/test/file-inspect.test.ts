import { describe, expect, it } from "vitest";
import {
  inferFinishFromMedia,
  inspectPdfPageBox,
  pixelsToInches,
  pointsToInches,
} from "@/lib/inspect/file-inspect";

describe("file inspect math", () => {
  it("converts PDF points and image pixels", () => {
    expect(pointsToInches(612)).toBe(8.5);
    expect(pointsToInches(792)).toBe(11);
    expect(pixelsToInches(2550, 300)).toBe(8.5);
    expect(pixelsToInches(3300, 300)).toBe(11);
  });

  it("reads a letter PDF media box", () => {
    const info = inspectPdfPageBox("card.pdf", 2, 612, 792);
    expect(info.widthIn).toBe(8.5);
    expect(info.heightIn).toBe(11);
    expect(info.pages).toBe(2);
    expect(inferFinishFromMedia(8.5, 11).label).toBe("8.5×11");
  });
});
