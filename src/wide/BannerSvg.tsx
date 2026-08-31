import type { GrommetPlan } from "./grommets";
import { formatInches } from "./grommets";

const PURPLE = "#522E90";
const RED = "#EE3E42";
const PAPER = "#fbf9fe";

export function BannerSvg({ plan }: { plan: GrommetPlan }) {
  const { widthIn, heightIn, points, total } = plan;
  const pad = 1.4;
  const vbW = widthIn + pad * 2;
  const vbH = heightIn + pad * 2;
  const r = Math.min(widthIn, heightIn) * 0.035;
  const dot = Math.max(0.22, Math.min(0.55, r));
  const label = `${formatInches(widthIn)} by ${formatInches(heightIn)} inch banner, ${total} grommets`;

  return (
    <figure className="mt-3">
      <figcaption className="mb-2 text-sm font-semibold">
        Banner · {formatInches(widthIn)}×{formatInches(heightIn)} in · {total} grommets
      </figcaption>
      <svg
        viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
        role="img"
        aria-label={label}
        className="w-full max-w-full"
      >
        <rect
          x={0}
          y={0}
          width={widthIn}
          height={heightIn}
          fill={PAPER}
          stroke={PURPLE}
          strokeWidth={0.12}
        />
        {points.map((p, i) => (
          <circle key={`${p.x}-${p.y}-${i}`} cx={p.x} cy={p.y} r={dot} fill={RED} />
        ))}
      </svg>
    </figure>
  );
}
