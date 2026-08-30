import { alternateParentHint } from "@/lib/planner/cut-count";
import { layoutFromNest, type SheetLayout } from "@/lib/planner/sheet-layout";
import type { JobInput, NestResult } from "@/lib/planner/types";

const INK = "#522e90";
const SHEET = "#ffffff";
const PIECE = "#fbf9fe";
const GRIPPER = "#fcba30";
const CUT = "#ee3e42";
const FOLD = "#522e90";

function layoutAria(layout: SheetLayout, nest: NestResult, isRecommended: boolean): string {
  const who = isRecommended ? "recommended" : "other parent";
  const kind = layout.fold ? "saddle signature" : `${layout.nUp}-up`;
  const extra = isRecommended ? layout.caption : alternateParentHint(nest);
  return `${layout.parent.label} parent, ${kind} ${who}. ${extra}`;
}

export function SheetLayoutSvg({
  finish,
  nest,
  isRecommended,
}: {
  finish: Pick<JobInput, "finishW" | "finishH">;
  nest: NestResult;
  isRecommended: boolean;
}) {
  const layout = layoutFromNest(finish, nest);
  const { parent, pieces, cuts, gripper, fold, folds } = layout;
  const foldLines = folds?.length ? folds : fold ? [fold] : [];
  const padX = 0.55;
  const padTop = 2.25;
  const padBottom = 0.55;
  const vbW = parent.w + padX * 2;
  const vbH = parent.h + padTop + padBottom;
  const titleSize = Math.min(1.05, Math.max(0.72, parent.w * 0.07));
  const totalSize = Math.min(0.82, Math.max(0.58, parent.w * 0.055));
  const badgeR = Math.min(0.42, Math.max(0.32, Math.min(parent.w, parent.h) * 0.035));

  return (
    <figure id="sheet-layout" className="sheet-layout mt-4 scroll-mt-4" aria-label={layoutAria(layout, nest, isRecommended)}>
      <figcaption className="mb-2 text-sm font-semibold leading-snug">
        {parent.label}
        <span className="font-normal opacity-70">
          {" "}
          · {layout.fold ? "saddle signature" : `${layout.nUp}-up`}
          {isRecommended ? " · recommended" : " · other parent"}
        </span>
        {isRecommended ? (
          <span className="mt-1 block font-normal">{layout.caption}</span>
        ) : (
          <span className="mt-1 block font-normal">{alternateParentHint(nest)}</span>
        )}
      </figcaption>
      <svg
        viewBox={`${-padX} ${-padTop} ${vbW} ${vbH}`}
        role="img"
        aria-label={layoutAria(layout, nest, isRecommended)}
        className="sheet-layout-svg w-full max-w-[22rem]"
      >
        <text
          x={parent.w / 2}
          y={-1.15}
          textAnchor="middle"
          fill={INK}
          fontSize={titleSize}
          fontWeight={800}
          fontFamily="Roboto, sans-serif"
        >
          {parent.label}
        </text>
        <text
          x={parent.w / 2}
          y={-0.38}
          textAnchor="middle"
          fill={INK}
          fontSize={totalSize}
          fontWeight={800}
          fontFamily="Roboto, sans-serif"
        >
          {isRecommended ? `${layout.nUp}-up` : "other parent"}
        </text>
        <rect
          x={0}
          y={0}
          width={parent.w}
          height={parent.h}
          fill={SHEET}
          stroke={INK}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {gripper && (
          <g>
            <rect
              x={gripper.x}
              y={gripper.y}
              width={gripper.w}
              height={gripper.h}
              fill={GRIPPER}
              stroke={INK}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={gripper.x + gripper.w / 2}
              y={gripper.y + gripper.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={INK}
              fontSize={Math.min(0.22, gripper.h * 0.7)}
              fontWeight={700}
              fontFamily="Roboto, sans-serif"
            >
              gripper
            </text>
          </g>
        )}
        {pieces.map((p, i) => (
          <rect
            key={`finish-${i}`}
            x={p.finish.x}
            y={p.finish.y}
            width={p.finish.w}
            height={p.finish.h}
            fill={PIECE}
            stroke={INK}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {foldLines.map((line, i) => (
          <g key={`fold-${i}-${line.x1}-${line.y1}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={FOLD}
              strokeWidth={3}
              strokeDasharray="6 5"
              strokeLinecap="square"
              vectorEffect="non-scaling-stroke"
            />
            {i === 0 && (
              <text
                x={(line.x1 + line.x2) / 2 + 0.35}
                y={Math.min(line.y1, line.y2) + 1.1}
                fill={INK}
                fontSize={Math.min(0.55, parent.w * 0.045)}
                fontWeight={800}
                fontFamily="Roboto, sans-serif"
              >
                fold
              </text>
            )}
          </g>
        ))}
        {cuts.map((c) => {
          const midX = (c.x1 + c.x2) / 2;
          const midY = (c.y1 + c.y2) / 2;
          const bx = c.axis === "v" ? c.x1 : Math.min(c.x1, c.x2) + badgeR * 1.1;
          const by = c.axis === "h" ? c.y1 : Math.min(c.y1, c.y2) + badgeR * 1.1;
          return (
            <g key={`cut-${c.n}-${c.axis}-${midX}-${midY}`}>
              <line
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke={CUT}
                strokeWidth={3}
                strokeDasharray="10 7"
                strokeLinecap="square"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={bx}
                cy={by}
                r={badgeR}
                fill={CUT}
                stroke={INK}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={bx}
                y={by}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff8ea"
                fontSize={badgeR * 1.15}
                fontWeight={800}
                fontFamily="Roboto, sans-serif"
              >
                {c.n}
              </text>
            </g>
          );
        })}
      </svg>
      {layout.needsFileRotate && (
        <p className="mt-2 text-sm text-[var(--stamp)]">
          Prepress would have to rotate the file. Not the default pick.
        </p>
      )}
      {gripper && !layout.needsFileRotate && (
        <p className="mt-2 text-sm opacity-80">Light strip is gripper (0.25 in). One gripper edge.</p>
      )}
      {layout.trimApplied && !layout.needsFileRotate && (
        <p className="mt-1 text-sm opacity-80">Trim 0.125 in around each finish. Even gutters, through-cuts.</p>
      )}
    </figure>
  );
}
