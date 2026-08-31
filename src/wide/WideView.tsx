"use client";

import { useMemo, useState } from "react";
import { BannerSvg } from "./BannerSvg";
import { formatInches, planGrommets, type EdgeId } from "./grommets";
import {
  COMMON_CORE_OD_IN,
  SUMMA_USABLE_WIDTH_IN,
  caliperLengthInches,
  formatLength,
  inchesToFeetYards,
  remainingByWeight,
  scaleFromFullRoll,
  thicknessToInches,
  type ThicknessUnit,
} from "./leftover";
import { parseDraft } from "./parse";

const EDGES: { id: EdgeId; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

export function WideView() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--stamp)]">
        TRIAL — shop helper, not a quote
      </p>
      <h2 className="ticket-head">WIDE</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--stamp)]">
        Shop helper, not a quote. May get deleted later.
      </p>
      <p className="mt-2 text-sm opacity-80">
        Grommet spacing and leftover vinyl on a roll so the floor can see the
        math. No dollars.
      </p>

      <section className="ticket mt-4 p-3 sm:p-4">
        <h3 className="ticket-head">Shop notes</h3>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>
            Banners and vinyl cut on the <strong>Summa S2 T140</strong> —{" "}
            {SUMMA_USABLE_WIDTH_IN} in usable, <strong>not a paper guillotine</strong>.
          </li>
          <li>
            Laminate on the <strong>SEAL 44 Ultra Plus</strong>.
          </li>
          <li>
            HP Latex is <strong>fuzzy</strong> here (300 vs 3000). Do not treat a
            Latex model as certain.
          </li>
        </ul>
      </section>

      <GrommetCard />
      <LeftoverCard />
    </div>
  );
}

function GrommetCard() {
  const [width, setWidth] = useState("36");
  const [height, setHeight] = useState("24");
  const [inset, setInset] = useState("1");
  const [maxSpacing, setMaxSpacing] = useState("24");
  const [corners, setCorners] = useState(true);
  const [extra, setExtra] = useState<Record<EdgeId, string>>({
    top: "",
    bottom: "",
    left: "",
    right: "",
  });

  const result = useMemo(() => {
    const widthIn = parseDraft(width);
    const heightIn = parseDraft(height);
    const insetIn = parseDraft(inset);
    const maxSpacingIn = parseDraft(maxSpacing);
    if (widthIn == null || heightIn == null || insetIn == null || maxSpacingIn == null) {
      return { ok: false as const, error: "Enter finish W×H, inset, and max spacing." };
    }
    return planGrommets({
      widthIn,
      heightIn,
      insetIn,
      maxSpacingIn,
      corners,
      extra: {
        top: parseDraft(extra.top) ?? 0,
        bottom: parseDraft(extra.bottom) ?? 0,
        left: parseDraft(extra.left) ?? 0,
        right: parseDraft(extra.right) ?? 0,
      },
    });
  }, [width, height, inset, maxSpacing, corners, extra]);

  return (
    <section className="ticket mt-4 p-3 sm:p-4">
      <h3 className="ticket-head">BANNER GROMMETS</h3>
      <p className="mt-1 text-sm opacity-70">
        Corners first. Then even gaps so each gap is at most the max spacing.
        Positions are inches from a corner — tape-measure ready.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Num label="Finish W (in)" value={width} onChange={setWidth} />
        <Num label="Finish H (in)" value={height} onChange={setHeight} />
        <Num label="Inset from edge (in)" value={inset} onChange={setInset} />
        <Num label="Max spacing (in)" value={maxSpacing} onChange={setMaxSpacing} />
      </div>

      <label className="mt-4 flex min-h-12 items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-6 w-6 accent-[var(--purple)]"
          checked={corners}
          onChange={(e) => setCorners(e.target.checked)}
        />
        Put grommets in the corners
      </label>

      <p className="mt-3 text-sm font-semibold">Optional extra along an edge</p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        {EDGES.map((edge) => (
          <Num
            key={edge.id}
            label={`${edge.label} extra`}
            value={extra[edge.id]}
            onChange={(v) => setExtra((s) => ({ ...s, [edge.id]: v }))}
            placeholder="0"
          />
        ))}
      </div>

      {!result.ok ? (
        <p className="mt-4 text-sm text-[var(--stamp)]">{result.error}</p>
      ) : (
        <div className="mt-4">
          <p className="text-lg font-bold text-[var(--purple)]">
            {result.total} grommets total
          </p>
          <ul className="mt-2 text-sm">
            {EDGES.map((edge) => {
              const row = result.edges[edge.id];
              const gap =
                row.gapIn == null ? "—" : `${formatInches(row.gapIn)} in gap`;
              return (
                <li key={edge.id} className="rule py-2">
                  <span className="font-semibold">
                    {edge.label}: {row.count}
                  </span>
                  <span className="opacity-70"> · {gap}</span>
                  {row.fromCornerIn.length > 0 && (
                    <p className="mt-1 font-normal opacity-80">
                      {row.fromCornerLabel}:{" "}
                      {row.fromCornerIn.map(formatInches).join(", ")} in
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <BannerSvg plan={result} />
        </div>
      )}
    </section>
  );
}

function LeftoverCard() {
  const [coreOd, setCoreOd] = useState(String(COMMON_CORE_OD_IN));
  const [outerOd, setOuterOd] = useState("");
  const [thickness, setThickness] = useState("");
  const [thicknessUnit, setThicknessUnit] = useState<ThicknessUnit>("mils");

  const [fullOd, setFullOd] = useState("");
  const [fullLengthFt, setFullLengthFt] = useState("");

  const [fullWeight, setFullWeight] = useState("");
  const [coreWeight, setCoreWeight] = useState("");
  const [partialWeight, setPartialWeight] = useState("");
  const [weightFullLengthFt, setWeightFullLengthFt] = useState("");

  const core = parseDraft(coreOd);

  const caliper = useMemo(() => {
    const D = parseDraft(outerOd);
    const tIn = thicknessToInches(parseDraft(thickness) ?? Number.NaN, thicknessUnit);
    if (core == null || D == null || tIn == null) return null;
    const inches = caliperLengthInches(D, core, tIn);
    return inches == null ? null : inchesToFeetYards(inches);
  }, [outerOd, core, thickness, thicknessUnit]);

  const scaled = useMemo(() => {
    const D = parseDraft(outerOd);
    const Dfull = parseDraft(fullOd);
    const L = parseDraft(fullLengthFt);
    if (core == null || D == null || Dfull == null || L == null) return null;
    const feet = scaleFromFullRoll(D, Dfull, core, L);
    return feet == null ? null : { feet, yards: feet / 3 };
  }, [outerOd, fullOd, fullLengthFt, core]);

  const weighed = useMemo(() => {
    const fullW = parseDraft(fullWeight);
    const emptyW = parseDraft(coreWeight);
    const partW = parseDraft(partialWeight);
    const L = parseDraft(weightFullLengthFt);
    if (fullW == null || emptyW == null || partW == null || L == null) return null;
    const feet = remainingByWeight(fullW, emptyW, partW, L);
    return feet == null ? null : { feet, yards: feet / 3 };
  }, [fullWeight, coreWeight, partialWeight, weightFullLengthFt]);

  return (
    <section className="ticket mt-4 p-3 sm:p-4">
      <h3 className="ticket-head">LEFTOVER ON A ROLL</h3>
      <p className="mt-1 text-sm font-semibold text-[var(--stamp)]">
        Leftover ESTIMATE. Wound tightness varies. Not a cut file.
      </p>
      <p className="mt-2 text-sm opacity-70">
        Summa usable width {SUMMA_USABLE_WIDTH_IN} in is a hint, not a lock. 3 in
        core is common.
      </p>

      <Num className="mt-3" label="Core outer diameter (in)" value={coreOd} onChange={setCoreOd} />

      <h4 className="mt-5 text-sm font-bold uppercase tracking-widest text-[var(--purple)]">
        1. Caliper / partial
      </h4>
      <p className="mt-1 text-xs opacity-60">
        Length ≈ π(D² − d²) / (4t). Thickness blank until you type it.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Num label="Outer diameter (in)" value={outerOd} onChange={setOuterOd} placeholder="partial OD" />
        <Num
          label={thicknessUnit === "mils" ? "Thickness (mils)" : "Thickness (in)"}
          value={thickness}
          onChange={setThickness}
          placeholder="type it"
        />
      </div>
      <label className="mt-3 block text-sm font-semibold">
        Thickness unit
        <select
          className="field"
          value={thicknessUnit}
          onChange={(e) => setThicknessUnit(e.target.value as ThicknessUnit)}
        >
          <option value="mils">Mils (0.001 in)</option>
          <option value="inches">Inches</option>
        </select>
      </label>
      {caliper ? (
        <Estimate
          feet={caliper.feet}
          yards={caliper.yards}
          note="Caliper estimate — wound tightness varies."
        />
      ) : (
        <p className="mt-2 text-sm opacity-60">Type outer diameter and thickness to estimate.</p>
      )}

      <h4 className="mt-5 text-sm font-bold uppercase tracking-widest text-[var(--purple)]">
        2. Full-roll reference
      </h4>
      <p className="mt-1 text-xs opacity-60">
        If you also know a known-full length at a measured OD, scale remaining
        from OD. More accurate than thickness.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Num label="Known-full OD (in)" value={fullOd} onChange={setFullOd} />
        <Num label="Known-full length (ft)" value={fullLengthFt} onChange={setFullLengthFt} />
      </div>
      {scaled ? (
        <Estimate
          feet={scaled.feet}
          yards={scaled.yards}
          note="Scaled from full-roll OD. Still an estimate."
        />
      ) : (
        <p className="mt-2 text-sm opacity-60">
          Uses the partial OD above plus a known-full OD and length.
        </p>
      )}

      <h4 className="mt-5 text-sm font-bold uppercase tracking-widest text-[var(--purple)]">
        3. Weight
      </h4>
      <p className="mt-1 text-xs opacity-60">
        Remaining = full length × (partial − core) / (full − core).
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Num label="Full-roll weight" value={fullWeight} onChange={setFullWeight} />
        <Num label="Empty-core weight" value={coreWeight} onChange={setCoreWeight} />
        <Num label="Partial-roll weight" value={partialWeight} onChange={setPartialWeight} />
        <Num label="Full-roll length (ft)" value={weightFullLengthFt} onChange={setWeightFullLengthFt} />
      </div>
      {weighed ? (
        <Estimate
          feet={weighed.feet}
          yards={weighed.yards}
          note="Weight estimate — wound tightness and moisture vary."
        />
      ) : (
        <p className="mt-2 text-sm opacity-60">Type all four weights/length fields to estimate.</p>
      )}
    </section>
  );
}

function Estimate({ feet, yards, note }: { feet: number; yards: number; note: string }) {
  return (
    <div className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--purple)_6%,white)] p-3">
      <p className="text-lg font-bold text-[var(--purple)]">
        {formatLength(feet)} ft · {formatLength(yards)} yd
      </p>
      <p className="mt-1 text-xs opacity-70">{note}</p>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm font-semibold ${className ?? ""}`}>
      {label}
      <input
        type="text"
        inputMode="decimal"
        className="field"
        value={value}
        placeholder={placeholder}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
