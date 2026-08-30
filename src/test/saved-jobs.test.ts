import { describe, expect, it } from "vitest";
import { FORBIDDEN_UI_STRINGS } from "@/lib/machines";
import {
  MAX_SAVED_JOBS,
  deleteSavedJob,
  loadSavedJobs,
  parseSavedJobs,
  savedJobLabel,
  serializeSavedJobs,
  upsertSavedJob,
  type SavedJob,
} from "@/lib/planner/saved-jobs";
import { autoDescription, defaultTicket, todayISO } from "@/lib/planner/ticket-text";
import { planFromJob } from "@/lib/planner/plan";

function bag() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

function sample(over: Partial<SavedJob> = {}): SavedJob {
  const ticket = defaultTicket();
  return {
    id: "a",
    savedAt: "2026-08-30T12:00:00.000Z",
    customer: "City Hall",
    jobDate: "2026-08-30",
    ticket,
    plan: planFromJob(ticket),
    planError: null,
    ...over,
  };
}

describe("auto ticket line", () => {
  it("builds a one-liner from qty, finish, color, sides, fold, bind, substrate", () => {
    expect(autoDescription(defaultTicket())).toBe("500 color 8.5×11 1-sided");
    expect(
      autoDescription({
        qty: 5000,
        finishW: 6,
        finishH: 9,
        color: "color",
        sides: 2,
        fold: "none",
        bind: "none",
        substrate: "paper",
      }),
    ).toBe("5000 color 6×9 2-sided");
    expect(
      autoDescription({
        qty: 250,
        finishW: 8.5,
        finishH: 11,
        color: "bw",
        sides: 1,
        fold: "letter",
        bind: "staple",
        substrate: "envelope",
      }),
    ).toBe("250 B&W 8.5×11 1-sided letter fold stitch envelope");
  });

  it("todayISO is local Y-M-D, not a UTC day shift", () => {
    expect(todayISO(new Date(2026, 7, 30, 22, 0, 0))).toBe("2026-08-30");
  });
});

describe("saved jobs local store", () => {
  it("round-trips a ticket + plan snapshot with no login fields", () => {
    const store = bag();
    const job = sample();
    const listed = upsertSavedJob(job, store);
    expect(listed).toHaveLength(1);
    expect(listed[0].customer).toBe("City Hall");
    expect(listed[0].ticket.qty).toBe(500);
    expect(listed[0].plan?.recommended.parent.id).toBe("tabloid");
    expect(listed[0].plan?.recommended.nUp).toBe(2);
    expect(JSON.stringify(listed[0])).not.toMatch(/password|account|login|oauth/i);
    expect(loadSavedJobs(store)[0].id).toBe("a");
    expect(savedJobLabel(listed[0])).toBe("City Hall · 2026-08-30 · 500 color 8.5×11 1-sided");
  });

  it("updates the same id and deletes", () => {
    const store = bag();
    upsertSavedJob(sample(), store);
    upsertSavedJob(sample({ customer: "Library", savedAt: "2026-08-30T13:00:00.000Z" }), store);
    expect(loadSavedJobs(store)).toHaveLength(1);
    expect(loadSavedJobs(store)[0].customer).toBe("Library");
    expect(deleteSavedJob("a", store)).toEqual([]);
  });

  it("walk-up label when customer is blank; ignores junk JSON", () => {
    expect(savedJobLabel(sample({ customer: "  ", ticket: { ...defaultTicket(), description: "" } }))).toMatch(
      /^Walk-up · /,
    );
    expect(parseSavedJobs("not-json")).toEqual([]);
    expect(parseSavedJobs(JSON.stringify({ v: 2, jobs: [sample()] }))).toEqual([]);
    const raw = serializeSavedJobs([sample(), { nope: true } as unknown as SavedJob]);
    expect(parseSavedJobs(raw)).toHaveLength(1);
  });

  it("caps the list and never stores forbidden hosts", () => {
    const store = bag();
    for (let i = 0; i < MAX_SAVED_JOBS + 5; i += 1) {
      upsertSavedJob(sample({ id: `id-${i}`, savedAt: `2026-08-30T${String(i).padStart(2, "0")}:00:00.000Z` }), store);
    }
    expect(loadSavedJobs(store)).toHaveLength(MAX_SAVED_JOBS);
    const blob = serializeSavedJobs(loadSavedJobs(store)).toLowerCase();
    for (const s of FORBIDDEN_UI_STRINGS) {
      expect(blob).not.toContain(s.toLowerCase());
    }
    expect(blob).not.toContain("vercel");
  });

  it("6×9 snapshot still records 12×18 4-up exact tile", () => {
    const ticket = {
      ...defaultTicket(),
      qty: 5000,
      finishW: 6,
      finishH: 9,
      sides: 2 as const,
      description: autoDescription({
        qty: 5000,
        finishW: 6,
        finishH: 9,
        color: "color" as const,
        sides: 2,
        fold: "none",
        bind: "none",
        substrate: "paper",
      }),
    };
    const plan = planFromJob(ticket);
    expect(plan.recommended.parent.id).toBe("12x18");
    expect(plan.recommended.nUp).toBe(4);
    expect(plan.recommended.exactTile).toBe(true);
  });
});
