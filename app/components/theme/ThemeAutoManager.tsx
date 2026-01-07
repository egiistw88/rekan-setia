"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  loadThemeSettings,
  resolveTheme,
  THEME_SETTINGS_EVENT,
  THEME_SETTINGS_KEY,
} from "@/app/lib/theme-settings";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function ThemeAutoManager() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const applyTheme = () => {
      const settings = loadThemeSettings();
      setTheme(resolveTheme(settings));
    };

    applyTheme();

    const intervalId = window.setInterval(applyTheme, FIVE_MINUTES);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_SETTINGS_KEY) {
        applyTheme();
      }
    };

    const handleCustom = () => {
      applyTheme();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_SETTINGS_EVENT, handleCustom);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_SETTINGS_EVENT, handleCustom);
    };
  }, [setTheme]);

  return null;
}
