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
};

export type RelationLogRecord = {
  dateKey: string;
  wifeNote?: string;
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

class RekanSetiaDB extends Dexie {
  settings!: Table<SettingsRecord, "singleton">;
  dailyLogs!: Table<DailyLogRecord, string>;
  financeLogs!: Table<FinanceLogRecord, string>;
  relationLogs!: Table<RelationLogRecord, string>;
  careerLogs!: Table<CareerLogRecord, string>;

  constructor() {
    super("rekan_setia");
    this.version(1).stores({
      settings: "id",
      dailyLogs: "dateKey",
      financeLogs: "dateKey",
      relationLogs: "dateKey",
      careerLogs: "dateKey",
    });
  }
}

export const db = new RekanSetiaDB();
