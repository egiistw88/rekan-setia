"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_THEME_SETTINGS,
  ThemeMode,
  ThemeSettings,
  loadThemeSettings,
  saveThemeSettings,
} from "@/app/lib/theme-settings";

const MODE_OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  {
    value: "AUTO_TIME",
    label: "Auto jam",
    hint: "Tema mengikuti jam lokal.",
  },
  {
    value: "ALWAYS_DARK",
    label: "Selalu gelap",
    hint: "Cocok untuk fokus malam.",
  },
  {
    value: "ALWAYS_LIGHT",
    label: "Selalu terang",
    hint: "Cocok untuk siang stabil.",
  },
];

export default function ThemeSettingsPanel() {
  const [settings, setSettings] = useState<ThemeSettings>(
    DEFAULT_THEME_SETTINGS,
  );

  useEffect(() => {
    setSettings(loadThemeSettings());
  }, []);

  const updateSettings = (next: ThemeSettings) => {
    setSettings(next);
    saveThemeSettings(next);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
          Mode tema
        </h2>
        <div className="space-y-3">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border)] p-3 text-sm transition hover:border-[color:var(--accent)]"
            >
              <input
                type="radio"
                name="theme-mode"
                className="mt-1"
                value={option.value}
                checked={settings.mode === option.value}
                onChange={() =>
                  updateSettings({ ...settings, mode: option.value })
                }
              />
              <span>
                <span className="block font-medium text-[color:var(--foreground)]">
                  {option.label}
                </span>
                <span className="block text-xs text-[color:var(--muted)]">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
          Jadwal gelap
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-[color:var(--muted)]">
            <span>Mulai gelap</span>
            <input
              type="time"
              value={settings.darkStart}
              onChange={(event) =>
                updateSettings({ ...settings, darkStart: event.target.value })
              }
              className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
            />
          </label>
          <label className="space-y-2 text-sm text-[color:var(--muted)]">
            <span>Mulai terang</span>
            <input
              type="time"
              value={settings.lightStart}
              onChange={(event) =>
                updateSettings({ ...settings, lightStart: event.target.value })
              }
              className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
            />
          </label>
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          Saya bebas mengatur ulang jam agar ritme tetap nyaman.
        </p>
      </section>
    </div>
  );
}
