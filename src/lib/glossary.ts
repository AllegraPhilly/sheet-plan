/** One-line shop-floor definitions. Do not invent postage rates or change buy-score math. */

export type GlossaryEntry = {
  label: string;
  def: string;
};

export const GLOSSARY = {
  parent: {
    label: "parent",
    def: "The sheet you buy and print on, then cut down to the finished piece.",
  },
  nUp: {
    label: "n-up",
    def: "How many finished pieces fit on one parent sheet.",
  },
  buyScore: {
    label: "buy score",
    def: "Not dollars. Sheets to buy × how big the parent is vs 8.5×11. Lowest wins. Ties: fewer impressions, then fewer cuts.",
  },
  impressions: {
    label: "impressions",
    def: "How many times the press runs the sheet. 2-up halves clicks vs 1-up.",
  },
  cutClick: {
    label: "cut count",
    def: "How many Challenge 305 CRT strokes on that parent. Splits between n-up pieces plus face trims (gripper leftover, trim/bleed, unused margin).",
  },
  finish: {
    label: "finish W/H",
    def: "Size of the piece the customer gets after cut.",
  },
  gripper: {
    label: "gripper",
    def: "Press edge that holds the sheet; we leave 0.25 in except when letter tiles exactly on 11×17.",
  },
  trim: {
    label: "trim",
    def: "0.125 in extra around the finish so the cut is clean.",
  },
  exactTile: {
    label: "exact tile",
    def: "8.5×11 on 11×17 fits 2-up with no gripper/trim waste (one cut).",
  },
  saddle: {
    label: "saddle booklet",
    def: "One fold, 4 pages per signature sheet. Signature is 2× the finish in one dimension, nested on the cheapest parent. Not letter 2-up cut on the Challenge.",
  },
  mixed: {
    label: "mixed",
    def: "Part color, part B&W. Flats: Qty is the total; color qty fills B&W as you type (two stacks: Versant + Accurio — separate jobs). Booklets and stapled/coil packs: cover color + B&W insides describes the job; PLAN is one Versant stack. Don’t split cover/insides across presses (too much handling). Saddle custom splits stay ÷4. Bind that stack off-press (Whizard / Baum / Salco).",
  },
  size: {
    label: "size",
    def: "Shortcut that fills finish W and H. Custom or any typed number still plans — this is not a whitelist.",
  },
  substrate: {
    label: "substrate",
    def: "What you print on (paper, envelope, vinyl, garment, UV).",
  },
  internal: {
    label: "INTERNAL",
    def: "Shop-floor tool, not a customer site.",
  },
  fcm: {
    label: "First-Class (FCM)",
    def: "Stamped or metered letters/cards/flats. Range 1–5 days, not a guaranteed 2–3.",
  },
  mm: {
    label: "Marketing Mail (MM)",
    def: "Cheaper bulk; needs permit/CRID. Shop: not open yet — show as once eligible.",
  },
  eddm: {
    label: "EDDM-Retail",
    def: "Every Door Direct Mail at the retail counter. No permit imprint. Flats only. A CRID is required (number not shown).",
  },
  permit: {
    label: "permit / CRID",
    def: "USPS account to enter commercial MM/FCM. Closed here until confirmed. No CRID number on file — do not guess open.",
  },
  entry: {
    label: "Origin / DSCF / DDU",
    def: "Where you enter the mail (local plant / sectional facility / delivery unit). DDU letters are not offered.",
  },
  nonmachinable: {
    label: "nonmachinable",
    def: "Extra $0.49 when a letter can't run on USPS machines (too stiff, square, etc.).",
  },
  tabbed: {
    label: "tabbed self-mailer",
    def: "Folded piece held with nonperforated tabs so it can meter without an envelope. FSM max 6×10.5 in / 3 oz — smaller than an enveloped letter. Not a booklet.",
  },
  notice123: {
    label: "Notice 123",
    def: "USPS price list. Missing cells say see Notice 123 — never invent a rate.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
