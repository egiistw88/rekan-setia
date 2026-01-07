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
  createdAt: string;
  updatedAt: string;
};

export type FinanceLogRecord = {
  dateKey: string;
  createdAt: string;
  updatedAt: string;
};

export type RelationLogRecord = {
  dateKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerLogRecord = {
  dateKey: string;
  createdAt: string;
  updatedAt: string;
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
