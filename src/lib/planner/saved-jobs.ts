import type { JobInput, ProductionPlan } from "./types";

export const SAVED_JOBS_KEY = "sheet-plan.saved-jobs.v1";
export const SAVED_JOBS_VERSION = 1;
export const MAX_SAVED_JOBS = 40;

export type SavedJob = {
  id: string;
  savedAt: string;
  customer: string;
  jobDate: string;
  ticket: JobInput;
  plan: ProductionPlan | null;
  planError: string | null;
};

type Bag = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const memory = new Map<string, string>();
const memoryBag: Bag = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
};

function defaultBag(): Bag {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // private mode / blocked
  }
  return memoryBag;
}

function isTicket(value: unknown): value is JobInput {
  if (!value || typeof value !== "object") return false;
  const t = value as JobInput;
  return (
    typeof t.description === "string" &&
    typeof t.qty === "number" &&
    typeof t.finishW === "number" &&
    typeof t.finishH === "number" &&
    (t.color === "color" || t.color === "bw" || t.color === "mixed" || (t as { color?: string }).color === "auto") &&
    (t.sides === 1 || t.sides === 2)
  );
}

function isSavedJob(value: unknown): value is SavedJob {
  if (!value || typeof value !== "object") return false;
  const j = value as SavedJob;
  return (
    typeof j.id === "string" &&
    j.id.length > 0 &&
    typeof j.savedAt === "string" &&
    typeof j.customer === "string" &&
    typeof j.jobDate === "string" &&
    isTicket(j.ticket)
  );
}

export function parseSavedJobs(raw: string | null): SavedJob[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { v?: number; jobs?: unknown };
    if (data.v !== SAVED_JOBS_VERSION || !Array.isArray(data.jobs)) return [];
    return data.jobs.filter(isSavedJob);
  } catch {
    return [];
  }
}

export function serializeSavedJobs(jobs: SavedJob[]): string {
  return JSON.stringify({ v: SAVED_JOBS_VERSION, jobs });
}

export function loadSavedJobs(bag: Bag = defaultBag()): SavedJob[] {
  return parseSavedJobs(bag.getItem(SAVED_JOBS_KEY)).sort(newestFirst);
}

export function upsertSavedJob(job: SavedJob, bag: Bag = defaultBag()): SavedJob[] {
  const next = [job, ...loadSavedJobs(bag).filter((j) => j.id !== job.id)]
    .sort(newestFirst)
    .slice(0, MAX_SAVED_JOBS);
  bag.setItem(SAVED_JOBS_KEY, serializeSavedJobs(next));
  return next;
}

export function deleteSavedJob(id: string, bag: Bag = defaultBag()): SavedJob[] {
  const next = loadSavedJobs(bag).filter((j) => j.id !== id);
  bag.setItem(SAVED_JOBS_KEY, serializeSavedJobs(next));
  return next;
}

export function newSavedJobId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function savedJobLabel(job: SavedJob): string {
  const name = job.customer.trim() || "Walk-up";
  const line = job.ticket.description.trim() || `${job.ticket.qty} ${job.ticket.finishW}×${job.ticket.finishH}`;
  return `${name} · ${job.jobDate} · ${line}`;
}

function newestFirst(a: SavedJob, b: SavedJob): number {
  return b.savedAt.localeCompare(a.savedAt);
}
