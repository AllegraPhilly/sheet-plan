import { FEES, FCM, EDDM_RETAIL, MM, fcmLetterMeter, fcmLetterStamp } from "./rates";
import {
  NOTICE,
  PHILLY_BMEU,
  type ContentClass,
  type MailAdvice,
  type MailInput,
  type RateCell,
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
  if (/\b(bill|invoice|statement|account|personal|handwritten|legal notice|tax)\b/.test(text)) {
    return {
      class: "first-class-matter",
      fcmRequired: true,
      why: "Content test (inferred): bills / personal / legal matter is First-Class. Marketing Mail is not offered for this content.",
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

export function letterSized(w: number, h: number): boolean {
  const [a, b] = [Math.min(w, h), Math.max(w, h)];
  return a >= 3.5 && a <= 6.125 && b >= 5 && b <= 11.5;
}

export function postcardSized(w: number, h: number): boolean {
  const [a, b] = [Math.min(w, h), Math.max(w, h)];
  return a >= 3.5 && a <= 4.25 && b >= 5 && b <= 6;
}

export function flatSized(w: number, h: number): boolean {
  const [a, b] = [Math.min(w, h), Math.max(w, h)];
  return a > 6.125 || b > 11.5 || (a >= 6 && b >= 10);
}

export function adviseMail(input: MailInput): MailAdvice {
  const contentGate = inferContentClass(input);
  const actionable: RateCell[] = [];
  const onceEligible: RateCell[] = [];
  const missing: string[] = [];

  const isPostcard = input.piece === "postcard" || (input.piece === "card" && postcardSized(input.widthIn, input.heightIn));
  const isLetter =
    input.piece === "letter" ||
    input.piece === "self-mailer" ||
    (input.piece === "card" && letterSized(input.widthIn, input.heightIn) && !isPostcard);
  const isEddm = input.piece === "eddm-flat" || input.addressing === "occupant-eddm";
  const isFlat = input.piece === "flat" || (!isLetter && !isPostcard && !isEddm && flatSized(input.widthIn, input.heightIn));

  const nonmachinable =
    isLetter &&
    (input.thicknessIn > 0.25 ||
      input.fold === "none" && input.heightIn / input.widthIn < 1.3 && input.weightOz > 1);

  if (!contentGate.fcmRequired && isEddm && input.weightOz <= 3.3) {
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
          "Actionable now — no permit.",
          "Annual fee $0 (DMM 143.1.1).",
          "Nonprofit eligibility does not apply to EDDM-Retail.",
        ],
      }),
    );
  } else if (isEddm && input.weightOz > 3.3) {
    missing.push("EDDM-Retail above 3.3 oz — see Notice 123.");
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
        notes: ["Retail postcard. Meter path still uses this card price."],
      }),
    );
  }

  if ((isLetter || input.piece === "self-mailer") && !isPostcard) {
    const meter = fcmLetterMeter(input.weightOz);
    const stamp = fcmLetterStamp(input.weightOz);
    if (meter) {
      const notes = ["Actionable now on Pitney Bowes Connect+ 2000 (metered FCM)."];
      if (nonmachinable) {
        notes.push(`Add nonmachinable surcharge ${FCM.nonmachinable.amount} (p.${FCM.nonmachinable.page}).`);
      }
      if (input.piece === "self-mailer") {
        notes.push("Tabbed self-mailer is an actionable FCM path when tabs meet DMM letter rules.");
      }
      actionable.push(
        cell({
          id: "fcm-meter-letter",
          className: "FCM",
          label: `FCM metered letter ≤${input.weightOz <= 1 ? "1" : input.weightOz <= 2 ? "2" : input.weightOz <= 3 ? "3" : "3.5"} oz`,
          amount: meter.amount,
          unit: "per-piece",
          page: meter.page,
          eligibleNow: true,
          onceEligible: false,
          notes,
        }),
      );
    } else {
      missing.push("FCM letter over 3.5 oz — see Notice 123 (use flat prices).");
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
  }

  if (isFlat && !isEddm) {
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
          notes: ["Actionable now as single-piece FCM flat."],
        }),
      );
    } else {
      missing.push("FCM flat above 1 oz — see Notice 123 page 6. Rate not hardcoded.");
    }
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
        notes: ["qty ≥ 500. Permit/CRID commercial FCM is NOT OPEN."],
      }),
    );
  } else if (isLetter && input.qty < FCM.commAuto5digitLetter.minQty) {
    // do not invent a comm rate under 500
  }

  const mmOkContent = !contentGate.fcmRequired && contentGate.class === "advertising";
  if (isLetter && input.weightOz <= 3.5) {
    const mmNotes = mmOkContent
      ? ["Once eligible — permit/CRID commercial MM is NOT OPEN."]
      : ["Shown for planning only. Content test keeps this off the actionable list."];
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

  if (isEddm || input.piece === "flat") {
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
        notes: ["Commercial EDDM (not Retail). Permit not open."],
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
        notes: ["Permit not open."],
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
        notes: ["Permit not open."],
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
      notes: ["Not open."],
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
      notes: ["$0. DMM 143.1.1 — nonprofit cannot apply to Retail."],
    }),
  ];

  if (input.nonprofit && isEddm) {
    missing.push("Nonprofit rates do not apply to EDDM-Retail (DMM 143.1.1).");
  }

  const tabbedRequired = input.piece === "self-mailer" || input.fold === "self-mailer";

  const advice: MailAdvice = {
    contentGate,
    actionable,
    onceEligible,
    fees,
    missing,
    speed: {
      fcm: "First-Class Mail: typically 1–5 days. Never quote a two-to-three-day window.",
      mm: "USPS Marketing Mail: no guaranteed delivery day (DMM 243.3.1.1).",
      eddm: "EDDM: no guaranteed delivery day (DMM 143.2.1).",
    },
    induction: {
      bmeu: { ...PHILLY_BMEU },
      meterMachineId: "pitney-bowes-connect-plus-2000",
      mailingAssignedTo: ["pitney-bowes-connect-plus-2000", "pitney-bowes-w360", "usps-banding-tp-202"],
    },
    selfMailer: {
      tabbedRequired,
      note: tabbedRequired
        ? "Tabbed self-mailer is actionable now as metered FCM. Tabs are a letter-machinable requirement, not a rate invention."
        : "Open-edge self-mailers need tabs before they are machinable letters.",
    },
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
