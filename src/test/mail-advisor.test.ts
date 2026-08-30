import { describe, expect, it } from "vitest";
import { adviceHasProfitFlag, adviseMail, mailingAssignees } from "@/lib/mail/advise";
import { EDDM_RETAIL, FCM, FEES, MM } from "@/lib/mail/rates";
import { PHILLY_BMEU, type MailInput } from "@/lib/mail/types";

function base(over: Partial<MailInput> = {}): MailInput {
  return {
    piece: "letter",
    qty: 250,
    addressing: "personalized",
    widthIn: 8.5,
    heightIn: 11,
    thicknessIn: 0.01,
    weightOz: 1,
    fold: "none",
    nonprofit: false,
    goal: "cheapest-actionable",
    content: "advertising",
    ...over,
  };
}

describe("Mail Advisor acceptance (10)", () => {
  it("1. content-first: bills stay FCM and do not become actionable MM", () => {
    const advice = adviseMail(
      base({
        content: "first-class-matter",
        description: "monthly invoice",
        qty: 2000,
      }),
    );
    expect(advice.contentGate.fcmRequired).toBe(true);
    expect(advice.actionable.every((c) => c.className !== "MM")).toBe(true);
    expect(advice.actionable.some((c) => c.id === "fcm-meter-letter")).toBe(true);
    const mm = advice.onceEligible.filter((c) => c.className === "MM");
    expect(mm.length).toBeGreaterThan(0);
    expect(mm.every((c) => c.eligibleNow === false)).toBe(true);
  });

  it("2. permit/CRID commercial MM/FCM is NOT OPEN — shop_blockers permit_not_open", () => {
    const advice = adviseMail(base({ qty: 800, content: "advertising" }));
    const blocked = [...advice.onceEligible, ...advice.fees.filter((f) => f.className !== "EDDM-Retail")];
    expect(blocked.length).toBeGreaterThan(0);
    for (const c of blocked) {
      expect(c.eligibleNow).toBe(false);
      expect(c.shop_blockers).toContain("permit_not_open");
    }
    const comm = advice.onceEligible.find((c) => c.id === "fcm-comm-auto-5d");
    expect(comm?.amount).toBe(FCM.commAuto5digitLetter.amount);
    expect(comm?.shop_blockers).toContain("permit_not_open");
  });

  it("3. actionable now: metered FCM, EDDM-Retail, tabbed self-mailers", () => {
    const letter = adviseMail(base({ piece: "letter", content: "unknown" }));
    expect(letter.actionable.some((c) => c.id === "fcm-meter-letter" && c.eligibleNow)).toBe(true);

    const eddm = adviseMail(
      base({
        piece: "eddm-flat",
        addressing: "occupant-eddm",
        widthIn: 9,
        heightIn: 12,
        weightOz: 3,
        content: "advertising",
      }),
    );
    expect(eddm.actionable.some((c) => c.id === "eddm-retail-flat" && c.amount === 0.26)).toBe(true);

    const self = adviseMail(base({ piece: "self-mailer", fold: "self-mailer", tabbed: true }));
    expect(self.selfMailer.tabbedRequired).toBe(true);
    expect(self.actionable.some((c) => c.id === "fcm-meter-letter")).toBe(true);
    expect(self.selfMailer.note.toLowerCase()).toMatch(/tabbed self-mailer/);
  });

  it("4. never invent rates — miss points at Notice 123", () => {
    const advice = adviseMail(base({ piece: "letter", weightOz: 4 }));
    expect(advice.missing.some((m) => /Notice 123/.test(m))).toBe(true);
    expect(advice.actionable.every((c) => c.amount !== null)).toBe(true);
    expect(advice.notice.miss).toMatch(/does not invent rates/);
  });

  it("5. hardcoded FCM retail 1 oz stamp 0.82 / meter 0.78 page 6; postcard 0.65; nonmachinable 0.49", () => {
    const letter = adviseMail(base({ weightOz: 1 }));
    expect(letter.actionable.find((c) => c.id === "fcm-meter-letter")).toMatchObject({
      amount: 0.78,
      page: 6,
    });
    expect(letter.actionable.find((c) => c.id === "fcm-stamp-letter")).toMatchObject({
      amount: 0.82,
      page: 6,
    });
    const card = adviseMail(base({ piece: "postcard", widthIn: 4, heightIn: 6, weightOz: 0.3 }));
    expect(card.actionable.find((c) => c.id === "fcm-postcard")?.amount).toBe(0.65);
    expect(FCM.nonmachinable).toEqual({ amount: 0.49, page: 6 });
  });

  it("6. EDDM-Retail 0.260 and annual fee $0; nonprofit cannot apply (DMM 143.1.1)", () => {
    const advice = adviseMail(
      base({
        piece: "eddm-flat",
        addressing: "occupant-eddm",
        weightOz: 2,
        nonprofit: true,
        content: "advertising",
        widthIn: 9,
        heightIn: 12,
      }),
    );
    expect(advice.actionable.find((c) => c.id === "eddm-retail-flat")?.amount).toBe(0.26);
    const fee = advice.fees.find((c) => c.id === "fee-eddm-retail-annual");
    expect(fee?.amount).toBe(0);
    expect(fee?.notes.join(" ")).toMatch(/143\.1\.1/);
    expect(advice.missing.some((m) => /Nonprofit/.test(m))).toBe(true);
    expect(EDDM_RETAIL.annualFee.amount).toBe(0);
  });

  it("7. MM DDU letters not offered; MM letter cells are once-eligible + blocked", () => {
    expect(MM.letterDdu).toBeNull();
    const advice = adviseMail(base({ piece: "letter", weightOz: 1 }));
    expect(advice.onceEligible.some((c) => /DDU letter/i.test(c.label))).toBe(false);
    expect(advice.onceEligible.find((c) => c.id === "mm-letter-auto-5d-origin")?.amount).toBe(0.395);
    expect(advice.onceEligible.find((c) => c.id === "mm-letter-auto-5d-dscf")?.amount).toBe(0.374);
    expect(advice.onceEligible.find((c) => c.id === "mm-letter-mixed")?.amount).toBe(0.473);
  });

  it("8. speed: FCM 1–5 days never 2–3; MM/EDDM no guaranteed day", () => {
    const advice = adviseMail(base());
    expect(advice.speed.fcm).toMatch(/1–5 days/);
    expect(advice.speed.fcm).not.toMatch(/2–3/);
    expect(JSON.stringify(advice)).not.toMatch(/2-3 days/);
    expect(advice.speed.mm).toMatch(/243\.3\.1\.1/);
    expect(advice.speed.eddm).toMatch(/143\.2\.1/);
    expect(advice.speed.mm).toMatch(/no guaranteed/);
    expect(advice.speed.eddm).toMatch(/no guaranteed/);
  });

  it("9. never emit profit_flag; BMEU 7500 Lindbergh Blvd 19176", () => {
    const advice = adviseMail(base());
    expect(adviceHasProfitFlag(advice)).toBe(false);
    expect(advice.induction.bmeu).toEqual({
      name: PHILLY_BMEU.name,
      address: "7500 Lindbergh Blvd",
      city: "Philadelphia, PA",
      zip: "19176",
    });
    expect(JSON.stringify(advice)).not.toMatch(/profit_flag/);
  });

  it("10. MAILBOT is never assigned USPS mailing", () => {
    const advice = adviseMail(base({ piece: "eddm-flat", addressing: "occupant-eddm", content: "advertising" }));
    const assignees = mailingAssignees(advice);
    expect(assignees).not.toContain("mailbot");
    expect(assignees).toContain("pitney-bowes-connect-plus-2000");
    expect(JSON.stringify(advice).toLowerCase()).not.toMatch(/mailbot/);
  });
});

describe("Notice 123 hardcoded extras", () => {
  it("stamped / metered extra ounces and 1 oz flat", () => {
    expect(adviseMail(base({ weightOz: 2 })).actionable.find((c) => c.id === "fcm-stamp-letter")?.amount).toBe(1.11);
    expect(adviseMail(base({ weightOz: 3 })).actionable.find((c) => c.id === "fcm-meter-letter")?.amount).toBe(1.36);
    expect(adviseMail(base({ weightOz: 3.5 })).actionable.find((c) => c.id === "fcm-stamp-letter")?.amount).toBe(1.69);
    expect(
      adviseMail(base({ piece: "flat", widthIn: 9, heightIn: 12, weightOz: 1 })).actionable.find(
        (c) => c.id === "fcm-flat-1oz",
      )?.amount,
    ).toBe(1.69);
  });

  it("FCM comm auto 5-digit only when qty ≥ 500", () => {
    const low = adviseMail(base({ qty: 499, content: "advertising" }));
    const high = adviseMail(base({ qty: 500, content: "advertising" }));
    expect(low.onceEligible.some((c) => c.id === "fcm-comm-auto-5d")).toBe(false);
    expect(high.onceEligible.some((c) => c.id === "fcm-comm-auto-5d" && c.amount === 0.621)).toBe(true);
  });

  it("MM commercial EDDM flats and p.33 fees", () => {
    const advice = adviseMail(
      base({ piece: "eddm-flat", addressing: "occupant-eddm", widthIn: 10, heightIn: 13, content: "advertising" }),
    );
    expect(advice.onceEligible.find((c) => c.id === "mm-eddm-origin")?.amount).toBe(0.309);
    expect(advice.onceEligible.find((c) => c.id === "mm-eddm-dscf")?.amount).toBe(0.268);
    expect(advice.onceEligible.find((c) => c.id === "mm-eddm-ddu")?.amount).toBe(0.259);
    expect(FEES.permitImprint).toEqual({ amount: 390, page: 33 });
    expect(FEES.mmAnnual).toEqual({ amount: 390, page: 33 });
    expect(FEES.fcmPresortAnnual).toEqual({ amount: 390, page: 33 });
  });
});
