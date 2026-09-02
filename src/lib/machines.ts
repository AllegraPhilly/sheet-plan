export type MachineKind =
  | "press-color"
  | "press-bw"
  | "mfp"
  | "envelope"
  | "uv"
  | "cutter"
  | "folder"
  | "creaser"
  | "bind"
  | "finishing"
  | "drill"
  | "laminator"
  | "stitcher"
  | "shrink"
  | "vinyl"
  | "heat-press"
  | "scanner"
  | "meter"
  | "inserter"
  | "banding"
  | "email-only";

export type RouteConfidence = "confident" | "fuzzy" | "skip";

export type Machine = {
  id: string;
  name: string;
  kind: MachineKind;
  confidence: RouteConfidence;
  role: string;
  /** Planning parent max (inches). Extra-long device paths are not default parents. */
  maxParentIn?: { w: number; h: number };
  /** Finisher sheet window (inches). Booklet path — not Versant XLS. */
  maxSheetIn?: { w: number; h: number };
  notes: string[];
  /** Shown on floor list only when it is not a meter/USPS account identifier. */
  floorFacts?: string[];
};

/**
 * Shop floor catalog. Route only `confident` machines.
 * `fuzzy` may appear under Also consider. `skip` is never assigned.
 *
 * Never store Versant serial PZZ447134.
 * Never surface Fiery IP/hostname, meter serials, or USPS account IDs.
 * MAILBOT is email only — never assign USPS mailing to it.
 */
export const MACHINES: Machine[] = [
  {
    id: "versant-4100",
    name: "Xerox Versant 4100",
    kind: "press-color",
    confidence: "confident",
    role: "Color production press",
    maxParentIn: { w: 13, h: 19.2 },
    notes: [
      "Default planning parent max is 13×19.2 in.",
      "Device extra-long 13×47.2 in is not a default parent.",
      "Color saddles that fit run 11×17 through the Xerox PR Booklet Maker Finisher.",
      "Mixed saddles (color cover / B&W insides) print color shells here; Accurio prints black and saddles in-line — not forced all-on-Versant.",
    ],
    floorFacts: ["Color", "Sheet-fed production"],
  },
  {
    id: "xerox-pr-booklet-maker-finisher",
    name: "Xerox Production Ready (PR) Booklet Maker Finisher",
    kind: "finishing",
    confidence: "confident",
    role: "in-line fold + saddle-staple on Versant 4100",
    maxSheetIn: { w: 13, h: 19.2 },
    notes: [
      "In-line fold + saddle-staple on the Versant 4100.",
      "All-color saddles only. Hybrid color cover / B&W insides finish on Accurio in-line saddle, not this module.",
      "Booklet path max 13×19.2 in — not Versant XLS 47.2.",
      "Saddle-stitch up to 30 sheets Colotech+ 90 uncoated (25 coated 52–90 gsm). Bi-fold 5 sheets.",
      "Booklet sheet min 7.17×10.12 in, max 13×19.2 in; 60–350 gsm.",
      "Needs Interface Decurler Module.",
      "Xerox KB0400109, same module family. Jason floor 2026-08-30; no nameplate photo — do not invent serial.",
    ],
    floorFacts: ["Versant in-line", "Fold + saddle"],
  },
  {
    id: "accurio-6120",
    name: "Konica Minolta AccurioPress 6120",
    kind: "press-bw",
    confidence: "confident",
    role: "Black-and-white production press",
    maxParentIn: { w: 13, h: 19.2 },
    notes: [
      "B&W production path.",
      "Has in-line saddle (accurio-saddle-booklet-maker).",
      "Can print black on Versant-printed color shells then saddle.",
      "Official tray max 12.76 × 18.23 in (do not assume PF-710).",
      "Default saddle parent is 11×17 (fits). Do not pick 12×18 as Accurio saddle parent.",
      "Small-batch fold-only of finished sheets can use the unit top feeder (no click). Engine fold-only is still forbidden.",
    ],
    floorFacts: ["B&W", "Sheet-fed production"],
  },
  {
    id: "accurio-saddle-booklet-maker",
    name: "AccurioPress 6120 in-line saddle / booklet maker",
    kind: "finishing",
    confidence: "confident",
    role: "in-line fold + saddle-staple on AccurioPress 6120",
    maxSheetIn: { w: 13, h: 19.2 },
    notes: [
      "In-line fold + saddle-staple on the AccurioPress 6120.",
      "Conservative stitch cap 20 sheets/book until a module plate is on file.",
      "Over 20 sheets/book → Salco Rapid 106E overflow / offline.",
      "B&W and mixed (color cover / B&W insides) saddles that fit. All-color stays on the Versant PR Booklet Maker.",
      "Default saddle parent is 11×17 (fits). Do not pick 12×18 as Accurio saddle parent.",
      "Jason floor 2026-09-01; no nameplate photo — do not invent module id or serial.",
      "Small-batch fold-only of finished sheets can use the unit top feeder (no click). Not mixed-saddle cover insert.",
    ],
    floorFacts: ["Accurio in-line", "Fold + saddle"],
  },
  {
    id: "accurio-top-feeder",
    name: "AccurioPress 6120 unit top feeder",
    kind: "folder",
    confidence: "confident",
    role: "fold already-complete sheets on Accurio with no click",
    maxSheetIn: { w: 12.76, h: 18.23 },
    notes: [
      "Jason floor 2026-09-02: small-batch folds on the Konica via unit top feeder; bypasses click count.",
      "Sheets do not go through the Accurio engine (engine path still B&W-clicks).",
      "Fold only. Not mixed-saddle cover insert.",
      "Conservative small-batch cap until Jason/EQBot say otherwise: job qty ≤ 50.",
      "Half-fold 1–5 sheets per set, tri-fold 1–3 sheets per set. Folder-tray output is small (~35 sets of 1–5 sheet half-folds).",
      "Sheet window: same as Accurio in-line path — default 11×17 / letter; do not pick 12×18; tray max 12.76×18.23 unless PF-710.",
    ],
    floorFacts: ["Unit top feeder", "No click"],
  },
  {
    id: "kyocera-taskalfa-2554ci",
    name: "Kyocera TASKalfa 2554ci",
    kind: "mfp",
    confidence: "confident",
    role: "Office color MFP / convenience / short overflow",
    maxParentIn: { w: 12, h: 18 },
    notes: ["Not the first call for production color."],
    floorFacts: ["Color MFP"],
  },
  {
    id: "xante-x36",
    name: "Xanté X-36",
    kind: "envelope",
    confidence: "confident",
    role: "Envelope / specialty digital",
    notes: ["Envelopes and specialty stocks the production presses should not take."],
  },
  {
    id: "xante-enpress",
    name: "Xanté Enpress",
    kind: "envelope",
    confidence: "confident",
    role: "Envelope press",
    notes: ["Primary envelope path."],
  },
  {
    id: "xante-uv-unlimited",
    name: "Xanté Excelagraphix UV Unlimited",
    kind: "uv",
    confidence: "confident",
    role: "UV / specialty graphics",
    notes: ["UV-curable path. Not a paper guillotine substitute."],
  },
  {
    id: "challenge-305-crt",
    name: "Challenge 305 CRT",
    kind: "cutter",
    confidence: "confident",
    role: "Programmable paper cutter",
    notes: ["Primary paper guillotine. Vinyl work does not go here."],
    floorFacts: ["30.5 in knife", "3.5 in clamp", "Serial 97116F"],
  },
  {
    id: "baumfolder-714",
    name: "Baumfolder 714",
    kind: "folder",
    confidence: "confident",
    role: "Tabletop air-feed folder",
    maxSheetIn: { w: 14, h: 20 },
    notes: [
      "Letter / half / Z folds for letter-size work.",
      "USPS fold-mailer / letter self-mailer only — not Stahl.",
    ],
    floorFacts: ["Serial 86-B-235", "115 V 60 Hz 2.2 A"],
  },
  {
    id: "stahl-folder",
    name: "Stahl 1220B-4-P-3 (Stahlfolder B20 / Stahl 20)",
    kind: "folder",
    confidence: "confident",
    role: "pile-feed buckle folder",
    maxSheetIn: { w: 20, h: 33 },
    notes: [
      "Plate 2026-09-02: manufactured by stahl U.S.A., model 1220B-4-P-3, series STAHL20, serial 120LG0087.",
      "4 buckle plates, pile feeder. Dealer family spec max 20×33 in.",
      "Do not assign fold-mailer (letters stay Baum 714).",
      "Do not assume an 8-page right-angle unit / 8PG until a second plate.",
    ],
    floorFacts: ["Serial 120LG0087", "208/230 V 3 PH 25 A"],
  },
  {
    id: "graphic-whizard-creasemaster-plus-ts",
    name: "Graphic Whizard CreaseMaster Plus TS",
    kind: "creaser",
    confidence: "confident",
    role: "Creaser / perforator",
    notes: ["Score covers and heavy stock before fold."],
  },
  {
    id: "rhin-o-tuff-od-4012",
    name: "Rhin-O-Tuff OD 4012",
    kind: "bind",
    confidence: "confident",
    role: "Punch / bind",
    notes: ["Coil / comb punch path."],
  },
  {
    id: "challenge-eh3a",
    name: "Challenge EH-3A",
    kind: "drill",
    confidence: "confident",
    role: "Paper drill",
    notes: ["3-hole and custom drill."],
  },
  {
    id: "seal-44-ultra-plus",
    name: "SEAL 44 Ultra Plus",
    kind: "laminator",
    confidence: "confident",
    role: "44 in laminator",
    notes: ["Wide roll laminate."],
  },
  {
    id: "salco-rapid-106e",
    name: "Salco Rapid 106E",
    kind: "stitcher",
    confidence: "confident",
    role: "Stitcher / booklet staple",
    notes: [
      "Overflow / offline saddle only when neither in-line booklet maker is the path.",
      "Corner staple and side staple stay on this stitcher.",
    ],
  },
  {
    id: "minipack-replay-55",
    name: "Minipack Replay 55",
    kind: "shrink",
    confidence: "confident",
    role: "Shrink wrap",
    notes: ["Retail / ship packs."],
  },
  {
    id: "summa-s2t140",
    name: "Summa S2 T140",
    kind: "vinyl",
    confidence: "confident",
    role: "Vinyl cutter — not a paper guillotine",
    notes: [
      "53.1 in vinyl cutter — not a paper guillotine.",
      "Never route paper trimming here.",
    ],
    floorFacts: ["53.1 in vinyl width", "Not a paper cutter"],
  },
  {
    id: "heat-press-hp3808in1",
    name: "Heat press HP380 8-in-1",
    kind: "heat-press",
    confidence: "confident",
    role: "Garment / hard-good heat apply",
    notes: ["Transfers and small hard goods."],
  },
  {
    id: "epson-expression-11000xl",
    name: "Epson Expression 11000XL",
    kind: "scanner",
    confidence: "confident",
    role: "Tabloid flatbed scanner",
    notes: ["Scan originals up to tabloid."],
  },
  {
    id: "pitney-bowes-connect-plus-2000",
    name: "Pitney Bowes Connect+ 2000",
    kind: "meter",
    confidence: "confident",
    role: "Postage meter (First-Class metered)",
    notes: [
      "Actionable now for metered FCM.",
      "Do not display meter identifiers or USPS account numbers.",
    ],
  },
  {
    id: "pitney-bowes-w360",
    name: "Pitney Bowes W+360",
    kind: "inserter",
    confidence: "confident",
    role: "Insert / mail finishing",
    notes: ["Inserting path. Not a rate source."],
  },
  {
    id: "usps-banding-tp-202",
    name: "USPS banding TP-202",
    kind: "banding",
    confidence: "confident",
    role: "Tray / bundle banding",
    notes: ["Physical banding only."],
  },
  {
    id: "mailbot",
    name: "MAILBOT",
    kind: "email-only",
    confidence: "skip",
    role: "Email only — never assign USPS mailing",
    notes: ["Inbox automation. Not a mailing induction path."],
  },
];

export const CONFIDENT_IDS = [
  "versant-4100",
  "xerox-pr-booklet-maker-finisher",
  "accurio-6120",
  "accurio-saddle-booklet-maker",
  "accurio-top-feeder",
  "kyocera-taskalfa-2554ci",
  "xante-x36",
  "xante-enpress",
  "xante-uv-unlimited",
  "challenge-305-crt",
  "baumfolder-714",
  "stahl-folder",
  "graphic-whizard-creasemaster-plus-ts",
  "rhin-o-tuff-od-4012",
  "challenge-eh3a",
  "seal-44-ultra-plus",
  "salco-rapid-106e",
  "minipack-replay-55",
  "summa-s2t140",
  "heat-press-hp3808in1",
  "epson-expression-11000xl",
  "pitney-bowes-connect-plus-2000",
  "pitney-bowes-w360",
  "usps-banding-tp-202",
] as const;

export function machineById(id: string): Machine | undefined {
  return MACHINES.find((m) => m.id === id);
}

export function confidentMachines(): Machine[] {
  return MACHINES.filter((m) => m.confidence === "confident");
}

export function neverRouteIds(): string[] {
  return MACHINES.filter((m) => m.confidence === "skip").map((m) => m.id);
}

export const FORBIDDEN_UI_STRINGS = [
  "PZZ447134",
  "fiery",
  "allegraphilly.com",
] as const;
