/** Banner grommet spacing for the wide-format trial helper. Not a quote. */

export type EdgeId = "top" | "bottom" | "left" | "right";

export type GrommetInput = {
  widthIn: number;
  heightIn: number;
  insetIn: number;
  maxSpacingIn: number;
  corners: boolean;
  extra: Record<EdgeId, number>;
};

export type EdgePlan = {
  edge: EdgeId;
  count: number;
  /** Even gap along this edge. Null when the edge has fewer than two grommets. */
  gapIn: number | null;
  /** Tape-measure positions from the named corner, inches. */
  fromCornerIn: number[];
  fromCornerLabel: string;
};

export type GrommetPoint = {
  x: number;
  y: number;
  edges: EdgeId[];
};

export type GrommetPlan = {
  ok: true;
  widthIn: number;
  heightIn: number;
  insetIn: number;
  maxSpacingIn: number;
  corners: boolean;
  edges: Record<EdgeId, EdgePlan>;
  points: GrommetPoint[];
  total: number;
};

export type GrommetError = {
  ok: false;
  error: string;
};

export type GrommetResult = GrommetPlan | GrommetError;

const EDGES: EdgeId[] = ["top", "bottom", "left", "right"];

function extraCount(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
}

/** Smallest n ≥ 1 such that usable / n ≤ max. */
export function evenGaps(usable: number, maxSpacing: number): number {
  if (!(usable > 0) || !(maxSpacing > 0)) return 1;
  return Math.max(1, Math.ceil(usable / maxSpacing - 1e-12));
}

export function grommetsOnEdge(
  usable: number,
  maxSpacing: number,
  corners: boolean,
  extra: number,
): number {
  const extras = extraCount(extra);
  if (!(usable > 0) || !(maxSpacing > 0)) {
    return (corners ? 2 : 0) + extras;
  }
  const withCorners = evenGaps(usable, maxSpacing) + 1;
  const intermediates = Math.max(0, withCorners - 2);
  return (corners ? withCorners : intermediates) + extras;
}

/**
 * Place `count` grommets on a line from `inset` to `inset + usable`.
 * Corners on: endpoints included, even gaps.
 * Corners off: interior only, even gaps so nothing sits on a corner.
 */
export function placeAlongEdge(
  count: number,
  inset: number,
  usable: number,
  corners: boolean,
): number[] {
  if (count <= 0 || !(usable >= 0)) return [];
  if (count === 1) {
    return [inset + usable / 2];
  }
  if (corners) {
    const gap = usable / (count - 1);
    return Array.from({ length: count }, (_, i) => inset + i * gap);
  }
  const gap = usable / (count + 1);
  return Array.from({ length: count }, (_, i) => inset + (i + 1) * gap);
}

function keyOf(x: number, y: number): string {
  return `${x.toFixed(4)},${y.toFixed(4)}`;
}

function cornerLabel(edge: EdgeId): string {
  switch (edge) {
    case "top":
      return "from top-left along top";
    case "bottom":
      return "from bottom-left along bottom";
    case "left":
      return "from top-left along left";
    case "right":
      return "from top-right along right";
  }
}

export function planGrommets(input: GrommetInput): GrommetResult {
  const widthIn = input.widthIn;
  const heightIn = input.heightIn;
  const insetIn = input.insetIn;
  const maxSpacingIn = input.maxSpacingIn;
  const corners = input.corners;

  if (!Number.isFinite(widthIn) || !Number.isFinite(heightIn) || widthIn <= 0 || heightIn <= 0) {
    return { ok: false, error: "Finish W and H must be greater than 0 in." };
  }
  if (!Number.isFinite(insetIn) || insetIn < 0) {
    return { ok: false, error: "Inset must be 0 in or more." };
  }
  if (!Number.isFinite(maxSpacingIn) || maxSpacingIn <= 0) {
    return { ok: false, error: "Max spacing must be greater than 0 in." };
  }
  if (widthIn <= insetIn * 2 || heightIn <= insetIn * 2) {
    return { ok: false, error: "Finish is smaller than twice the inset — grommets would sit off the banner." };
  }

  const horizUsable = widthIn - insetIn * 2;
  const vertUsable = heightIn - insetIn * 2;

  const counts: Record<EdgeId, number> = {
    top: grommetsOnEdge(horizUsable, maxSpacingIn, corners, input.extra.top),
    bottom: grommetsOnEdge(horizUsable, maxSpacingIn, corners, input.extra.bottom),
    left: grommetsOnEdge(vertUsable, maxSpacingIn, corners, input.extra.left),
    right: grommetsOnEdge(vertUsable, maxSpacingIn, corners, input.extra.right),
  };

  const along: Record<EdgeId, number[]> = {
    top: placeAlongEdge(counts.top, insetIn, horizUsable, corners),
    bottom: placeAlongEdge(counts.bottom, insetIn, horizUsable, corners),
    left: placeAlongEdge(counts.left, insetIn, vertUsable, corners),
    right: placeAlongEdge(counts.right, insetIn, vertUsable, corners),
  };

  const pointsByKey = new Map<string, GrommetPoint>();

  function add(x: number, y: number, edge: EdgeId) {
    const key = keyOf(x, y);
    const existing = pointsByKey.get(key);
    if (existing) {
      if (!existing.edges.includes(edge)) existing.edges.push(edge);
      return;
    }
    pointsByKey.set(key, { x, y, edges: [edge] });
  }

  for (const x of along.top) add(x, insetIn, "top");
  for (const x of along.bottom) add(x, heightIn - insetIn, "bottom");
  for (const y of along.left) add(insetIn, y, "left");
  for (const y of along.right) add(widthIn - insetIn, y, "right");

  const points = [...pointsByKey.values()];

  const edges = Object.fromEntries(
    EDGES.map((edge) => {
      const positions = along[edge];
      const gapIn =
        positions.length >= 2 ? Math.abs(positions[1]! - positions[0]!) : null;
      const plan: EdgePlan = {
        edge,
        count: counts[edge],
        gapIn,
        fromCornerIn: positions,
        fromCornerLabel: cornerLabel(edge),
      };
      return [edge, plan];
    }),
  ) as Record<EdgeId, EdgePlan>;

  return {
    ok: true,
    widthIn,
    heightIn,
    insetIn,
    maxSpacingIn,
    corners,
    edges,
    points,
    total: points.length,
  };
}

export function formatInches(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
