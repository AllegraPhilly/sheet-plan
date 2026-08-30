export type InspectedFile = {
  name: string;
  mime: string;
  pages: number;
  widthIn: number | null;
  heightIn: number | null;
  source: "pdf" | "image" | "unknown";
  notes: string[];
};

const DEFAULT_DPI = 300;

export function pixelsToInches(px: number, dpi = DEFAULT_DPI): number {
  return Math.round((px / dpi) * 1000) / 1000;
}

export function pointsToInches(pt: number): number {
  return Math.round((pt / 72) * 1000) / 1000;
}

export function inferFinishFromMedia(widthIn: number, heightIn: number): { w: number; h: number; label: string } {
  const a = Math.min(widthIn, heightIn);
  const b = Math.max(widthIn, heightIn);
  const catalog: { w: number; h: number; label: string }[] = [
    { w: 8.5, h: 11, label: "8.5×11" },
    { w: 11, h: 17, label: "11×17" },
    { w: 12, h: 18, label: "12×18" },
    { w: 13, h: 19, label: "13×19" },
    { w: 8.5, h: 14, label: "8.5×14" },
    { w: 5, h: 7, label: "5×7" },
    { w: 4.25, h: 6, label: "4.25×6" },
  ];
  for (const c of catalog) {
    if (Math.abs(a - Math.min(c.w, c.h)) < 0.08 && Math.abs(b - Math.max(c.w, c.h)) < 0.08) {
      return c;
    }
  }
  return { w: widthIn, h: heightIn, label: `${widthIn}×${heightIn}` };
}

export async function inspectImageBitmap(
  name: string,
  mime: string,
  widthPx: number,
  heightPx: number,
  dpi = DEFAULT_DPI,
): Promise<InspectedFile> {
  const widthIn = pixelsToInches(widthPx, dpi);
  const heightIn = pixelsToInches(heightPx, dpi);
  return {
    name,
    mime,
    pages: 1,
    widthIn,
    heightIn,
    source: "image",
    notes: [`Assumed ${dpi} dpi for pixel art. Confirm finish size on the ticket.`],
  };
}

export function inspectPdfPageBox(
  name: string,
  pageCount: number,
  widthPt: number,
  heightPt: number,
): InspectedFile {
  return {
    name,
    mime: "application/pdf",
    pages: pageCount,
    widthIn: pointsToInches(widthPt),
    heightIn: pointsToInches(heightPt),
    source: "pdf",
    notes: pageCount > 1 ? [`${pageCount} pages — planner uses page-1 media box.`] : [],
  };
}
