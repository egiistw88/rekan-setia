import Dexie, { type Table } from "dexie";

export type ThemeMode = "AUTO_TIME" | "ALWAYS_DARK" | "ALWAYS_LIGHT";

export type SettingsRecord = {
  id: "singleton";
  monthlyTargets: {
    makan: number;
    kontrakan: number;
    listrik: number;
    bensin: number;
    kuota: number;
    anak: number;
    totalWajib: number;
  };
  debt: {
    pinjolMonthly: number;
    pinjolDueDays: number[];
    monthsRemaining: number;
  };
  payday: {
    wifePaydayDay: number;
  };
  dailyTargets: {
    tidurMin: number;
    makanMin: number;
    napasMin: number;
    rokokMax: number;
  };
  weeklyTargets: {
    topupOjolWeekly: number;
  };
  monthlyGuards: {
    jajanMonthly: number;
    servisSampahMonthly: number;
  };
  theme: {
    themeMode: ThemeMode;
    darkStart: string;
    lightStart: string;
  };
  migratedThemeFromLocalStorage: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DailyLogRecord = {
  dateKey: string;
  sleepHours: number;
  mealsCount: number;
  breathSessions: number;
  dropModeRuns: number;
  moodScore?: number;
  subuhDone: boolean;
  ritualDone: boolean;
  freezeMode?: boolean;
  updatedAt: string;
  updatedAtWib?: string;
  planChecks?: Record<string, boolean>;
};

export type FinanceLogRecord = {
  dateKey: string;
  incomeOjol: number;
  expenseMakan: number;
  expenseBensin: number;
  topupOjol: number;
  rokokKopi: number;
  otherExpense: number;
  cashOnHandTonight?: number;
  updatedAt: string;
  updatedAtWib?: string;
  freezeModeApplied?: boolean;
  note?: string;
};

export type RelationLogRecord = {
  dateKey: string;
  wifeNote?: string;
  lastTemplateId?: string;
  ritualDurationMin?: number;
  ritualCompletedAtWib?: string;
  wifeMood?: "ringan" | "biasa" | "berat";
  motherContactDone?: boolean;
  updatedAt: string;
  updatedAtWib?: string;
};

export type CareerLogRecord = {
  dateKey: string;
  clientChatsSent: number;
  designMinutes: number;
  updatedAt: string;
  updatedAtWib?: string;
};

export type CareerLeadPlatform = "WA" | "IG" | "FB" | "Email" | "Other";
export type CareerLeadNiche =
  | "UMKM"
  | "Event"
  | "Food"
  | "Fashion"
  | "Education"
  | "Other";
export type CareerLeadStatus =
  | "baru"
  | "dihubungi"
  | "followup"
  | "respons"
  | "klien"
  | "tutup";

export type CareerLeadRecord = {
  id: string;
  name: string;
  platform: CareerLeadPlatform;
  handleOrContact: string;
  niche: CareerLeadNiche;
  status: CareerLeadStatus;
  lastContactAtWib?: string;
  nextFollowupAtWib?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeferredDecisionChoice = "1h" | "3h" | "tomorrow";

export type DeferredDecisionRecord = {
  id: string;
  dateKey: string;
  createdAtIso: string;
  createdAtWib: string;
  delayChoice: DeferredDecisionChoice;
  remindAtWib: string;
  topic: string;
  resolved?: boolean;
  resolvedAtWib?: string;
};

class RekanSetiaDB extends Dexie {
  settings!: Table<SettingsRecord, "singleton">;
  dailyLogs!: Table<DailyLogRecord, string>;
  financeLogs!: Table<FinanceLogRecord, string>;
  relationLogs!: Table<RelationLogRecord, string>;
  careerLogs!: Table<CareerLogRecord, string>;
  careerLeads!: Table<CareerLeadRecord, string>;
  deferredDecisions!: Table<DeferredDecisionRecord, string>;

  constructor() {
    super("rekan_setia");
    this.version(1).stores({
      settings: "id",
      dailyLogs: "dateKey",
      financeLogs: "dateKey",
      relationLogs: "dateKey",
      careerLogs: "dateKey",
    });
    this.version(2).stores({
      settings: "id",
      dailyLogs: "dateKey",
      financeLogs: "dateKey",
      relationLogs: "dateKey",
      careerLogs: "dateKey",
      careerLeads: "id, status, platform",
    });
    this.version(3).stores({
      settings: "id",
      dailyLogs: "dateKey",
      financeLogs: "dateKey",
      relationLogs: "dateKey",
      careerLogs: "dateKey",
      careerLeads: "id, status, platform",
      deferredDecisions: "id, dateKey, resolved",
    });
  }
}

export const db = new RekanSetiaDB();
