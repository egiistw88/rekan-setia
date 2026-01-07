export type ThemeMode = "AUTO_TIME" | "ALWAYS_DARK" | "ALWAYS_LIGHT";

export type ThemeSettings = {
  mode: ThemeMode;
  darkStart: string;
  lightStart: string;
};

export const THEME_SETTINGS_KEY = "rekan-setia-theme-settings";
export const THEME_SETTINGS_EVENT = "rekan-setia-theme-settings-change";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: "AUTO_TIME",
  darkStart: "18:00",
  lightStart: "06:00",
};

const VALID_MODES: ThemeMode[] = ["AUTO_TIME", "ALWAYS_DARK", "ALWAYS_LIGHT"];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (value: string) => TIME_REGEX.test(value);

const clampSettings = (input?: Partial<ThemeSettings> | null): ThemeSettings => {
  const mode = VALID_MODES.includes(input?.mode as ThemeMode)
    ? (input?.mode as ThemeMode)
    : DEFAULT_THEME_SETTINGS.mode;

  const darkStart = isValidTime(input?.darkStart ?? "")
    ? (input?.darkStart as string)
    : DEFAULT_THEME_SETTINGS.darkStart;

  const lightStart = isValidTime(input?.lightStart ?? "")
    ? (input?.lightStart as string)
    : DEFAULT_THEME_SETTINGS.lightStart;

  return {
    mode,
    darkStart,
    lightStart,
  };
};

export const loadThemeSettings = (): ThemeSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(THEME_SETTINGS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        THEME_SETTINGS_KEY,
        JSON.stringify(DEFAULT_THEME_SETTINGS),
      );
      return DEFAULT_THEME_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
    const normalized = clampSettings(parsed);
    window.localStorage.setItem(
      THEME_SETTINGS_KEY,
      JSON.stringify(normalized),
    );
    return normalized;
  } catch {
    window.localStorage.setItem(
      THEME_SETTINGS_KEY,
      JSON.stringify(DEFAULT_THEME_SETTINGS),
    );
    return DEFAULT_THEME_SETTINGS;
  }
};

export const saveThemeSettings = (settings: ThemeSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = clampSettings(settings);
  window.localStorage.setItem(
    THEME_SETTINGS_KEY,
    JSON.stringify(normalized),
  );
  window.dispatchEvent(new Event(THEME_SETTINGS_EVENT));
};

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return hours * 60 + minutes;
};

export const resolveTheme = (
  settings: ThemeSettings,
  date: Date = new Date(),
) => {
  if (settings.mode === "ALWAYS_DARK") {
    return "dark";
  }
  if (settings.mode === "ALWAYS_LIGHT") {
    return "light";
  }

  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const darkStart = toMinutes(settings.darkStart);
  const lightStart = toMinutes(settings.lightStart);

  if (darkStart === lightStart) {
    return "dark";
  }

  if (darkStart < lightStart) {
    return nowMinutes >= darkStart && nowMinutes < lightStart ? "dark" : "light";
  }

  return nowMinutes >= darkStart || nowMinutes < lightStart ? "dark" : "light";
};
