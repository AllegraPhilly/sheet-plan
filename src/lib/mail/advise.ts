import { FEES, FCM, EDDM_RETAIL, EDDM_RETAIL_INDICIA, MM, MM_MIN_QTY, fcmLetterMeter, fcmLetterStamp } from "./rates";
import {
  classifyUspsShape,
  eddmFlatShape,
  finishedDims,
  fcmFlatShape,
  fsmLetterOk,
  fsmTabInches,
  isLetterSelfMailer,
  letterSized,
  looksLikeParentSheet,
  machinableLetter,
  meetsEddmQtyOrWeight,
  postcardSized,
  wantsEddm,
  EDDM_FLAT_GATE,
  FSM_LETTER,
} from "./shape";
import {
  DEST_SCF,
  NOTICE,
  PHILLY_BMEU,
  type ContentClass,
  type MailAdvice,
  type MailInput,
  type RateCell,
  type StaffLine,
} from "./types";

const PERMIT_BLOCK: RateCell["shop_blockers"] = ["permit_not_open"];

function cell(
  partial: Omit<RateCell, "notice" | "effective" | "shop_blockers"> & {
    shop_blockers?: RateCell["shop_blockers"];
  },
): RateCell {
  return {
    notice: "Notice 123",
    effective: "2026-07-12",
    shop_blockers: partial.shop_blockers ?? [],
    ...partial,
  };
}

function meterOzLabel(weightOz: number): string {
  if (weightOz <= 1) return "1";
  if (weightOz <= 2) return "2";
  if (weightOz <= 3) return "3";
  return "3.5";
}

export function inferContentClass(input: MailInput): { class: ContentClass; fcmRequired: boolean; why: string } {
  if (input.content === "first-class-matter") {
    return {
      class: "first-class-matter",
      fcmRequired: true,
      why: "Content test: personal correspondence, bills, or account matter must travel First-Class. Do not skip this to chase a Marketing Mail rate.",
    };
  }
  if (input.content === "advertising") {
    return {
      class: "advertising",
      fcmRequired: false,
      why: "Content test: advertising / circular matter may use Marketing Mail once the shop is permit-eligible. Content still wins over cheap postage.",
    };
  }
  const text = `${input.description ?? ""} ${input.piece} ${input.goal}`.toLowerCase();
  if (/\b(bill|invoice|statement|account|personal|handwritten|handwriting|legal notice|tax)\b/.test(text)) {
    return {
      class: "first-class-matter",
      fcmRequired: true,
      why: "Content test (inferred): bills / personal / handwriting / legal matter is First-Class. Marketing Mail is not offered for this content.",
    };
  }
  if (input.addressing === "personalized" && input.goal === "courtesy") {
    return {
      class: "first-class-matter",
      fcmRequired: true,
      why: "Content test: personalized courtesy mail is treated as First-Class matter.",
    };
  }
  return {
    class: "unknown",
    fcmRequired: false,
    why: "Content not classified. Confirm it is advertising before any Marketing Mail path. When unsure, stay on First-Class.",
  };
}

function namedAds(input: MailInput, contentGate: { class: ContentClass; fcmRequired: boolean }): boolean {
  return !contentGate.fcmRequired && contentGate.class === "advertising" && input.addressing === "personalized";
}

function buildDecisions(input: MailInput, ctx: {
  contentGate: { class: ContentClass; fcmRequired: boolean; why: string };
  finished: { widthIn: number; heightIn: number; thicknessIn: number };
  letterSelfMailer: boolean;
  eddmShape: boolean;
  parentSheet: boolean;
  eddmRetailOk: boolean;
  eddmRejectId: string | null;
}): StaffLine[] {
  const lines: StaffLine[] = [];

  lines.push({
    id: "content-first",
    kind: ctx.contentGate.fcmRequired ? "do" : "do",
    say: ctx.contentGate.fcmRequired
      ? "This is First-Class matter. Do not sell Marketing Mail or EDDM to save postage."
      : ctx.contentGate.class === "advertising"
        ? "Advertising may use MM or EDDM only after the content test. Cheap postage does not win this step."
        : "Content is not classified. Stay on metered First-Class until someone confirms it is advertising.",
    why: ctx.contentGate.why,
    shop: "Run the content test before any rate. Bills, personal, and handwriting stay on the Connect+ 2000 as FCM.",
  });

  if (ctx.parentSheet) {
    lines.push({
      id: "parent-not-usps",
      kind: "reject",
      say: "That size is a parent sheet, not a USPS shape. Measure the finished piece after cut and fold.",
      why: "USPS prices letters, cards, and flats — not 11×17 / 12×18 / 13×19 parents.",
      shop: "Enter finish W/H/T. An 11×17 parent is what we buy and cut, not what we meter.",
    });
  }

  if (ctx.eddmRejectId === "eddm-letter-self-mailer-reject") {
    lines.push({
      id: "eddm-letter-self-mailer-reject",
      kind: "reject",
      say: "A letter-size self-mailer is not EDDM. Redesign to a flat for EDDM-Retail, or mail it as a letter (metered FCM now; MM at the BMEU once the permit is open).",
      why: "EDDM is flats only. One dimension must exceed 10.5\" L or 6.125\" H or 0.25\" T (max 15×12×0.75; min 5×3.5×0.007). Letter-size self-mailers fail that test.",
      shop: "Do not take this to a neighborhood PO. Offer a flat redesign + Form 3587, or tab as a letter (Whizard → Baum 714 → W360) and meter FCM.",
    });
  } else if (ctx.eddmRejectId === "eddm-content-reject") {
    lines.push({
      id: "eddm-content-reject",
      kind: "reject",
      say: "EDDM cannot carry bills, personal matter, or handwriting, and it cannot use names.",
      why: "Simplified address only. No bills / personal / handwriting. Not nonprofit priced (DMM 143.1.1). No forwarding or return.",
      shop: "Put this on metered FCM. EDDM-Retail is occupant/simplified address only.",
    });
  } else if (ctx.eddmRejectId === "eddm-qty-reject") {
    lines.push({
      id: "eddm-qty-reject",
      kind: "reject",
      say: `EDDM-Retail needs ${EDDM_FLAT_GATE.minQty}+ pieces or ${EDDM_FLAT_GATE.minLb} lb, and caps at ${EDDM_FLAT_GATE.maxPerZipDay.toLocaleString()} per day per 5-digit ZIP.`,
      why: "DMM 143.2.5 and 145.1.2.",
      shop: "If the list is under 200 and under 50 lb, meter FCM. Do not split a ZIP to dodge the daily cap.",
    });
  } else if (ctx.eddmRejectId === "eddm-shape-reject") {
    lines.push({
      id: "eddm-shape-reject",
      kind: "reject",
      say: "This finished piece is not an EDDM flat. Resize it or mail it as a letter.",
      why: "Flats only: one dim > 10.5\" L or 6.125\" H or 0.25\" T; max 15×12×0.75; min 5×3.5×0.007.",
      shop: "Measure the finished piece. Then either redesign to a flat or go letter FCM / locked MM.",
    });
  } else if (ctx.eddmRetailOk) {
    lines.push({
      id: "eddm-retail-do",
      kind: "do",
      say: "EDDM-Retail is open now at $0.260 per piece through 3.3 oz. No annual fee. No permit imprint.",
      why: "Notice 123 p.6. A CRID is still required even when imprint is not open (DMM 144.1.2) — we do not display a CRID number. Form 3587. DMM 146: drop only at the office the EDDM tool names.",
      shop: "Meter on Connect+ 2000 or pay cash/card at that PO. Bundle 50–100 with a facing slip. Straps (TP-202), not rubber bands (July 2025). Neighborhood POs do not take permit/bulk. Commercial EDDM p.19 stays locked — do not chase 0.1¢ vs Retail.",
    });
  }

  if (namedAds(input, ctx.contentGate)) {
    if (input.qty < MM_MIN_QTY) {
      lines.push({
        id: "named-ads-under-200",
        kind: "do",
        say: "Named advertising under 200 pieces: meter First-Class. Do not wait on a permit.",
        why: "USPS Marketing Mail needs 200 pieces (or 50 lb). Content already passed as advertising.",
        shop: "Connect+ 2000 metered FCM. No confirmed addresser (no_addresser) — addressing is outside this shop's confirmed gear.",
      });
    } else {
      lines.push({
        id: "named-ads-200",
        kind: "hold",
        say: "Named advertising, 200 or more: meter FCM today, or MM at the Philadelphia BMEU once the permit is open.",
        why: "MM letters are Notice 123 p.17 and stay locked. Commercial FCM presort is p.13, min 500, also locked.",
        shop: "Permit/CRID imprint is not on file — do not guess open. BMEU Premier, 7500 Lindbergh Blvd 19176, 1-877-672-0007.",
      });
    }
  }

  if (input.nonprofit) {
    lines.push({
      id: "nonprofit-3624",
      kind: "hold",
      say: input.piece === "eddm-flat" || input.addressing === "occupant-eddm"
        ? "Nonprofit prices do not apply to EDDM-Retail. Use the regular EDDM-Retail cell if the piece qualifies."
        : "Nonprofit is the client's Form 3624. Until USPS authorizes it, quote regular Marketing Mail prices.",
      why: input.piece === "eddm-flat" || input.addressing === "occupant-eddm"
        ? "DMM 143.1.1 — EDDM-Retail is not nonprofit priced."
        : "DMM 703.1.9 — pending authorization uses regular MM prices. Do not invent a nonprofit cell.",
      shop: "We do not file 3624 for the client. Locked MM cells stay on the regular p.17–20 amounts.",
    });
  }

  const foldedSelf =
    input.piece === "self-mailer" ||
    input.fold === "self-mailer" ||
    input.fold === "half" ||
    input.fold === "tri" ||
    input.fold === "letter" ||
    input.fold === "quarter";
  if (input.piece === "booklet" || /\bbooklet/.test(`${input.description ?? ""}`)) {
    lines.push({
      id: "booklet-201-3-16",
      kind: "hold",
      say: "A booklet is a bound-spine piece, not a folded self-mailer. Do not send it to the W360 as a bi-fold.",
      why: "DMM 201.3.16 (booklets), not 201.3.14 folded self-mailer letters.",
      shop: "W360 + Baum 714 is the FSM letter path only. Confirm spine/bind before any tab talk.",
    });
  } else if (input.piece === "envelope") {
    lines.push({
      id: "envelope-no-inserter",
      kind: "do",
      say: "Envelopes skip tabs. This shop has no confirmed inserter.",
      why: "Tabs are a folded self-mailer letter rule (DMM 201.3.11), not an envelope rule.",
      shop: "Print the envelope. Meter FCM on Connect+ 2000. Do not assign an inserter or a second meter.",
    });
  } else if (foldedSelf && ctx.letterSelfMailer) {
    const over = !fsmLetterOk(ctx.finished.widthIn, ctx.finished.heightIn, input.weightOz);
    const tabIn = fsmTabInches(input.weightOz);
    const quarter = input.fold === "quarter";
    lines.push({
      id: "fsm-tabs",
      kind: over ? "hold" : "do",
      say: over
        ? `This folded self-mailer exceeds DMM 201.3.14 (max ${FSM_LETTER.maxH}\" H × ${FSM_LETTER.maxL}\" L, max ${FSM_LETTER.maxOz} oz — smaller than an enveloped letter). Do not treat it as a W360 letter.`
        : quarter
          ? `Quarter-fold FSM: tabs only. Use ${tabIn}\" nonperforated tabs.`
          : `Folded self-mailer letter: ${tabIn}\" nonperforated tabs. Final fold below or to the right of the address.`,
      why: `DMM 201.3.14 (FSM letters). Tabs 201.3.11 — no perfs. Two legal placements: two on top within 1\" of lead/trail, OR two on lead/trail within 1\" of top. Paper ${FSM_LETTER.paperLe1oz} ≤1 oz / ${FSM_LETTER.paperGt1oz} >1 oz. 2–12 panels. Cheat-sheet: ${FSM_LETTER.cheatSheet}`,
      shop: `Whizard score → Baum 714 fold → PB W360 tab. ${tabIn}\" tabs (${FSM_LETTER.tabIn}\" ≤1 oz, ${FSM_LETTER.tabInOver1oz}\" if over 1 oz). Quarter-fold is tabs only. Booklets are not this path.`,
    });
  }

  lines.push({
    id: "permit-not-open",
    kind: "hold",
    say: "Commercial Marketing Mail and First-Class presort are not open. No CRID or imprint is on file. Do not guess open.",
    why: "Locked cells: Notice 123 p.13 FCM commercial (min 500); p.17–20 MM letters/flats including nonprofit. Open now: p.6 FCM meter/stamp/postcard/flats/EDDM-Retail/nonmach surcharge.",
    shop: "Show locked cells with shop_blockers: permit_not_open. Email-only bots are never assigned a USPS drop.",
  });

  lines.push({
    id: "no-imsb-postal-wizard",
    kind: "hold",
    say: "Do not offer IMsb as the shop path for client mail. Postal Wizard is the first commercial e-statement path once permit/CRID is open — still locked.",
    why: "IMsb is not for MSPs mailing for others. Permit/CRID remains closed.",
    shop: "Meter FCM or run EDDM-Retail now. Do not start IMsb for a client's mailing. Do not guess Postal Wizard open.",
  });

  lines.push({
    id: "entry-meter",
    kind: "do",
    say: "Enter commercial mail at Philadelphia BMEU Premier. One meter in this shop: Connect+ 2000.",
    why: "Dest SCF 189–192, 194 is SCF PHILADELPHIA PA 190. DDU letter prices are not offered.",
    shop: "7500 Lindbergh Blvd 19176, 1-877-672-0007. Do not plan a second Select+. No confirmed addresser (no_addresser).",
  });

  return lines;
}

export function adviseMail(input: MailInput): MailAdvice {
  const contentGate = inferContentClass(input);
  const finished = finishedDims(input);
  const parentSheet = looksLikeParentSheet(input.widthIn, input.heightIn) || looksLikeParentSheet(finished.widthIn, finished.heightIn);
  const letterSelfMailer = isLetterSelfMailer(input, finished);
  const eddmShape = eddmFlatShape(finished.widthIn, finished.heightIn, finished.thicknessIn);
  const pieceIsCard =
    input.piece === "postcard" ||
    (input.piece === "card" && postcardSized(finished.widthIn, finished.heightIn, finished.thicknessIn));
  const cardBySize = postcardSized(finished.widthIn, finished.heightIn, finished.thicknessIn);
  const isPostcard = pieceIsCard && cardBySize;
  const pieceSaysLetter =
    input.piece === "letter" ||
    input.piece === "self-mailer" ||
    input.piece === "envelope" ||
    (input.piece === "card" && !isPostcard);
  const isLetter = pieceSaysLetter || (letterSized(finished.widthIn, finished.heightIn, finished.thicknessIn) && !isPostcard && input.piece !== "flat" && input.piece !== "eddm-flat" && input.piece !== "booklet");
  const eddmIntent = wantsEddm(input);
  const isFlatPiece = input.piece === "flat" || input.piece === "eddm-flat";
  const isFlat =
    isFlatPiece ||
    (!isLetter && !isPostcard && !letterSelfMailer && fcmFlatShape(finished.widthIn, finished.heightIn, finished.thicknessIn));

  const actionable: RateCell[] = [];
  const onceEligible: RateCell[] = [];
  const missing: string[] = [];
  const decisions: StaffLine[] = [];

  let eddmRejectId: string | null = null;
  let eddmRetailOk = false;

  if (eddmIntent) {
    if (contentGate.fcmRequired || input.addressing === "personalized") {
      eddmRejectId = "eddm-content-reject";
    } else if (letterSelfMailer) {
      eddmRejectId = "eddm-letter-self-mailer-reject";
    } else if (!eddmShape) {
      eddmRejectId = "eddm-shape-reject";
    } else if (input.weightOz > EDDM_FLAT_GATE.maxOz) {
      missing.push("EDDM-Retail above 3.3 oz — see Notice 123.");
    } else if (!meetsEddmQtyOrWeight(input.qty, input.weightOz)) {
      eddmRejectId = "eddm-qty-reject";
    } else {
      eddmRetailOk = !contentGate.fcmRequired;
    }
  }

  if (eddmRetailOk) {
    const zipCap = input.qty > EDDM_FLAT_GATE.maxPerZipDay;
    actionable.push(
      cell({
        id: "eddm-retail-flat",
        className: "EDDM-Retail",
        label: "EDDM-Retail flat ≤3.3 oz",
        amount: EDDM_RETAIL.flatUpTo3_3oz.amount,
        unit: "per-piece",
        page: EDDM_RETAIL.flatUpTo3_3oz.page,
        eligibleNow: true,
        onceEligible: false,
        notes: [
          "Actionable now — no permit imprint.",
          "Annual fee $0 (DMM 143.1.1).",
          "Nonprofit eligibility does not apply to EDDM-Retail.",
          "Form 3587. A CRID is required even if imprint is not open (DMM 144.1.2) — number not displayed.",
          "Meter Connect+ 2000 or cash/card at the PO the EDDM tool names (DMM 146).",
          "Qty 200+ or 50 lb; max 5,000/day per 5-digit ZIP (143.2.5, 145.1.2).",
          "Bundles 50–100 with facing slip. Straps (TP-202), not rubber bands (July 2025). Neighborhood POs do not take permit/bulk.",
          `Indicia mock (4 pt ALL CAPS, 1/8\" clear): ${EDDM_RETAIL_INDICIA.lines.join(" / ")}. Address: ${EDDM_RETAIL_INDICIA.simplifiedAddress}.`,
          "No names. No forwarding/return.",
          zipCap ? `Qty ${input.qty} exceeds 5,000/day per 5-digit ZIP — split days or ZIPs only as the EDDM tool allows.` : "",
        ].filter(Boolean),
      }),
    );
  }

  if (isPostcard && input.weightOz <= 1) {
    actionable.push(
      cell({
        id: "fcm-postcard",
        className: "FCM",
        label: "FCM retail postcard",
        amount: FCM.postcard.amount,
        unit: "per-piece",
        page: FCM.postcard.page,
        eligibleNow: true,
        onceEligible: false,
        notes: ["Retail card $0.65 p.6. Max 4.25×6×0.016. Meter path still uses this card price."],
      }),
    );
  }

  const letterForFcm = (isLetter || input.piece === "self-mailer") && !isPostcard;
  const overLetterOz = letterForFcm && input.weightOz > 3.5;
  const finishedLetter = letterSized(finished.widthIn, finished.heightIn, finished.thicknessIn);
  const nonmachinable =
    letterForFcm &&
    finishedLetter &&
    !machinableLetter(finished.widthIn, finished.heightIn, finished.thicknessIn, input.weightOz) &&
    input.weightOz <= 3.5;

  if (letterForFcm && !overLetterOz) {
    const meter = fcmLetterMeter(input.weightOz);
    const stamp = fcmLetterStamp(input.weightOz);
    if (meter) {
      const notes = ["Actionable now on Pitney Bowes Connect+ 2000 (metered FCM)."];
      if (nonmachinable) {
        notes.push(`Add nonmachinable surcharge ${FCM.nonmachinable.amount} (p.${FCM.nonmachinable.page} n.1).`);
      }
      if (input.piece === "self-mailer") {
        notes.push("Tabbed self-mailer is an actionable FCM path when tabs meet DMM letter rules.");
      }
      if (parentSheet) {
        notes.push("11×17 parent is not a USPS shape — measure the finished piece.");
      }
      actionable.push(
        cell({
          id: "fcm-meter-letter",
          className: "FCM",
          label: `FCM metered letter ≤${meterOzLabel(input.weightOz)} oz`,
          amount: meter.amount,
          unit: "per-piece",
          page: meter.page,
          eligibleNow: true,
          onceEligible: false,
          notes,
        }),
      );
    } else {
      missing.push("FCM letter over 3.5 oz — use flats prices. See Notice 123 page 6.");
    }
    if (stamp) {
      actionable.push(
        cell({
          id: "fcm-stamp-letter",
          className: "FCM",
          label: "FCM retail stamped letter (reference)",
          amount: stamp.amount,
          unit: "per-piece",
          page: stamp.page,
          eligibleNow: true,
          onceEligible: false,
          notes: ["Stamp reference. Shop default is metered."],
        }),
      );
    }
    if (nonmachinable) {
      actionable.push(
        cell({
          id: "fcm-nonmach-surcharge",
          className: "FCM",
          label: "FCM nonmachinable letter surcharge",
          amount: FCM.nonmachinable.amount,
          unit: "per-piece",
          page: FCM.nonmachinable.page,
          eligibleNow: true,
          onceEligible: false,
          notes: ["Notice 123 p.6 n.1. Add to the letter postage. Aspect 1.3–2.5 and thickness gates apply."],
        }),
      );
    }
  } else if (overLetterOz) {
    missing.push("FCM letter over 3.5 oz — use flats prices. See Notice 123 page 6. Rate not hardcoded for this ounce.");
  }

  if ((isFlat || overLetterOz) && !eddmIntent && !letterSelfMailer) {
    if (input.weightOz <= 1) {
      actionable.push(
        cell({
          id: "fcm-flat-1oz",
          className: "FCM",
          label: "FCM retail flat 1 oz",
          amount: FCM.flat1oz.amount,
          unit: "per-piece",
          page: FCM.flat1oz.page,
          eligibleNow: true,
          onceEligible: false,
          notes: ["Actionable now as single-piece FCM flat. Over 3.5 oz letters use flats prices."],
        }),
      );
    } else if (input.piece === "flat" || overLetterOz) {
      missing.push("FCM flat above 1 oz — see Notice 123 page 6. Rate not hardcoded.");
    }
  } else if (isFlat && !eddmIntent && input.piece === "flat" && input.weightOz > 1) {
    missing.push("FCM flat above 1 oz — see Notice 123 page 6. Rate not hardcoded.");
  }

  if (input.qty >= FCM.commAuto5digitLetter.minQty && isLetter && !contentGate.fcmRequired) {
    onceEligible.push(
      cell({
        id: "fcm-comm-auto-5d",
        className: "FCM",
        label: "FCM commercial automation 5-Digit letter",
        amount: FCM.commAuto5digitLetter.amount,
        unit: "per-piece",
        page: FCM.commAuto5digitLetter.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: [
          "qty ≥ 500. Permit/CRID commercial FCM is NOT OPEN.",
          "Postal Wizard is the first commercial e-statement path once open — still locked. Do not offer IMsb for client mail.",
        ],
      }),
    );
  }

  const mmOkContent = !contentGate.fcmRequired && contentGate.class === "advertising";
  const mmQtyOk = input.qty >= MM_MIN_QTY;
  if (isLetter && input.weightOz <= 3.5 && mmQtyOk) {
    const npNote = input.nonprofit
      ? "Nonprofit pending Form 3624 — regular MM prices (DMM 703.1.9). No invented nonprofit cell."
      : "";
    const mmNotes = [
      mmOkContent
        ? "Once eligible — permit/CRID commercial MM is NOT OPEN."
        : "Shown for planning only. Content test keeps this off the actionable list.",
      namedAds(input, contentGate) && input.qty >= MM_MIN_QTY
        ? "Named ads 200+: MM at the BMEU once the permit is open."
        : "",
      npNote,
    ].filter(Boolean);
    onceEligible.push(
      cell({
        id: "mm-letter-auto-5d-origin",
        className: "MM",
        label: "MM letters ≤3.5 oz Auto 5-Digit origin",
        amount: MM.letterAuto5digitOrigin.amount,
        unit: "per-piece",
        page: MM.letterAuto5digitOrigin.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: mmNotes,
      }),
      cell({
        id: "mm-letter-auto-5d-dscf",
        className: "MM",
        label: "MM letters ≤3.5 oz Auto 5-Digit DSCF",
        amount: MM.letterAuto5digitDscf.amount,
        unit: "per-piece",
        page: MM.letterAuto5digitDscf.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: mmNotes,
      }),
      cell({
        id: "mm-letter-mixed",
        className: "MM",
        label: "MM letters Mixed machinable",
        amount: MM.letterMixedMach.amount,
        unit: "per-piece",
        page: MM.letterMixedMach.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: mmNotes,
      }),
    );
  }

  const showCommEddm = (eddmIntent || input.piece === "flat") && !letterSelfMailer && (eddmShape || input.piece === "flat" || input.piece === "eddm-flat");
  if (showCommEddm) {
    const commNotes = [
      "Commercial EDDM (not Retail). SHOW BUT LOCKED.",
      "Permit not open.",
      "Do not chase 0.1¢ vs EDDM-Retail.",
    ];
    onceEligible.push(
      cell({
        id: "mm-eddm-origin",
        className: "MM",
        label: "MM commercial EDDM flats ≤4 oz origin",
        amount: MM.eddmFlat4ozOrigin.amount,
        unit: "per-piece",
        page: MM.eddmFlat4ozOrigin.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: commNotes,
      }),
      cell({
        id: "mm-eddm-dscf",
        className: "MM",
        label: "MM commercial EDDM flats ≤4 oz DSCF",
        amount: MM.eddmFlat4ozDscf.amount,
        unit: "per-piece",
        page: MM.eddmFlat4ozDscf.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: commNotes,
      }),
      cell({
        id: "mm-eddm-ddu",
        className: "MM",
        label: "MM commercial EDDM flats ≤4 oz DDU",
        amount: MM.eddmFlat4ozDdu.amount,
        unit: "per-piece",
        page: MM.eddmFlat4ozDdu.page,
        eligibleNow: false,
        onceEligible: true,
        shop_blockers: PERMIT_BLOCK,
        notes: commNotes,
      }),
    );
  }

  const fees: RateCell[] = [
    cell({
      id: "fee-permit-imprint",
      className: "MM",
      label: "Permit imprint application",
      amount: FEES.permitImprint.amount,
      unit: "fee",
      page: FEES.permitImprint.page,
      eligibleNow: false,
      onceEligible: true,
      shop_blockers: PERMIT_BLOCK,
      notes: ["Not open. No imprint on file — do not guess open."],
    }),
    cell({
      id: "fee-mm-annual",
      className: "MM",
      label: "USPS Marketing Mail annual mailing fee",
      amount: FEES.mmAnnual.amount,
      unit: "fee",
      page: FEES.mmAnnual.page,
      eligibleNow: false,
      onceEligible: true,
      shop_blockers: PERMIT_BLOCK,
      notes: ["Not open."],
    }),
    cell({
      id: "fee-fcm-presort-annual",
      className: "FCM",
      label: "First-Class Mail presort annual mailing fee",
      amount: FEES.fcmPresortAnnual.amount,
      unit: "fee",
      page: FEES.fcmPresortAnnual.page,
      eligibleNow: false,
      onceEligible: true,
      shop_blockers: PERMIT_BLOCK,
      notes: ["Not open."],
    }),
    cell({
      id: "fee-eddm-retail-annual",
      className: "EDDM-Retail",
      label: "EDDM-Retail annual fee",
      amount: EDDM_RETAIL.annualFee.amount,
      unit: "fee",
      page: null,
      eligibleNow: true,
      onceEligible: false,
      notes: ["$0. DMM 143.1.1 — nonprofit cannot apply to Retail. Form 3587. No permit imprint."],
    }),
  ];

  if (input.nonprofit && (eddmIntent || eddmRetailOk)) {
    missing.push("Nonprofit rates do not apply to EDDM-Retail (DMM 143.1.1).");
  }

  const booklet = input.piece === "booklet" || /\bbooklet/.test(`${input.description ?? ""}`);
  const tabbedRequired =
    !booklet &&
    input.piece !== "envelope" &&
    (input.piece === "self-mailer" || input.fold === "self-mailer");

  decisions.push(
    ...buildDecisions(input, {
      contentGate,
      finished,
      letterSelfMailer,
      eddmShape,
      parentSheet,
      eddmRetailOk,
      eddmRejectId,
    }),
  );

  const mailingAssignedTo = ["pitney-bowes-connect-plus-2000"];
  if (tabbedRequired && !booklet) mailingAssignedTo.push("pitney-bowes-w360");
  if (eddmRetailOk) mailingAssignedTo.push("usps-banding-tp-202");

  const advice: MailAdvice = {
    contentGate,
    decisions,
    pieceGate: {
      finished,
      uspsShape: classifyUspsShape(finished.widthIn, finished.heightIn, finished.thicknessIn),
      machinableLetter: machinableLetter(finished.widthIn, finished.heightIn, finished.thicknessIn, input.weightOz),
      letterSelfMailer,
      eddmFlatOk: eddmShape,
      parentSheet,
    },
    actionable,
    onceEligible,
    fees,
    missing,
    speed: {
      fcm: "First-Class Mail: typically 1–5 days. Never quote a two-to-three-day window. Do not use the 2021 service standard.",
      mm: "USPS Marketing Mail: no guaranteed delivery day (DMM 243.3.1.1).",
      eddm: "EDDM: no guaranteed delivery day (DMM 143.2.1).",
    },
    induction: {
      bmeu: { ...PHILLY_BMEU },
      destScf: DEST_SCF.name,
      destScfZips: DEST_SCF.zips,
      meterMachineId: "pitney-bowes-connect-plus-2000",
      mailingAssignedTo,
    },
    shop: {
      permit_not_open: true,
      no_addresser: true,
      no_confirmed_inserter: true,
      one_meter: true,
      no_select_plus: true,
      no_imsb: true,
      postal_wizard_locked: true,
    },
    selfMailer: {
      tabbedRequired,
      fsmOk: tabbedRequired ? fsmLetterOk(finished.widthIn, finished.heightIn, input.weightOz) : undefined,
      tabIn: tabbedRequired ? fsmTabInches(input.weightOz) : undefined,
      note: booklet
        ? "Booklets are bound-spine pieces (DMM 201.3.16), not the FSM default. Do not send booklets to W360 as a bi-fold."
        : input.piece === "envelope"
          ? "Envelopes skip tabs. No confirmed inserter in this shop."
          : tabbedRequired
            ? `Tabbed self-mailer is actionable now as metered FCM when it meets DMM 201.3.14: max ${FSM_LETTER.maxH}\" H × ${FSM_LETTER.maxL}\" L, max ${FSM_LETTER.maxOz} oz (smaller than an enveloped letter). Tabs ${fsmTabInches(input.weightOz)}\" nonperforated (1\" ≤1 oz / 1.5\" >1 oz); two legal placements (top near lead/trail, or lead/trail near top). Final fold below or to the right of the address. Quarter-fold: tabs only. Shop: Whizard → Baum 714 → W360. Cheat-sheet ${FSM_LETTER.cheatSheet}.`
            : "Open-edge self-mailers need tabs before they are machinable letters.",
    },
    eddmIndicia: eddmRetailOk
      ? {
          lines: EDDM_RETAIL_INDICIA.lines,
          typeSpec: EDDM_RETAIL_INDICIA.typeSpec,
          clearIn: EDDM_RETAIL_INDICIA.clearIn,
          simplifiedAddress: EDDM_RETAIL_INDICIA.simplifiedAddress,
        }
      : null,
    notice: NOTICE,
  };

  return advice;
}

export function adviceHasProfitFlag(advice: MailAdvice): boolean {
  return Object.prototype.hasOwnProperty.call(advice, "profit_flag") && advice.profit_flag !== undefined;
}

export function mailingAssignees(advice: MailAdvice): string[] {
  return advice.induction.mailingAssignedTo;
}

export { letterSized, postcardSized } from "./shape";
