import { approx } from "./nest";

export type FinishPreset = {
  id: string;
  label: string;
  w?: number;
  h?: number;
};

/** Shortcut labels only — any typed W×H still plans. */
export const FINISH_PRESETS: FinishPreset[] = [
  { id: "custom", label: "Custom" },
  { id: "bizcard", label: "Business card 3.5×2", w: 3.5, h: 2 },
  { id: "postcard", label: "Postcard 4×6", w: 4, h: 6 },
  { id: "rack", label: "Rack card 4×9", w: 4, h: 9 },
  { id: "5x7", label: "5×7", w: 5, h: 7 },
  { id: "digest", label: "Digest 5.5×8.5", w: 5.5, h: 8.5 },
  { id: "6x9", label: "6×9", w: 6, h: 9 },
  { id: "letter", label: "Letter 8.5×11", w: 8.5, h: 11 },
  { id: "legal", label: "Legal 8.5×14", w: 8.5, h: 14 },
  { id: "tabloid", label: "Tabloid 11×17", w: 11, h: 17 },
];

export function matchFinishPreset(w: number, h: number): string {
  for (const p of FINISH_PRESETS) {
    if (p.w == null || p.h == null) continue;
    if (
      (approx(w, p.w) && approx(h, p.h)) ||
      (approx(w, p.h) && approx(h, p.w))
    ) {
      return p.id;
    }
  }
  return "custom";
}

export function presetById(id: string): FinishPreset | undefined {
  return FINISH_PRESETS.find((p) => p.id === id);
}
