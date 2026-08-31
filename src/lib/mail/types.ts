export type PieceKind =
  | "letter"
  | "postcard"
  | "flat"
  | "self-mailer"
  | "eddm-flat"
  | "card"
  | "envelope"
  | "booklet"
  | "other";

export type Addressing = "none" | "occupant" | "personalized" | "occupant-eddm";
export type Goal = "cheapest-actionable" | "fastest" | "saturation" | "courtesy";
export type ContentClass = "first-class-matter" | "advertising" | "unknown";

export type MailInput = {
  piece: PieceKind;
  qty: number;
  addressing: Addressing;
  widthIn: number;
  heightIn: number;
  thicknessIn: number;
  weightOz: number;
  fold: "none" | "half" | "tri" | "letter" | "quarter" | "self-mailer";
  nonprofit: boolean;
  goal: Goal;
  content: ContentClass;
  tabbed?: boolean;
  description?: string;
};

export type ShopBlocker = "permit_not_open";

export type RateCell = {
  id: string;
  className: "FCM" | "MM" | "EDDM-Retail";
  label: string;
  amount: number | null;
  unit: "per-piece" | "fee";
  page: number | null;
  notice: "Notice 123";
  effective: "2026-07-12";
  eligibleNow: boolean;
  onceEligible: boolean;
  shop_blockers: ShopBlocker[];
  notes: string[];
};

export type StaffLine = {
  id: string;
  kind: "do" | "reject" | "hold";
  say: string;
  why: string;
  shop: string;
};

export type UspsShape = "letter" | "card" | "flat" | "parent-sheet" | "other";

export type PieceGate = {
  finished: { widthIn: number; heightIn: number; thicknessIn: number };
  uspsShape: UspsShape;
  machinableLetter: boolean;
  letterSelfMailer: boolean;
  eddmFlatOk: boolean;
  parentSheet: boolean;
};

export type MailAdvice = {
  contentGate: {
    class: ContentClass;
    fcmRequired: boolean;
    why: string;
  };
  decisions: StaffLine[];
  pieceGate: PieceGate;
  actionable: RateCell[];
  onceEligible: RateCell[];
  fees: RateCell[];
  missing: string[];
  speed: {
    fcm: string;
    mm: string;
    eddm: string;
  };
  induction: {
    bmeu: {
      name: string;
      address: string;
      city: string;
      zip: string;
      phone: string;
    };
    destScf: string;
    destScfZips: string;
    meterMachineId: string;
    mailingAssignedTo: string[];
  };
  shop: {
    permit_not_open: true;
    no_addresser: true;
    no_confirmed_inserter: true;
    one_meter: true;
    no_select_plus: true;
    no_imsb: true;
    postal_wizard_locked: true;
  };
  selfMailer: {
    tabbedRequired: boolean;
    note: string;
    fsmOk?: boolean;
    tabIn?: number;
  };
  eddmIndicia: {
    lines: readonly string[];
    typeSpec: string;
    clearIn: number;
    simplifiedAddress: string;
  } | null;
  profit_flag?: never;
  notice: {
    name: "Notice 123";
    effective: "2026-07-12";
    miss: string;
  };
};

export const PHILLY_BMEU = {
  name: "Philadelphia BMEU Premier",
  address: "7500 Lindbergh Blvd",
  city: "Philadelphia, PA",
  zip: "19176",
  phone: "1-877-672-0007",
} as const;

export const DEST_SCF = {
  name: "SCF PHILADELPHIA PA 190",
  zips: "189–192, 194",
} as const;

export const NOTICE = {
  name: "Notice 123" as const,
  effective: "2026-07-12" as const,
  miss: "See Notice 123. This advisor does not invent rates.",
};
