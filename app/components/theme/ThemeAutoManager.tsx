"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { SettingsRecord } from "@/lib/db";
import { useSettings } from "@/lib/settings";

const FIVE_MINUTES = 5 * 60 * 1000;

const resolveTheme = (
  theme: SettingsRecord["theme"],
  date: Date = new Date(),
) => {
  if (theme.themeMode === "ALWAYS_DARK") {
    return "dark";
  }
  if (theme.themeMode === "ALWAYS_LIGHT") {
    return "light";
  }

  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const [darkHours, darkMinutes] = theme.darkStart.split(":").map(Number);
  const [lightHours, lightMinutes] = theme.lightStart.split(":").map(Number);
  const darkStart = darkHours * 60 + darkMinutes;
  const lightStart = lightHours * 60 + lightMinutes;

  if (darkStart === lightStart) {
    return "dark";
  }

  if (darkStart < lightStart) {
    return nowMinutes >= darkStart && nowMinutes < lightStart ? "dark" : "light";
  }

  return nowMinutes >= darkStart || nowMinutes < lightStart ? "dark" : "light";
};

export default function ThemeAutoManager() {
  const { setTheme } = useTheme();
  const settings = useSettings();

  useEffect(() => {
    if (!settings) {
      setTheme("dark");
      return;
    }

    const applyTheme = () => {
      setTheme(resolveTheme(settings.theme));
    };

    applyTheme();
    const intervalId = window.setInterval(applyTheme, FIVE_MINUTES);

    return () => window.clearInterval(intervalId);
  }, [setTheme, settings]);

  return null;
}
