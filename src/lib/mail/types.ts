export type PieceKind =
  | "letter"
  | "postcard"
  | "flat"
  | "self-mailer"
  | "eddm-flat"
  | "card"
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
  fold: "none" | "half" | "tri" | "letter" | "self-mailer";
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

export type MailAdvice = {
  contentGate: {
    class: ContentClass;
    fcmRequired: boolean;
    why: string;
  };
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
    bmeu: { name: string; address: string; city: string; zip: string };
    meterMachineId: string;
    mailingAssignedTo: string[];
  };
  selfMailer: {
    tabbedRequired: boolean;
    note: string;
  };
  profit_flag?: never;
  notice: {
    name: "Notice 123";
    effective: "2026-07-12";
    miss: string;
  };
};

export const PHILLY_BMEU = {
  name: "Philadelphia BMEU",
  address: "7500 Lindbergh Blvd",
  city: "Philadelphia, PA",
  zip: "19176",
} as const;

export const NOTICE = {
  name: "Notice 123" as const,
  effective: "2026-07-12" as const,
  miss: "See Notice 123. This advisor does not invent rates.",
};
