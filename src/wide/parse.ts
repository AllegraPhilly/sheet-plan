/** Draft parse for wide-helper number fields. Isolated from planner ticket math. */

export function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
