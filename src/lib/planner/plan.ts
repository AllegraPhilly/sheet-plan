import { machineById, neverRouteIds } from "../machines";
import { emptyCuts } from "./cut-count";
import { isClassicLetterTabloid, nestOnParent, rankParents } from "./nest";
import { parseJobText } from "./parse-job";
import { isCoverStock, isSaddleJob, nestSaddle, saddlePageError } from "./saddle";
import {
  PARENTS,
  VERSANT_PLAN_MAX,
  type JobInput,
  type ProductionPlan,
  type RouteStep,
} from "./types";

const SKIP = new Set(neverRouteIds());

function step(id: string, action: string, confidence: RouteStep["confidence"] = "confident"): RouteStep | null {
  if (SKIP.has(id)) return null;
  const m = machineById(id);
  if (!m || m.confidence === "skip") return null;
  if (confidence === "confident" && m.confidence !== "confident") return null;
  return { machineId: id, name: m.name, action, confidence };
}

export function mustStep(id: string, action: string): RouteStep {
  const s = step(id, action, "confident");
  if (!s) {
    throw new Error(`Confident machine missing: ${id}`);
  }
  return s;
}

export function choosePress(job: JobInput): { press: RouteStep; also: RouteStep[] } {
  const also: RouteStep[] = [];
  if (job.substrate === "vinyl") {
    return { press: mustStep("summa-s2t140", "Cut vinyl (53.1 in). Not a paper guillotine."), also };
  }
  if (job.substrate === "garment") {
    return { press: mustStep("heat-press-hp3808in1", "Heat-apply transfer."), also };
  }
  if (job.substrate === "envelope") {
    return {
      press: mustStep("xante-enpress", "Print envelopes."),
      also: [mustStep("xante-x36", "Overflow / specialty envelope.")],
    };
  }
  if (job.substrate === "uv") {
    return { press: mustStep("xante-uv-unlimited", "UV specialty graphics."), also };
  }

  const color = job.color === "bw" ? "bw" : "color";
  if (color === "bw") {
    const overflow = step("kyocera-taskalfa-2554ci", "Short-run B&W overflow only.", "confident");
    if (overflow && job.qty < 50) also.push(overflow);
    return { press: mustStep("accurio-6120", "B&W production impressions."), also };
  }

  const press = mustStep(
    "versant-4100",
    "Color production. Plan on parents ≤ 13×19.2 in (extra-long 13×47.2 is not a default parent).",
  );
  if (job.qty < 25) {
    const mfp = step("kyocera-taskalfa-2554ci", "Convenience / walk-up color.", "confident");
    if (mfp) also.push(mfp);
  }
  return { press, also };
}

export function finishingSteps(job: JobInput, recommendedNUp: number): RouteStep[] {
  const out: RouteStep[] = [];
  if (isSaddleJob(job)) {
    if (isCoverStock(job)) {
      out.push(mustStep("graphic-whizard-creasemaster-plus-ts", "Crease cover stock before fold."));
    }
    out.push(mustStep("baumfolder-714", "Fold: half (saddle signature)."));
    out.push(mustStep("salco-rapid-106e", "Saddle stitch on the 11×17 fold."));
    if (job.scannedOriginal) {
      out.unshift(mustStep("epson-expression-11000xl", "Scan original (tabloid flatbed)."));
    }
    return out;
  }
  if (recommendedNUp > 1 || job.finishW < 8.49 || job.finishH < 10.9) {
    if (job.substrate === "paper") {
      out.push(mustStep("challenge-305-crt", "Cut parent to finish. 30.5 in knife, 3.5 in clamp."));
    }
  }
  if (job.fold && job.fold !== "none") {
    if (job.stockHint && /cover|card|100#|80#c/.test(job.stockHint.toLowerCase())) {
      out.push(mustStep("graphic-whizard-creasemaster-plus-ts", "Crease before fold."));
    }
    out.push(mustStep("baumfolder-714", `Fold: ${job.fold}.`));
  }
  if (job.bind === "staple") out.push(mustStep("salco-rapid-106e", "Stitch / booklet staple."));
  if (job.bind === "coil") out.push(mustStep("rhin-o-tuff-od-4012", "Punch and bind."));
  if (job.bind === "drill") out.push(mustStep("challenge-eh3a", "Drill."));
  if (job.bind === "laminate") out.push(mustStep("seal-44-ultra-plus", "Laminate."));
  if (job.bind === "shrink") out.push(mustStep("minipack-replay-55", "Shrink wrap packs."));
  if (job.scannedOriginal) {
    out.unshift(mustStep("epson-expression-11000xl", "Scan original (tabloid flatbed)."));
  }
  return out;
}

export function buildPlan(job: JobInput, parsedFrom: ProductionPlan["parsedFrom"]): ProductionPlan {
  if (isSaddleJob(job)) {
    const pageErr = saddlePageError(job.pages);
    if (pageErr) throw new Error(pageErr);
  }

  const ranked =
    job.substrate === "paper" && !isSaddleJob(job) ? rankParents(job) : [];
  const recommended =
    isSaddleJob(job) && job.substrate === "paper"
      ? nestSaddle(job)
      : ranked[0] ??
        nestOnParent(job, PARENTS[0]) ??
        ({
          parent: PARENTS[0],
          nUp: 1,
          orientation: "same" as const,
          sheetTurned: false,
          needsFileRotate: false,
          cols: 1,
          rows: 1,
          exactTile: false,
          gripperApplied: false,
          trimApplied: false,
          saddle: false,
          sheetsToBuy: job.qty,
          impressions: job.qty * job.sides,
          buyScore: job.qty,
          usableW: 8.5,
          usableH: 11,
          cuts: emptyCuts("Non-paper path — no parent buy."),
        });

  const { press, also } = choosePress(job);
  const finishing = finishingSteps(job, recommended.nUp);

  const why: string[] = [];
  if (isSaddleJob(job) && job.substrate === "paper") {
    const pages = job.pages!;
    why.push(
      `Buy ${recommended.sheetsToBuy} parent 11×17 (${pages} pages ÷ 4 = ${pages / 4} sheets each × ${job.qty} booklets). Folded signature, not 8.5×11 2-up cut on the Challenge.`,
    );
    why.push(
      `${recommended.impressions} duplex clicks on ${press.name} (one 11×17 sheet = 4 pages).`,
    );
    why.push("Fold half on Baumfolder 714. Saddle stitch on Salco Rapid 106E.");
    if (isCoverStock(job)) {
      why.push("Cover stock — crease on Graphic Whizard before fold.");
    }
    why.push(recommended.cuts.why);
  } else if (job.substrate === "paper") {
    why.push(
      `Buy ${recommended.sheetsToBuy} parent ${recommended.parent.label} (${recommended.nUp}-up) — cheapest parent to purchase, not merely what is on the floor.`,
    );
    why.push(
      `${recommended.impressions} click${recommended.impressions === 1 ? "" : "s"} on ${press.name} (${job.sides === 2 ? "duplex" : "simplex"}).`,
    );
    if (recommended.exactTile) {
      if (isClassicLetterTabloid({ w: job.finishW, h: job.finishH }, recommended.parent)) {
        why.push(
          "Classic: finish 8.5×11 on 11×17 is an exact 2-up tile — turn the sheet, art stays the same way. No gripper, no trim. Challenge 305 CRT one click vs two on a larger parent.",
        );
      } else {
        why.push(
          `Exact ${recommended.nUp}-up tile on ${recommended.parent.label} — no gripper, no trim waste. Repeat gang, all same way as the file.`,
        );
      }
    } else if (recommended.nUp > 1 && !recommended.needsFileRotate) {
      why.push("Repeat gang — every piece the same way as the file. Turn the sheet if needed; do not rotate art.");
    }
    if (recommended.needsFileRotate) {
      why.push("This nest needs the file rotated 90° — extra prepress work. Prefer a same-way parent when one fits.");
    }
    if (recommended.nUp > 1) {
      why.push(
        `Click-saving: ${recommended.nUp}-up cuts impressions vs 1-up letter (${job.qty * job.sides} → ${recommended.impressions}).`,
      );
    }
    why.push(recommended.cuts.why);
  } else {
    why.push(`Non-paper substrate (${job.substrate}) — no parent sheet buy.`);
  }

  const warnings: string[] = [];
  if (
    job.substrate === "paper" &&
    (recommended.parent.w > VERSANT_PLAN_MAX.w + 0.05 ||
      recommended.parent.h > VERSANT_PLAN_MAX.h + 0.05)
  ) {
    warnings.push("Parent exceeds Versant planning max 13×19.2 in.");
  }
  if (SKIP.has("mailbot")) {
    // documented: MAILBOT never appears on a print plan
  }

  const routeIds = [press, ...finishing, ...also].map((s) => s.machineId);
  if (routeIds.includes("mailbot")) {
    throw new Error("MAILBOT must never be assigned");
  }

  return {
    job,
    parsedFrom,
    recommended,
    alternatives: ranked.slice(1),
    press,
    finishing,
    alsoConsider: also,
    why,
    warnings,
  };
}

export function planFromDescription(
  description: string,
  overrides?: Partial<JobInput>,
): ProductionPlan {
  const job = parseJobText(description, overrides);
  if (overrides) {
    Object.assign(job, overrides, { description: job.description });
  }
  return buildPlan(job, "text");
}

export function planFromJob(job: JobInput, parsedFrom: ProductionPlan["parsedFrom"] = "form"): ProductionPlan {
  return buildPlan(job, parsedFrom);
}

/** Never throw into React render — a missing machine becomes a ticket error. */
export function safePlanFromJob(
  job: JobInput,
  parsedFrom: ProductionPlan["parsedFrom"] = "form",
): { plan: ProductionPlan | null; error: string | null } {
  try {
    return { plan: planFromJob(job, parsedFrom), error: null };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Could not build a production plan for this ticket.";
    return { plan: null, error: message };
  }
}
