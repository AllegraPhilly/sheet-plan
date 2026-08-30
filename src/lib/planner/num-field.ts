/** Draft parse for ticket number inputs. Empty/invalid stays blank while editing. */

export function parseNumberDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Commit on blur only. Do not use `Math.max(1, Number(raw))` on every keystroke:
 * `Number("")` is 0, so a cleared Qty snaps to 1 and typing 300 becomes 1300.
 */
export function commitNumberField(
  raw: string,
  { min, fallback }: { min: number; fallback: number },
): number {
  const parsed = parseNumberDraft(raw);
  if (parsed === null) return Math.max(min, fallback);
  return Math.max(min, parsed);
}
