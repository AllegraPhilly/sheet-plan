import { layoutFromNest, type SheetLayout } from "@/lib/planner/sheet-layout";
import type { JobInput, NestResult } from "@/lib/planner/types";

const INK = "#1a1612";
const SHEET = "#fff8ea";
const PIECE = "#ffffff";
const GRIPPER = "#f0d48a";
const CUT = "#b42318";

function layoutCaption(layout: SheetLayout, isRecommended: boolean): string {
  const who = isRecommended ? "recommended" : "other parent";
  return `${layout.parent.label} parent, ${layout.nUp}-up ${who}.`;
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
  const { parent, pieces, cuts, gripper } = layout;
  const padX = 0.4;
  const padTop = 1.55;
  const padBottom = 0.45;
  const vbW = parent.w + padX * 2;
  const vbH = parent.h + padTop + padBottom;
  const titleSize = Math.min(1.05, Math.max(0.72, parent.w * 0.08));

  const notes: string[] = [];
  if (gripper) notes.push("Light strip is gripper (0.25 in).");
  if (layout.trimApplied) notes.push("Trim 0.125 in around each finish.");
  if (cuts.length === 1) notes.push("Dashed line is the Challenge cut.");
  else if (cuts.length > 1) notes.push("Dashed lines are Challenge cuts.");

  return (
    <figure id="sheet-layout" className="sheet-layout mt-4 scroll-mt-4" aria-label={layoutCaption(layout, isRecommended)}>
      <figcaption className="mb-2 text-sm font-semibold">
        {parent.label}
        <span className="font-normal opacity-70">
          {" "}
          · {layout.nUp}-up
          {isRecommended ? " · recommended" : " · other parent"}
        </span>
      </figcaption>
      <svg
        viewBox={`${-padX} ${-padTop} ${vbW} ${vbH}`}
        role="img"
        aria-label={layoutCaption(layout, isRecommended)}
        className="sheet-layout-svg w-full max-w-[22rem]"
      >
        <text
          x={parent.w / 2}
          y={-0.4}
          textAnchor="middle"
          fill={INK}
          fontSize={titleSize}
          fontWeight={800}
          fontFamily="Barlow Condensed, sans-serif"
        >
          {parent.label}
        </text>
        <rect
          x={0}
          y={0}
          width={parent.w}
          height={parent.h}
          fill={SHEET}
          stroke={INK}
          strokeWidth={0.12}
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
              strokeWidth={0.04}
            />
            <text
              x={gripper.x + gripper.w / 2}
              y={gripper.y + gripper.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={INK}
              fontSize={Math.min(0.22, gripper.h * 0.7)}
              fontWeight={700}
              fontFamily="IBM Plex Sans, sans-serif"
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
            strokeWidth={0.08}
          />
        ))}
        {cuts.map((c, i) => (
          <line
            key={`cut-${i}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={CUT}
            strokeWidth={0.14}
            strokeDasharray="0.35 0.22"
            strokeLinecap="square"
          />
        ))}
      </svg>
      {notes.length > 0 && (
        <p className="mt-2 text-sm opacity-80">{notes.join(" ")}</p>
      )}
    </figure>
  );
}
