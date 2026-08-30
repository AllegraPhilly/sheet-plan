import { applyMixedDefaults } from "./ticket-text";
import { approx } from "./nest";
import type { JobInput } from "./types";

export type FinishPreset = {
  id: string;
  label: string;
  w?: number;
  h?: number;
  /** Fills fold/bind/sides. Not a size whitelist — typed W×H still plans. */
  booklet?: boolean;
};

/** Shortcut labels only — any typed W×H still plans. */
export const FINISH_PRESETS: FinishPreset[] = [
  { id: "custom", label: "Custom" },
  { id: "bizcard", label: "Business card 3.5×2", w: 3.5, h: 2 },
  { id: "postcard", label: "Postcard 4×6", w: 4, h: 6 },
  { id: "rack", label: "Rack card 4×9", w: 4, h: 9 },
  { id: "5x7", label: "5×7", w: 5, h: 7 },
  { id: "digest", label: "Digest 5.5×8.5", w: 5.5, h: 8.5 },
  { id: "digest-booklet", label: "Digest booklet 5.5×8.5", w: 5.5, h: 8.5, booklet: true },
  { id: "6x9", label: "6×9", w: 6, h: 9 },
  { id: "letter", label: "Letter 8.5×11", w: 8.5, h: 11 },
  { id: "letter-booklet", label: "Letter booklet 8.5×11", w: 8.5, h: 11, booklet: true },
  { id: "legal", label: "Legal 8.5×14", w: 8.5, h: 14 },
  { id: "tabloid", label: "Tabloid 11×17", w: 11, h: 17 },
];

function dimsMatchPreset(w: number, h: number, p: FinishPreset): boolean {
  if (p.w == null || p.h == null) return false;
  return (approx(w, p.w) && approx(h, p.h)) || (approx(w, p.h) && approx(h, p.w));
}

function isBookletTicket(job?: Pick<JobInput, "bind" | "fold" | "sides">): boolean {
  return job?.bind === "saddle" && job.fold === "half" && job.sides === 2;
}

export function matchFinishPreset(
  w: number,
  h: number,
  job?: Pick<JobInput, "bind" | "fold" | "sides">,
): string {
  if (isBookletTicket(job)) {
    for (const p of FINISH_PRESETS) {
      if (!p.booklet) continue;
      if (dimsMatchPreset(w, h, p)) return p.id;
    }
  }
  for (const p of FINISH_PRESETS) {
    if (p.booklet) continue;
    if (dimsMatchPreset(w, h, p)) return p.id;
  }
  return "custom";
}

export function presetById(id: string): FinishPreset | undefined {
  return FINISH_PRESETS.find((p) => p.id === id);
}

/** Letter / digest flats share W×H with booklet shortcuts. */
function bookletSized(w: number, h: number): boolean {
  return (
    (approx(w, 8.5) && approx(h, 11)) ||
    (approx(w, 11) && approx(h, 8.5)) ||
    (approx(w, 5.5) && approx(h, 8.5)) ||
    (approx(w, 8.5) && approx(h, 5.5))
  );
}

/** Fill W×H (and booklet bind/fold/sides). Pages stay operator-entered. */
export function applyFinishPreset(job: JobInput, preset: FinishPreset): JobInput {
  if (preset.w == null || preset.h == null) return job;
  let next: JobInput = { ...job, finishW: preset.w, finishH: preset.h };
  if (preset.booklet) {
    next.fold = "half";
    next.bind = "saddle";
    next.sides = 2;
    if (next.pages == null || !Number.isFinite(next.pages)) next.pages = 8;
    if (next.color === "mixed") next = applyMixedDefaults(next);
  } else if (next.bind === "saddle" && bookletSized(preset.w, preset.h)) {
    next.bind = "none";
    next.fold = "none";
  }
  return next;
}
