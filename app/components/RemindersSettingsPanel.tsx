"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/app/components/ui/Card";
import type { SettingsRecord } from "@/lib/db";
import { DEFAULT_REMINDERS, updateSettings, useSettings } from "@/lib/settings";

type PermissionState = NotificationPermission | "unsupported";

const buildDraft = (settings?: SettingsRecord): SettingsRecord["reminders"] => {
  const current = settings?.reminders;
  return {
    ...DEFAULT_REMINDERS,
    ...(current ?? {}),
    inputNight: {
      ...DEFAULT_REMINDERS.inputNight,
      ...(current?.inputNight ?? {}),
    },
    leadFollowup: {
      ...DEFAULT_REMINDERS.leadFollowup,
      ...(current?.leadFollowup ?? {}),
    },
    debtDue: {
      ...DEFAULT_REMINDERS.debtDue,
      ...(current?.debtDue ?? {}),
    },
  };
};

export default function RemindersSettingsPanel() {
  const settings = useSettings();
  const [draft, setDraft] = useState<SettingsRecord["reminders"]>(
    buildDraft(),
  );
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    setDraft(buildDraft(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const isDirty = useMemo(() => {
    if (!settings?.reminders) {
      return true;
    }
    return JSON.stringify(settings.reminders) !== JSON.stringify(draft);
  }, [draft, settings]);

  const handleSave = async () => {
    await updateSettings({ reminders: { ...draft } });
  };

  const handleRequestPermission = async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">
          Pengingat
        </h2>
        <label className="flex items-center justify-between text-sm text-[color:var(--text)]">
          <span>Aktifkan pengingat</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, enabled: event.target.checked }))
            }
          />
        </label>
        <p className="text-xs text-[color:var(--muted)]">
          Pengingat hanya muncul saat aplikasi sedang terbuka.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">
          Notifikasi sistem
        </h2>
        <label className="flex items-center justify-between text-sm text-[color:var(--text)]">
          <span>Gunakan notifikasi sistem</span>
          <input
            type="checkbox"
            checked={draft.useSystemNotifications}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                useSystemNotifications: event.target.checked,
              }))
            }
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
          <span>
            Izin: {permission === "unsupported" ? "tidak didukung" : permission}
          </span>
          <button
            type="button"
            onClick={handleRequestPermission}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
          >
            Minta izin
          </button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">
          Jadwal pengingat
        </h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm text-[color:var(--text)]">
            <span>Input malam</span>
            <input
              type="checkbox"
              checked={draft.inputNight.enabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  inputNight: {
                    ...prev.inputNight,
                    enabled: event.target.checked,
                  },
                }))
              }
            />
          </label>
          <input
            type="time"
            value={draft.inputNight.time}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                inputNight: { ...prev.inputNight, time: event.target.value },
              }))
            }
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
          />

          <label className="flex items-center justify-between text-sm text-[color:var(--text)]">
            <span>Follow-up lead</span>
            <input
              type="checkbox"
              checked={draft.leadFollowup.enabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  leadFollowup: {
                    ...prev.leadFollowup,
                    enabled: event.target.checked,
                  },
                }))
              }
            />
          </label>
          <input
            type="time"
            value={draft.leadFollowup.time}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                leadFollowup: {
                  ...prev.leadFollowup,
                  time: event.target.value,
                },
              }))
            }
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
          />

          <label className="flex items-center justify-between text-sm text-[color:var(--text)]">
            <span>Pinjol</span>
            <input
              type="checkbox"
              checked={draft.debtDue.enabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  debtDue: {
                    ...prev.debtDue,
                    enabled: event.target.checked,
                  },
                }))
              }
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="time"
              value={draft.debtDue.time}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  debtDue: { ...prev.debtDue, time: event.target.value },
                }))
              }
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
            />
            <input
              type="number"
              min={1}
              max={3}
              value={draft.debtDue.windowDays}
              onChange={(event) => {
                const raw = Number(event.target.value);
                const clamped = Number.isNaN(raw)
                  ? 1
                  : Math.min(3, Math.max(1, raw));
                setDraft((prev) => ({
                  ...prev,
                  debtDue: { ...prev.debtDue, windowDays: clamped },
                }));
              }}
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
              placeholder="H-1..H-3"
            />
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            Window pinjol 1-3 hari sebelum jatuh tempo.
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className="rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Simpan pengingat
        </button>
        <p className="text-xs text-[color:var(--muted)]">
          Saya pilih pengingat yang menenangkan, bukan yang menghakimi.
        </p>
      </Card>
    </div>
  );
}
