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
    label: "click",
    def: "One cut on the Challenge 305 CRT.",
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
    def: "Every Door Direct Mail at the retail counter. No permit. Flats to a carrier route.",
  },
  permit: {
    label: "permit / CRID",
    def: "USPS account to enter commercial MM/FCM. Closed here until confirmed.",
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
    def: "Folded piece held with tabs so it can meter without an envelope.",
  },
  notice123: {
    label: "Notice 123",
    def: "USPS price list. Missing cells say see Notice 123 — never invent a rate.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
