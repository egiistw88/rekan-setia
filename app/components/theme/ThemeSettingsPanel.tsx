"use client";

import { useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "@/lib/db";
import Card from "@/app/components/ui/Card";
import { updateSettings, useSettings } from "@/lib/settings";

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
  const settings = useSettings();
  const [draft, setDraft] = useState<{
    themeMode: ThemeMode;
    darkStart: string;
    lightStart: string;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      setDraft({ ...settings.theme });
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings || !draft) {
      return false;
    }
    return (
      settings.theme.themeMode !== draft.themeMode ||
      settings.theme.darkStart !== draft.darkStart ||
      settings.theme.lightStart !== draft.lightStart
    );
  }, [draft, settings]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    await updateSettings({ theme: { ...draft } });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">
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
                checked={draft?.themeMode === option.value}
                onChange={() =>
                  setDraft((prev) =>
                    prev
                      ? { ...prev, themeMode: option.value }
                      : {
                          themeMode: option.value,
                          darkStart: "18:00",
                          lightStart: "06:00",
                        },
                  )
                }
              />
              <span>
              <span className="block font-medium text-[color:var(--text)]">
                {option.label}
              </span>
                <span className="block text-xs text-[color:var(--muted)]">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {draft?.themeMode === "AUTO_TIME" ? (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-[color:var(--text)]">
            Jadwal gelap
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Mulai gelap</span>
              <input
                type="time"
                value={draft.darkStart}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, darkStart: event.target.value } : prev,
                  )
                }
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--text)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Mulai terang</span>
              <input
                type="time"
                value={draft.lightStart}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, lightStart: event.target.value } : prev,
                  )
                }
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--text)]"
              />
            </label>
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            Saya bebas mengatur ulang jam agar ritme tetap nyaman.
          </p>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!draft || !isDirty}
          className="rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Simpan
        </button>
        <p className="text-xs text-[color:var(--muted)]">
          Saya atur ini supaya aplikasi mengikuti ritme hidup saya.
        </p>
      </Card>
    </div>
  );
}
