import { machineById, neverRouteIds } from "../machines";
import { emptyCuts } from "./cut-count";
import { isClassicLetterTabloid, nestOnParent, rankParents } from "./nest";
import { parseJobText } from "./parse-job";
import {
  ACCURIO_BOOKLET_MAX_SHEETS,
  ACCURIO_TOP_FEEDER_MAX_QTY,
  ACCURIO_TRAY_MAX,
  INLINE_FOLD_BOOK,
  PR_BOOKLET_MAX_SHEETS,
  finishFitsInside,
  isCoverStock,
  isSaddleJob,
  mixedSaddleError,
  nestInlineBooklet,
  nestSaddle,
  nestSaddleForPages,
  saddleAlternatives,
  saddlePageError,
  saddlePagesOk,
  sheetsPerSaddleBooklet,
} from "./saddle";
import { isMixedPackBind, mixedPackPageError, mixedPackSheetQtys } from "./ticket-text";
import {
  PARENTS,
  VERSANT_PLAN_MAX,
  type JobInput,
  type NestResult,
  type PressLine,
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

export function pressForPath(path: "color" | "bw"): RouteStep {
  if (path === "bw") return mustStep("accurio-6120", "B&W production impressions.");
  return mustStep(
    "versant-4100",
    "Color production. Plan on parents ≤ 13×19.2 in (extra-long 13×47.2 is not a default parent).",
  );
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
    return { press: pressForPath("bw"), also };
  }

  const press = pressForPath("color");
  if (job.qty < 25) {
    const mfp = step("kyocera-taskalfa-2554ci", "Convenience / walk-up color.", "confident");
    if (mfp) also.push(mfp);
  }
  return { press, also };
}

/** Sheet that goes through the folder: saddle signature, else the cut finish. */
export function foldSheetSize(job: JobInput, recommended: NestResult): { w: number; h: number } {
  if (isSaddleJob(job)) {
    if (recommended.signature) {
      return { w: recommended.signature.w, h: recommended.signature.h };
    }
    return { w: recommended.parent.w, h: recommended.parent.h };
  }
  return { w: job.finishW, h: job.finishH };
}

/** Letters / mailers / sheets that fit 14×20 stay Baum. Bigger sheets → Stahl B20. */
export function pickOfflineFolder(job: JobInput, recommended: NestResult): "baumfolder-714" | "stahl-folder" {
  const sheet = foldSheetSize(job, recommended);
  const baum = machineById("baumfolder-714")?.maxSheetIn ?? { w: 14, h: 20 };
  if (finishFitsInside(sheet, baum)) return "baumfolder-714";
  return "stahl-folder";
}

const TABLOID_SHEET = { w: 11, h: 17 };

/**
 * Fold sheet (finish, or saddle signature) fits Accurio when it is inside the
 * 8.5×11 book / 11×17 in-line window, or tray max 12.76×18.23 (do not assume PF-710).
 */
export function foldSheetFitsAccurioTopFeeder(job: JobInput, recommended: NestResult): boolean {
  const sheet = foldSheetSize(job, recommended);
  const tray = machineById("accurio-top-feeder")?.maxSheetIn ?? ACCURIO_TRAY_MAX;
  return (
    finishFitsInside(sheet, INLINE_FOLD_BOOK) ||
    finishFitsInside(sheet, TABLOID_SHEET) ||
    finishFitsInside(sheet, tray)
  );
}

/**
 * Fold-only paper jobs: already-printed sheets, job qty ≤ 50 pieces, sheet fits Accurio.
 * Not saddle (in-line or overflow). Not USPS fold-mailer.
 */
export function canAccurioTopFeederFold(job: JobInput, recommended: NestResult): boolean {
  if (job.substrate !== "paper") return false;
  if (isSaddleJob(job)) return false;
  if (!job.fold || job.fold === "none") return false;
  if (!Number.isFinite(job.qty) || job.qty > ACCURIO_TOP_FEEDER_MAX_QTY) return false;
  return foldSheetFitsAccurioTopFeeder(job, recommended);
}

export function finishingSteps(job: JobInput, recommended: NestResult): RouteStep[] {
  const out: RouteStep[] = [];
  if (isSaddleJob(job)) {
    if (recommended.inlineBooklet) {
      if (recommended.inlineBookletOn === "accurio") {
        out.push(
          mustStep(
            "accurio-saddle-booklet-maker",
            "Fold and saddle-staple in-line on the AccurioPress 6120.",
          ),
        );
      } else {
        out.push(
          mustStep(
            "xerox-pr-booklet-maker-finisher",
            "Fold and saddle-staple in-line on the Versant 4100.",
          ),
        );
      }
      if (recommended.inlineFaceTrim) {
        out.push(
          mustStep(
            "challenge-305-crt",
            `Face-trim 8.5×11 to ${job.finishW}×${job.finishH} after the book comes out.`,
          ),
        );
      }
      if (job.scannedOriginal) {
        out.unshift(mustStep("epson-expression-11000xl", "Scan original (tabloid flatbed)."));
      }
      return out;
    }
    if (recommended.cuts.clicks > 0) {
      out.push(
        mustStep("challenge-305-crt", "Split ganged signatures on the parent. Not a letter 2-up cut."),
      );
    }
    if (job.color === "mixed" || isCoverStock(job)) {
      out.push(mustStep("graphic-whizard-creasemaster-plus-ts", "Crease cover stock before fold."));
    }
    out.push(mustStep(pickOfflineFolder(job, recommended), "Fold: half (saddle signature)."));
    out.push(mustStep("salco-rapid-106e", "Saddle stitch on the fold."));
    if (job.scannedOriginal) {
      out.unshift(mustStep("epson-expression-11000xl", "Scan original (tabloid flatbed)."));
    }
    return out;
  }
  if (recommended.nUp > 1 || job.finishW < 8.49 || job.finishH < 10.9) {
    if (job.substrate === "paper") {
      out.push(mustStep("challenge-305-crt", "Cut parent to finish. 30.5 in knife, 3.5 in clamp."));
    }
  }
  if (job.fold && job.fold !== "none") {
    if (job.stockHint && /cover|card|100#|80#c/.test(job.stockHint.toLowerCase())) {
      out.push(mustStep("graphic-whizard-creasemaster-plus-ts", "Crease before fold."));
    }
    if (canAccurioTopFeederFold(job, recommended)) {
      out.push(mustStep("accurio-top-feeder", "Fold from the unit top feeder (no click)."));
    } else {
      out.push(mustStep(pickOfflineFolder(job, recommended), `Fold: ${job.fold}.`));
    }
  }
  if (job.bind === "staple") {
    out.push(mustStep("salco-rapid-106e", "Corner staple, one upper-left (Salco Rapid 106E)."));
  }
  if (job.bind === "side-staple") {
    out.push(mustStep("salco-rapid-106e", "Side staple, 2–3 along the left edge (Salco Rapid 106E)."));
  }
  if (job.bind === "coil") out.push(mustStep("rhin-o-tuff-od-4012", "Punch and bind."));
  if (job.bind === "drill") out.push(mustStep("challenge-eh3a", "Drill."));
  if (job.bind === "laminate") out.push(mustStep("seal-44-ultra-plus", "Laminate."));
  if (job.bind === "shrink") out.push(mustStep("minipack-replay-55", "Shrink wrap packs."));
  if (job.scannedOriginal) {
    out.unshift(mustStep("epson-expression-11000xl", "Scan original (tabloid flatbed)."));
  }
  return out;
}

function fallbackNest(job: JobInput): NestResult {
  return (
    nestOnParent(job, PARENTS[0]) ?? {
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
    }
  );
}

function mixedFlatQtys(job: JobInput): { color: number; bw: number } {
  const c = job.colorQty;
  const b = job.bwQty;
  if (typeof c === "number" && Number.isFinite(c) && typeof b === "number" && Number.isFinite(b)) {
    return { color: Math.max(0, c), bw: Math.max(0, b) };
  }
  return { color: job.qty, bw: 0 };
}

function paperNest(job: JobInput): NestResult {
  return rankParents(job)[0] ?? fallbackNest(job);
}

/** Why mixed packs stay one Versant stack — moving paper between presses costs too much time. */
export const MIXED_BOOKLET_WHY =
  "All on Versant 4100 — don’t split cover/insides across presses (too much handling).";

/** Mixed saddle: Versant color shells + Accurio B&W insides + Accurio in-line saddle. */
export const MIXED_SADDLE_WHY =
  "Versant prints color cover shells; load those sheets in Accurio trays. Accurio prints black on B&W signatures, then fold and saddle in-line.";

/** Mixed pack: one Versant line for the whole book. Accurio does not run this ticket. */
export function mixedBookletPress(): RouteStep {
  return mustStep("versant-4100", MIXED_BOOKLET_WHY);
}

function mixedSaddleSheetCounts(job: JobInput): { color: number; bw: number } {
  const qty = Number.isFinite(job.qty) && job.qty > 0 ? job.qty : 1;
  const colorPages = job.colorPages ?? 0;
  const bwPages = job.bwPages ?? 0;
  return {
    color: saddlePagesOk(colorPages) ? sheetsPerSaddleBooklet(colorPages) * qty : 0,
    bw: saddlePagesOk(bwPages) ? sheetsPerSaddleBooklet(bwPages) * qty : 0,
  };
}

function mixedSaddleLines(job: JobInput, recommended: NestResult): PressLine[] {
  const colorPages = job.colorPages ?? 0;
  const bwPages = job.bwPages ?? 0;
  const on = recommended.inlineBookletOn ?? (recommended.inlineBooklet ? "accurio" : undefined);
  const built: PressLine[] = [];
  if (colorPages > 0 && saddlePagesOk(colorPages)) {
    const colorJob: JobInput = { ...job, pages: colorPages, color: "color" };
    const nest =
      recommended.inlineBooklet && on
        ? nestInlineBooklet(colorJob, on)
        : nestSaddleForPages(colorJob, colorPages);
    built.push({
      role: "color",
      press: mustStep("versant-4100", "Print color cover shells (color clicks on cover signatures only)."),
      nest,
    });
  }
  if (bwPages > 0 && saddlePagesOk(bwPages)) {
    const bwJob: JobInput = { ...job, pages: bwPages, color: "bw" };
    const nest =
      recommended.inlineBooklet && on
        ? nestInlineBooklet(bwJob, on)
        : nestSaddleForPages(bwJob, bwPages);
    built.push({
      role: "bw",
      press: mustStep(
        "accurio-6120",
        recommended.inlineBooklet
          ? "Print black on B&W signatures (B&W clicks), then in-line saddle."
          : "Print black on B&W signatures (B&W clicks).",
      ),
      nest,
    });
  }
  return built;
}

function saddleWhy(job: JobInput, recommended: NestResult, press: RouteStep): string[] {
  if (recommended.inlineBooklet) {
    if (job.color === "mixed") {
      const sheets = mixedSaddleSheetCounts(job);
      const why = [
        MIXED_SADDLE_WHY,
        `Buy ${recommended.sheetsToBuy} parent ${recommended.parent.label} (${sheets.color} color cover shells on Versant 4100 + ${sheets.bw} B&W inside sheets on AccurioPress 6120). Fold and saddle in-line on Accurio.`,
        `${sheets.color * 2} color duplex clicks on Versant 4100 (cover signatures only). ${sheets.bw * 2} B&W duplex clicks on AccurioPress 6120 (body signatures).`,
      ];
      if (recommended.inlineFaceTrim) {
        why.push(`Face-trim 8.5×11 to ${job.finishW}×${job.finishH} on Challenge 305 CRT.`);
      }
      return why;
    }
    const pressName = recommended.inlineBookletOn === "accurio" ? "AccurioPress 6120" : "Versant 4100";
    const finisher =
      recommended.inlineBookletOn === "accurio"
        ? "AccurioPress 6120 in-line saddle / booklet maker"
        : "Xerox PR Booklet Maker Finisher";
    const why = [
      `${recommended.sheetsToBuy} sheets ${recommended.parent.label} on ${pressName}. Fold and saddle in the ${finisher}.`,
    ];
    if (recommended.inlineFaceTrim) {
      why.push(`Face-trim 8.5×11 to ${job.finishW}×${job.finishH} on Challenge 305 CRT.`);
    }
    return why;
  }
  const pages = job.pages!;
  const sigsEach = sheetsPerSaddleBooklet(pages);
  const why: string[] = [];
  const sig = recommended.signature;
  const sigLabel = sig ? `${sig.w}×${sig.h}` : "signature";
  why.push(
    `Buy ${recommended.sheetsToBuy} parent ${recommended.parent.label} (${pages} pages ÷ 4 = ${sigsEach} signatures each × ${job.qty} booklets). ${sigLabel} signature, ${recommended.nUp}-up on the parent. Folded signature, not 8.5×11 2-up cut on the Challenge.`,
  );
  if (job.color === "mixed") {
    const sheets = mixedSaddleSheetCounts(job);
    why.push(
      `Versant prints color cover shells (${sheets.color} sheets, ${sheets.color * 2} color duplex clicks). Accurio prints black on B&W insides (${sheets.bw} sheets, ${sheets.bw * 2} B&W duplex clicks). Not all on Versant.`,
    );
  } else {
    why.push(
      `${recommended.impressions} duplex clicks on ${press.name} (one signature sheet = 4 pages).`,
    );
  }
  const folder = machineById(pickOfflineFolder(job, recommended));
  why.push(`Fold half on ${folder?.name ?? "Baumfolder 714"}. Saddle stitch on Salco Rapid 106E.`);
  if (job.color === "mixed" || isCoverStock(job)) {
    why.push("Cover stock — crease on Graphic Whizard before fold.");
  }
  why.push(recommended.cuts.why);
  return why;
}

function flatWhy(job: JobInput, recommended: NestResult, press: RouteStep): string[] {
  const why: string[] = [];
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
  return why;
}

export function buildPlan(job: JobInput, parsedFrom: ProductionPlan["parsedFrom"]): ProductionPlan {
  if (isSaddleJob(job)) {
    const pageErr = saddlePageError(job.pages);
    if (pageErr) throw new Error(pageErr);
    const mixedErr = mixedSaddleError(job);
    if (mixedErr) throw new Error(mixedErr);
  } else {
    const packErr = mixedPackPageError(job);
    if (packErr) throw new Error(packErr);
  }

  let recommended: NestResult;
  let alternatives: NestResult[] = [];
  let press: RouteStep;
  let also: RouteStep[] = [];
  let lines: PressLine[] | undefined;

  if (isSaddleJob(job) && job.substrate === "paper") {
    recommended = nestSaddle(job);
    alternatives = saddleAlternatives(job, recommended);
    if (job.color === "mixed") {
      const built = mixedSaddleLines(job, recommended);
      if (built.length > 0) {
        lines = built;
        press = built[0].press;
      } else {
        press = pressForPath("color");
      }
      also = [];
    } else if (job.color === "bw") {
      const chosen = choosePress({ ...job, color: "bw" });
      press = chosen.press;
      also = chosen.also;
    } else {
      press = pressForPath("color");
      also = [];
    }
  } else if (job.color === "mixed" && job.substrate === "paper" && isMixedPackBind(job.bind)) {
    const qtys = mixedPackSheetQtys(job);
    const total = Math.max(1, qtys.color + qtys.bw);
    recommended = paperNest({ ...job, qty: total, color: "color" });
    press = mixedBookletPress();
    alternatives = rankParents({ ...job, qty: total, color: "color" }).slice(1);
  } else if (job.color === "mixed" && job.substrate === "paper") {
    const qtys = mixedFlatQtys(job);
    const built: PressLine[] = [];
    if (qtys.color > 0) {
      const nest = paperNest({ ...job, qty: qtys.color, color: "color" });
      built.push({ role: "color", press: pressForPath("color"), nest });
    }
    if (qtys.bw > 0) {
      const nest = paperNest({ ...job, qty: qtys.bw, color: "bw" });
      built.push({ role: "bw", press: pressForPath("bw"), nest });
    }
    if (built.length === 0) {
      recommended = paperNest(job);
      press = pressForPath("color");
    } else {
      lines = built;
      recommended = built[0].nest;
      press = built[0].press;
      alternatives = rankParents({ ...job, qty: qtys.color || qtys.bw, color: "color" }).slice(1);
    }
  } else {
    const ranked = job.substrate === "paper" ? rankParents(job) : [];
    recommended = ranked[0] ?? fallbackNest(job);
    alternatives = ranked.slice(1);
    const chosen = choosePress(job);
    press = chosen.press;
    also = chosen.also;
  }

  const finishing = finishingSteps(job, recommended);

  const why: string[] = [];
  if (isSaddleJob(job) && job.substrate === "paper") {
    why.push(...saddleWhy(job, recommended, press));
  } else if (job.substrate === "paper") {
    if (job.color === "mixed" && isMixedPackBind(job.bind)) {
      why.push(MIXED_BOOKLET_WHY);
    }
    if (lines && lines.length > 1) {
      for (const line of lines) {
        const who = line.role === "color" ? "Color" : "B&W";
        why.push(
          `${who}: buy ${line.nest.sheetsToBuy} parent ${line.nest.parent.label} (${line.nest.nUp}-up) on ${line.press.name}.`,
        );
      }
      why.push(recommended.cuts.why);
    } else {
      why.push(...flatWhy(job, recommended, press));
    }
  } else {
    why.push(`Non-paper substrate (${job.substrate}) — no parent sheet buy.`);
  }
  if (finishing.some((s) => s.machineId === "accurio-top-feeder")) {
    why.push("Fold from the unit top feeder (no click).");
  }

  const warnings: string[] = [];
  if (
    job.substrate === "paper" &&
    (recommended.parent.w > VERSANT_PLAN_MAX.w + 0.05 ||
      recommended.parent.h > VERSANT_PLAN_MAX.h + 0.05)
  ) {
    warnings.push("Parent exceeds Versant planning max 13×19.2 in.");
  }
  if (isSaddleJob(job) && job.substrate === "paper" && !recommended.inlineBooklet && saddlePagesOk(job.pages)) {
    const sheets = sheetsPerSaddleBooklet(job.pages);
    if (job.color === "color" && sheets > PR_BOOKLET_MAX_SHEETS) {
      warnings.push(
        `PR Booklet Maker saddle-stitch cap is ${PR_BOOKLET_MAX_SHEETS} sheets/book (${sheets} sheets here). Offline ${machineById(pickOfflineFolder(job, recommended))?.name ?? "Baumfolder 714"} + Salco Rapid 106E.`,
      );
    }
    if ((job.color === "bw" || job.color === "mixed") && sheets > ACCURIO_BOOKLET_MAX_SHEETS) {
      warnings.push(
        `Accurio in-line saddle cap is ${ACCURIO_BOOKLET_MAX_SHEETS} sheets/book (${sheets} sheets here). Overflow Salco Rapid 106E.`,
      );
    }
  }

  const routeIds = [press, ...finishing, ...also, ...(lines ?? []).map((l) => l.press)].map((s) => s.machineId);
  if (routeIds.includes("mailbot")) {
    throw new Error("MAILBOT must never be assigned");
  }

  return {
    job,
    parsedFrom,
    recommended,
    alternatives,
    press,
    lines,
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
