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
    ],
    floorFacts: ["Color", "Sheet-fed production"],
  },
  {
    id: "accurio-6120",
    name: "Konica Minolta AccurioPress 6120",
    kind: "press-bw",
    confidence: "confident",
    role: "Black-and-white production press",
    maxParentIn: { w: 13, h: 19.2 },
    notes: ["B&W production path."],
    floorFacts: ["B&W", "Sheet-fed production"],
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
    role: "Tabletop folder",
    notes: ["Letter / half / Z folds for letter-size work."],
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
    notes: ["Saddle / corner stitch."],
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
  "accurio-6120",
  "kyocera-taskalfa-2554ci",
  "xante-x36",
  "xante-enpress",
  "xante-uv-unlimited",
  "challenge-305-crt",
  "baumfolder-714",
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
