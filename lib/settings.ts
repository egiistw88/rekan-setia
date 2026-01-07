"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type SettingsRecord, type ThemeMode } from "@/lib/db";

export type SettingsPatch = {
  monthlyTargets?: Partial<SettingsRecord["monthlyTargets"]>;
  debt?: Partial<SettingsRecord["debt"]>;
  payday?: Partial<SettingsRecord["payday"]>;
  dailyTargets?: Partial<SettingsRecord["dailyTargets"]>;
  weeklyTargets?: Partial<SettingsRecord["weeklyTargets"]>;
  monthlyGuards?: Partial<SettingsRecord["monthlyGuards"]>;
  theme?: Partial<SettingsRecord["theme"]>;
  migratedThemeFromLocalStorage?: boolean;
};

const THEME_MODES: ThemeMode[] = ["AUTO_TIME", "ALWAYS_DARK", "ALWAYS_LIGHT"];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LEGACY_THEME_KEY = "rekan-setia-theme-settings";
const LEGACY_THEME_MODE_KEY = "themeMode";
const LEGACY_DARK_START_KEY = "darkStart";
const LEGACY_LIGHT_START_KEY = "lightStart";

const computeTotalWajib = (
  targets: SettingsRecord["monthlyTargets"],
): number => {
  return (
    targets.makan +
    targets.kontrakan +
    targets.listrik +
    targets.bensin +
    targets.kuota +
    targets.anak
  );
};

const createDefaultSettings = (): SettingsRecord => {
  const now = new Date().toISOString();
  const monthlyTargets = {
    makan: 900000,
    kontrakan: 850000,
    listrik: 200000,
    bensin: 750000,
    kuota: 100000,
    anak: 1100000,
    totalWajib: 0,
  };
  monthlyTargets.totalWajib = computeTotalWajib(monthlyTargets);

  return {
    id: "singleton",
    monthlyTargets,
    debt: {
      pinjolMonthly: 400000,
      pinjolDueDays: [1, 15],
      monthsRemaining: 4,
    },
    payday: {
      wifePaydayDay: 27,
    },
    dailyTargets: {
      tidurMin: 6,
      makanMin: 2,
      napasMin: 2,
      rokokMax: 10000,
    },
    weeklyTargets: {
      topupOjolWeekly: 100000,
    },
    monthlyGuards: {
      jajanMonthly: 100000,
      servisSampahMonthly: 120000,
    },
    theme: {
      themeMode: "AUTO_TIME",
      darkStart: "18:00",
      lightStart: "06:00",
    },
    migratedThemeFromLocalStorage: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const getOrInitSettings = async (): Promise<SettingsRecord> => {
  const existing = await db.settings.get("singleton");
  if (existing) {
    return existing;
  }

  const defaults = createDefaultSettings();
  await db.settings.put(defaults);
  return defaults;
};

const mergeSettings = (
  current: SettingsRecord,
  patch: SettingsPatch,
): SettingsRecord => {
  const monthlyTargets = {
    ...current.monthlyTargets,
    ...patch.monthlyTargets,
  };

  monthlyTargets.totalWajib = computeTotalWajib(monthlyTargets);

  return {
    ...current,
    monthlyTargets,
    debt: { ...current.debt, ...patch.debt },
    payday: { ...current.payday, ...patch.payday },
    dailyTargets: { ...current.dailyTargets, ...patch.dailyTargets },
    weeklyTargets: { ...current.weeklyTargets, ...patch.weeklyTargets },
    monthlyGuards: { ...current.monthlyGuards, ...patch.monthlyGuards },
    theme: { ...current.theme, ...patch.theme },
    migratedThemeFromLocalStorage:
      patch.migratedThemeFromLocalStorage ??
      current.migratedThemeFromLocalStorage,
    updatedAt: new Date().toISOString(),
  };
};

export const updateSettings = async (
  patch: SettingsPatch,
): Promise<SettingsRecord> => {
  const current = await getOrInitSettings();
  const merged = mergeSettings(current, patch);
  await db.settings.put(merged);
  return merged;
};

const sanitizeThemeMode = (value: unknown): ThemeMode | undefined => {
  return THEME_MODES.includes(value as ThemeMode)
    ? (value as ThemeMode)
    : undefined;
};

const sanitizeTime = (value: unknown): string | undefined => {
  return typeof value === "string" && TIME_REGEX.test(value)
    ? value
    : undefined;
};

const readLegacyTheme = (): {
  found: boolean;
  theme: Partial<SettingsRecord["theme"]>;
} => {
  if (typeof window === "undefined") {
    return { found: false, theme: {} };
  }

  let found = false;
  let parsed: Record<string, unknown> | null = null;
  const raw = window.localStorage.getItem(LEGACY_THEME_KEY);
  if (raw) {
    found = true;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  const themeMode =
    sanitizeThemeMode(parsed?.mode) ??
    sanitizeThemeMode(parsed?.themeMode) ??
    sanitizeThemeMode(window.localStorage.getItem(LEGACY_THEME_MODE_KEY));
  const darkStart =
    sanitizeTime(parsed?.darkStart) ??
    sanitizeTime(window.localStorage.getItem(LEGACY_DARK_START_KEY));
  const lightStart =
    sanitizeTime(parsed?.lightStart) ??
    sanitizeTime(window.localStorage.getItem(LEGACY_LIGHT_START_KEY));

  if (
    window.localStorage.getItem(LEGACY_THEME_MODE_KEY) ||
    window.localStorage.getItem(LEGACY_DARK_START_KEY) ||
    window.localStorage.getItem(LEGACY_LIGHT_START_KEY)
  ) {
    found = true;
  }

  const theme: Partial<SettingsRecord["theme"]> = {};
  if (themeMode) {
    theme.themeMode = themeMode;
  }
  if (darkStart) {
    theme.darkStart = darkStart;
  }
  if (lightStart) {
    theme.lightStart = lightStart;
  }

  return { found, theme };
};

const cleanupLegacyTheme = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_THEME_KEY);
  window.localStorage.removeItem(LEGACY_THEME_MODE_KEY);
  window.localStorage.removeItem(LEGACY_DARK_START_KEY);
  window.localStorage.removeItem(LEGACY_LIGHT_START_KEY);
};

const migrateThemeFromLocalStorageIfNeeded = async (
  settings: SettingsRecord,
) => {
  if (typeof window === "undefined") {
    return settings;
  }

  if (settings.migratedThemeFromLocalStorage) {
    return settings;
  }

  const legacy = readLegacyTheme();
  if (!legacy.found) {
    return settings;
  }

  const patch: SettingsPatch = {
    migratedThemeFromLocalStorage: true,
  };

  if (Object.keys(legacy.theme).length > 0) {
    patch.theme = { ...settings.theme, ...legacy.theme };
  }

  const merged = mergeSettings(settings, patch);
  await db.settings.put(merged);
  cleanupLegacyTheme();
  return merged;
};

export const ensureSettingsInitialized = async () => {
  if (typeof window === "undefined") {
    return;
  }

  let settings = await db.settings.get("singleton");
  if (!settings) {
    settings = createDefaultSettings();
    await db.settings.put(settings);
  }

  await migrateThemeFromLocalStorageIfNeeded(settings);
};

export const useSettings = (): SettingsRecord | undefined => {
  return useLiveQuery(() => db.settings.get("singleton"), []);
};
