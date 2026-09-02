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

  it("9. never emit profit_flag; BMEU Premier 7500 Lindbergh Blvd 19176", () => {
    const advice = adviseMail(base());
    expect(adviceHasProfitFlag(advice)).toBe(false);
    expect(advice.induction.bmeu).toMatchObject({
      name: PHILLY_BMEU.name,
      address: "7500 Lindbergh Blvd",
      city: "Philadelphia, PA",
      zip: "19176",
      phone: "1-877-672-0007",
    });
    expect(advice.induction.bmeu.name).toMatch(/Premier/);
    expect(advice.induction.destScf).toBe("SCF PHILADELPHIA PA 190");
    expect(advice.induction.destScfZips).toBe("189–192, 194");
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
    expect(advice.onceEligible.find((c) => c.id === "mm-eddm-origin")?.shop_blockers).toContain("permit_not_open");
    expect(advice.onceEligible.find((c) => c.id === "mm-eddm-origin")?.notes.join(" ")).toMatch(/0\.1/);
    expect(FEES.permitImprint).toEqual({ amount: 390, page: 33 });
    expect(FEES.mmAnnual).toEqual({ amount: 390, page: 33 });
    expect(FEES.fcmPresortAnnual).toEqual({ amount: 390, page: 33 });
  });
});

describe("Mail Advisor GAPS", () => {
  it("rejects a letter-size self-mailer as EDDM and offers redesign", () => {
    const advice = adviseMail(
      base({
        piece: "self-mailer",
        fold: "tri",
        widthIn: 8.5,
        heightIn: 11,
        addressing: "occupant-eddm",
        goal: "saturation",
        content: "advertising",
        qty: 500,
      }),
    );
    expect(advice.actionable.some((c) => c.id === "eddm-retail-flat")).toBe(false);
    expect(advice.pieceGate.letterSelfMailer).toBe(true);
    const reject = advice.decisions.find((d) => d.id === "eddm-letter-self-mailer-reject");
    expect(reject?.kind).toBe("reject");
    expect(reject?.say).toMatch(/not EDDM/i);
    expect(reject?.shop).toMatch(/redesign/i);
    expect(reject?.shop).toMatch(/letter/i);
    expect(advice.actionable.some((c) => c.id === "fcm-meter-letter")).toBe(true);
  });

  it("rejects letter-finished EDDM-flat piece that is not a flat", () => {
    const advice = adviseMail(
      base({
        piece: "eddm-flat",
        fold: "none",
        widthIn: 8.5,
        heightIn: 5.5,
        thicknessIn: 0.02,
        addressing: "occupant-eddm",
        content: "advertising",
        qty: 400,
      }),
    );
    expect(advice.actionable.some((c) => c.id === "eddm-retail-flat")).toBe(false);
    expect(advice.decisions.some((d) => d.id === "eddm-letter-self-mailer-reject" || d.id === "eddm-shape-reject")).toBe(
      true,
    );
  });

  it("FCM meter ounce steps 1 / 2 / 3 / 3.5 and does not interpolate 4 oz", () => {
    expect(adviseMail(base({ weightOz: 1 })).actionable.find((c) => c.id === "fcm-meter-letter")?.amount).toBe(0.78);
    expect(adviseMail(base({ weightOz: 2 })).actionable.find((c) => c.id === "fcm-meter-letter")?.amount).toBe(1.07);
    expect(adviseMail(base({ weightOz: 3 })).actionable.find((c) => c.id === "fcm-meter-letter")?.amount).toBe(1.36);
    expect(adviseMail(base({ weightOz: 3.5 })).actionable.find((c) => c.id === "fcm-meter-letter")?.amount).toBe(1.65);
    const over = adviseMail(base({ weightOz: 4 }));
    expect(over.actionable.some((c) => c.id === "fcm-meter-letter")).toBe(false);
    expect(over.missing.join(" ")).toMatch(/flats prices/);
    expect(over.missing.join(" ")).toMatch(/Notice 123/);
  });

  it("retail card 0.65 p.6 max 4.25×6×0.016", () => {
    const card = adviseMail(
      base({ piece: "card", widthIn: 6, heightIn: 4.25, thicknessIn: 0.016, weightOz: 0.3 }),
    );
    expect(card.actionable.find((c) => c.id === "fcm-postcard")).toMatchObject({ amount: 0.65, page: 6 });
    const thick = adviseMail(
      base({ piece: "card", widthIn: 6, heightIn: 4.25, thicknessIn: 0.02, weightOz: 0.3 }),
    );
    expect(thick.actionable.some((c) => c.id === "fcm-postcard")).toBe(false);
  });

  it("retail FCM flat 1 oz is 1.69 p.6", () => {
    const flat = adviseMail(base({ piece: "flat", widthIn: 9, heightIn: 12, weightOz: 1 }));
    expect(flat.actionable.find((c) => c.id === "fcm-flat-1oz")).toMatchObject({ amount: 1.69, page: 6 });
  });

  it("nonmachinable letter surcharge is 0.49 p.6 n.1", () => {
    expect(FCM.nonmachinable).toEqual({ amount: 0.49, page: 6 });
    const square = adviseMail(
      base({ piece: "letter", widthIn: 5, heightIn: 5, thicknessIn: 0.02, weightOz: 1, fold: "none" }),
    );
    const sur = square.actionable.find((c) => c.id === "fcm-nonmach-surcharge");
    expect(sur).toMatchObject({ amount: 0.49, page: 6 });
    expect(sur?.notes.join(" ")).toMatch(/n\.1/);
  });

  it("named ads under 200 stay on metered FCM; 200+ MM is locked at the BMEU", () => {
    const low = adviseMail(base({ qty: 199, addressing: "personalized", content: "advertising" }));
    expect(low.actionable.some((c) => c.id === "fcm-meter-letter")).toBe(true);
    expect(low.onceEligible.some((c) => c.className === "MM")).toBe(false);
    expect(low.decisions.some((d) => d.id === "named-ads-under-200")).toBe(true);

    const high = adviseMail(base({ qty: 200, addressing: "personalized", content: "advertising" }));
    expect(high.onceEligible.filter((c) => c.className === "MM").every((c) => c.shop_blockers.includes("permit_not_open"))).toBe(
      true,
    );
    expect(high.decisions.some((d) => d.id === "named-ads-200")).toBe(true);
  });

  it("staff copy is Say this / Why (DMM) / What we do; content first; no_addresser; one meter", () => {
    const advice = adviseMail(base());
    expect(advice.decisions[0]?.id).toBe("content-first");
    for (const d of advice.decisions) {
      expect(d.say.length).toBeGreaterThan(10);
      expect(d.why.length).toBeGreaterThan(5);
      expect(d.shop.length).toBeGreaterThan(5);
    }
    expect(advice.shop.no_addresser).toBe(true);
    expect(advice.shop.permit_not_open).toBe(true);
    expect(advice.shop.no_select_plus).toBe(true);
    expect(advice.shop.no_confirmed_inserter).toBe(true);
    expect(advice.shop.no_imsb).toBe(true);
    expect(advice.shop.postal_wizard_locked).toBe(true);
    expect(advice.induction.meterMachineId).toBe("pitney-bowes-connect-plus-2000");
  });

  it("EDDM-Retail notes CRID without a number, Form 3587, and drop rules", () => {
    const advice = adviseMail(
      base({
        piece: "eddm-flat",
        addressing: "occupant-eddm",
        widthIn: 9,
        heightIn: 12,
        weightOz: 3,
        content: "advertising",
      }),
    );
    const notes = advice.actionable.find((c) => c.id === "eddm-retail-flat")?.notes.join(" ") ?? "";
    expect(notes).toMatch(/3587/);
    expect(notes).toMatch(/144\.1\.2/);
    expect(notes).toMatch(/CRID/);
    expect(notes).toMatch(/number not displayed/i);
    expect(notes).not.toMatch(/CRID\s*#?\s*\d{3,}/);
    expect(JSON.stringify(advice)).not.toMatch(/fiery/i);
    expect(advice.decisions.some((d) => d.id === "eddm-retail-do")).toBe(true);
    expect(notes).toMatch(/Straps \(TP-202\)/);
    expect(notes).toMatch(/not rubber bands/);
    expect(advice.eddmIndicia?.lines).toEqual(["PRSRT STD", "ECRWSS", "U.S. POSTAGE PAID", "EDDM RETAIL"]);
    expect(advice.eddmIndicia?.simplifiedAddress).toBe("LOCAL POSTAL CUSTOMER");
    expect(advice.eddmIndicia?.typeSpec).toMatch(/4 pt ALL CAPS/);
    expect(JSON.stringify(advice.eddmIndicia)).not.toMatch(/\b\d{2}-\d{3,}/);
  });

  it("11×17 parent is flagged; envelopes skip tabs; booklets are not W360 default", () => {
    const parent = adviseMail(base({ widthIn: 11, heightIn: 17, piece: "letter" }));
    expect(parent.pieceGate.parentSheet).toBe(true);
    expect(parent.decisions.some((d) => d.id === "parent-not-usps")).toBe(true);

    const env = adviseMail(base({ piece: "envelope", fold: "none" }));
    expect(env.selfMailer.tabbedRequired).toBe(false);
    expect(env.selfMailer.note).toMatch(/skip tabs/i);
    expect(env.induction.mailingAssignedTo).not.toContain("pitney-bowes-w360");

    const book = adviseMail(base({ piece: "booklet" }));
    expect(book.selfMailer.note).toMatch(/201\.3\.16/);
    expect(book.selfMailer.note).toMatch(/bound-spine/);
    expect(book.selfMailer.note).toMatch(/bi-fold/);
    expect(book.induction.mailingAssignedTo).not.toContain("pitney-bowes-w360");
    expect(book.decisions.find((d) => d.id === "booklet-201-3-16")?.say).toMatch(/not a folded self-mailer/i);
  });

  it("never assigns MAILBOT and never quotes FCM as 2–3 or 2021 1–3 days", () => {
    const advice = adviseMail(base({ piece: "eddm-flat", addressing: "occupant-eddm", widthIn: 12, heightIn: 9 }));
    expect(mailingAssignees(advice)).not.toContain("mailbot");
    expect(JSON.stringify(advice).toLowerCase()).not.toMatch(/mailbot/);
    expect(advice.speed.fcm).toMatch(/1–5/);
    expect(advice.speed.fcm).not.toMatch(/2–3/);
    expect(JSON.stringify(advice)).not.toMatch(/1–3/);
    expect(JSON.stringify(advice)).not.toMatch(/1-3 days/);
  });

  it("DMM 201 FSM letters: 6×10.5 / 3 oz, 1\" tabs (1.5\" >1 oz), two placements, quarter-fold tabs only", () => {
    const ok = adviseMail(
      base({
        piece: "self-mailer",
        fold: "half",
        widthIn: 8.5,
        heightIn: 11,
        weightOz: 1,
      }),
    );
    const fsm = ok.decisions.find((d) => d.id === "fsm-tabs");
    expect(ok.selfMailer.fsmOk).toBe(true);
    expect(ok.selfMailer.tabIn).toBe(1);
    expect(fsm?.kind).toBe("do");
    expect(fsm?.say).toMatch(/below or to the right/i);
    expect(fsm?.why).toMatch(/two on top within 1/);
    expect(fsm?.why).toMatch(/70# book/);
    expect(fsm?.why).toMatch(/postalpro\.usps\.com\/node\/2711/);
    expect(fsm?.shop).toMatch(/1\.5/);
    expect(fsm?.shop).toMatch(/Baum 714/);
    expect(JSON.stringify(ok).toLowerCase()).not.toMatch(/stahl/);
    expect(mailingAssignees(ok)).not.toContain("accurio-top-feeder");
    expect(JSON.stringify(ok.induction)).not.toMatch(/accurio-top-feeder|unit top feeder/i);
    expect(ok.selfMailer.note).toMatch(/Baum 714/);
    expect(ok.selfMailer.note).not.toMatch(/accurio-top-feeder|unit top feeder/i);
    expect(ok.selfMailer.note).not.toMatch(/final fold on the bottom/i);

    const heavy = adviseMail(base({ piece: "self-mailer", fold: "half", widthIn: 8.5, heightIn: 11, weightOz: 1.2 }));
    expect(heavy.selfMailer.tabIn).toBe(1.5);
    expect(heavy.decisions.find((d) => d.id === "fsm-tabs")?.say).toMatch(/1\.5/);

    const tooTall = adviseMail(
      base({ piece: "self-mailer", fold: "none", widthIn: 10.5, heightIn: 6.125, weightOz: 1 }),
    );
    expect(tooTall.selfMailer.fsmOk).toBe(false);
    expect(tooTall.decisions.find((d) => d.id === "fsm-tabs")?.kind).toBe("hold");
    expect(tooTall.decisions.find((d) => d.id === "fsm-tabs")?.say).toMatch(/6" H/);

    const quarter = adviseMail(
      base({ piece: "self-mailer", fold: "quarter", widthIn: 8.5, heightIn: 11, weightOz: 0.8 }),
    );
    expect(quarter.decisions.find((d) => d.id === "fsm-tabs")?.say).toMatch(/tabs only/i);
  });

  it("does not offer IMsb for client mail; Postal Wizard stays locked", () => {
    const advice = adviseMail(base({ qty: 500, content: "advertising" }));
    const line = advice.decisions.find((d) => d.id === "no-imsb-postal-wizard");
    expect(line?.kind).toBe("hold");
    expect(line?.say).toMatch(/Do not offer IMsb/);
    expect(line?.say).toMatch(/Postal Wizard/);
    expect(line?.say).toMatch(/locked/);
    expect(advice.onceEligible.find((c) => c.id === "fcm-comm-auto-5d")?.notes.join(" ")).toMatch(/IMsb/);
    expect(advice.onceEligible.find((c) => c.id === "fcm-comm-auto-5d")?.shop_blockers).toContain("permit_not_open");
  });
});
