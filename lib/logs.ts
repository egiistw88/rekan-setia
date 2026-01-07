import {
  db,
  type CareerLogRecord,
  type CareerLeadRecord,
  type DailyLogRecord,
  type FinanceLogRecord,
  type RelationLogRecord,
} from "@/lib/db";
import { getJakartaDateKey, getJakartaDateTime } from "@/lib/time";

type DailyLogPatch = Partial<
  Omit<DailyLogRecord, "dateKey" | "updatedAt" | "updatedAtWib">
>;
type CareerLogPatch = Partial<
  Omit<CareerLogRecord, "dateKey" | "updatedAt" | "updatedAtWib">
>;
type CareerLeadPatch = Partial<Omit<CareerLeadRecord, "id" | "createdAt" | "updatedAt">>;
type FinanceLogPatch = Partial<
  Omit<FinanceLogRecord, "dateKey" | "updatedAt" | "updatedAtWib">
>;
type RelationLogPatch = Partial<
  Omit<RelationLogRecord, "dateKey" | "updatedAt" | "updatedAtWib">
>;

export const getTodayDateKey = () => {
  return getJakartaDateKey(new Date());
};

const getTimestamps = () => {
  const now = new Date();
  return {
    updatedAt: now.toISOString(),
    updatedAtWib: getJakartaDateTime(now),
  };
};

const buildDailyDefaults = (
  dateKey: string,
  timestamps: ReturnType<typeof getTimestamps>,
): DailyLogRecord => ({
  dateKey,
  sleepHours: 0,
  mealsCount: 0,
  breathSessions: 0,
  dropModeRuns: 0,
  moodScore: undefined,
  subuhDone: false,
  ritualDone: false,
  freezeMode: false,
  updatedAt: timestamps.updatedAt,
  updatedAtWib: timestamps.updatedAtWib,
  planChecks: {},
});

const buildCareerDefaults = (
  dateKey: string,
  timestamps: ReturnType<typeof getTimestamps>,
): CareerLogRecord => ({
  dateKey,
  clientChatsSent: 0,
  designMinutes: 0,
  updatedAt: timestamps.updatedAt,
  updatedAtWib: timestamps.updatedAtWib,
});

const buildFinanceDefaults = (
  dateKey: string,
  timestamps: ReturnType<typeof getTimestamps>,
): FinanceLogRecord => ({
  dateKey,
  incomeOjol: 0,
  expenseMakan: 0,
  expenseBensin: 0,
  topupOjol: 0,
  rokokKopi: 0,
  otherExpense: 0,
  cashOnHandTonight: undefined,
  updatedAt: timestamps.updatedAt,
  updatedAtWib: timestamps.updatedAtWib,
  freezeModeApplied: false,
  note: "",
});

const buildRelationDefaults = (
  dateKey: string,
  timestamps: ReturnType<typeof getTimestamps>,
): RelationLogRecord => ({
  dateKey,
  wifeNote: "",
  lastTemplateId: undefined,
  ritualDurationMin: undefined,
  ritualCompletedAtWib: undefined,
  wifeMood: undefined,
  motherContactDone: false,
  updatedAt: timestamps.updatedAt,
  updatedAtWib: timestamps.updatedAtWib,
});

const buildCareerLeadDefaults = (
  id: string,
  timestamps: ReturnType<typeof getTimestamps>,
): CareerLeadRecord => ({
  id,
  name: "",
  platform: "Other",
  handleOrContact: "",
  niche: "Other",
  status: "baru",
  lastContactAtWib: undefined,
  nextFollowupAtWib: undefined,
  notes: "",
  createdAt: timestamps.updatedAt,
  updatedAt: timestamps.updatedAt,
});

export const upsertDailyLogPatch = async (
  dateKey: string,
  patch: DailyLogPatch,
) => {
  const timestamps = getTimestamps();
  const existing = await db.dailyLogs.get(dateKey);
  const base = existing ?? buildDailyDefaults(dateKey, timestamps);
  const nextPlanChecks = patch.planChecks
    ? { ...(base.planChecks ?? {}), ...patch.planChecks }
    : base.planChecks;
  const next: DailyLogRecord = {
    ...base,
    ...patch,
    planChecks: nextPlanChecks,
    updatedAt: timestamps.updatedAt,
    updatedAtWib: timestamps.updatedAtWib,
  };
  await db.dailyLogs.put(next);
};

export const upsertCareerLogPatch = async (
  dateKey: string,
  patch: CareerLogPatch,
) => {
  const timestamps = getTimestamps();
  const existing = await db.careerLogs.get(dateKey);
  const base = existing ?? buildCareerDefaults(dateKey, timestamps);
  const next: CareerLogRecord = {
    ...base,
    ...patch,
    updatedAt: timestamps.updatedAt,
    updatedAtWib: timestamps.updatedAtWib,
  };
  await db.careerLogs.put(next);
};

export const upsertFinanceLogPatch = async (
  dateKey: string,
  patch: FinanceLogPatch,
) => {
  const timestamps = getTimestamps();
  const existing = await db.financeLogs.get(dateKey);
  const base = existing ?? buildFinanceDefaults(dateKey, timestamps);
  const next: FinanceLogRecord = {
    ...base,
    ...patch,
    updatedAt: timestamps.updatedAt,
    updatedAtWib: timestamps.updatedAtWib,
  };
  await db.financeLogs.put(next);
};

export const upsertRelationLogPatch = async (
  dateKey: string,
  patch: RelationLogPatch,
) => {
  const timestamps = getTimestamps();
  const existing = await db.relationLogs.get(dateKey);
  const base = existing ?? buildRelationDefaults(dateKey, timestamps);
  const next: RelationLogRecord = {
    ...base,
    ...patch,
    updatedAt: timestamps.updatedAt,
    updatedAtWib: timestamps.updatedAtWib,
  };
  await db.relationLogs.put(next);
};

export const upsertCareerLeadPatch = async (
  id: string,
  patch: CareerLeadPatch,
) => {
  const timestamps = getTimestamps();
  const existing = await db.careerLeads.get(id);
  const base = existing ?? buildCareerLeadDefaults(id, timestamps);
  const next: CareerLeadRecord = {
    ...base,
    ...patch,
    createdAt: base.createdAt ?? timestamps.updatedAt,
    updatedAt: timestamps.updatedAt,
  };
  await db.careerLeads.put(next);
  return next;
};
