"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { computeRemindersForNow, type Reminder } from "@/lib/reminders";
import { useSettings } from "@/lib/settings";
import { makeTodayWibKey } from "@/lib/time";

const getDismissKey = (dateKey: string, reminderId: string) => {
  return `rekan-setia-dismissed-${dateKey}-${reminderId}`;
};

const isDismissed = (reminderId: string) => {
  if (typeof window === "undefined") {
    return false;
  }
  const dateKey = makeTodayWibKey();
  return window.localStorage.getItem(getDismissKey(dateKey, reminderId)) === "1";
};

const dismissForToday = (reminderId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  const dateKey = makeTodayWibKey();
  window.localStorage.setItem(getDismissKey(dateKey, reminderId), "1");
};

const severityStyles: Record<string, string> = {
  info: "border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)]",
  warn: "border-[color:var(--warn)]/30 bg-[color:var(--warn)]/12 text-[color:var(--warn)]",
  danger:
    "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/12 text-[color:var(--danger)]",
};

export default function NudgeCenter() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const settings = useSettings();
  const prevIdsRef = useRef<Set<string>>(new Set());

  const refreshReminders = async () => {
    try {
      const list = await computeRemindersForNow();
      const filtered = list.filter((item) => !isDismissed(item.id));
      setReminders(filtered);
    } catch (error) {
      console.error(error);
      setReminders([]);
    }
  };

  useEffect(() => {
    void refreshReminders();
    const interval = window.setInterval(() => {
      void refreshReminders();
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    void refreshReminders();
  }, [settings?.reminders]);

  useEffect(() => {
    const shouldNotify = Boolean(
      settings?.reminders?.useSystemNotifications,
    );
    if (!shouldNotify) {
      prevIdsRef.current = new Set(reminders.map((item) => item.id));
      return;
    }
    if (typeof Notification === "undefined") {
      return;
    }
    if (Notification.permission !== "granted") {
      return;
    }

    const currentIds = new Set(reminders.map((item) => item.id));
    reminders.forEach((item) => {
      if (!prevIdsRef.current.has(item.id)) {
        new Notification(item.title, { body: item.body });
      }
    });
    prevIdsRef.current = currentIds;
  }, [reminders, settings?.reminders?.useSystemNotifications]);

  const hasReminders = reminders.length > 0;

  const handleDismiss = (reminderId: string) => {
    dismissForToday(reminderId);
    setReminders((prev) => prev.filter((item) => item.id !== reminderId));
  };

  return (
    <section className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Pengingat saya hari ini
        </p>
      </div>
      {!hasReminders ? (
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Hari ini cukup tenang. Saya lanjut pelan.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`rounded-xl border px-3 py-3 text-sm ${
                severityStyles[reminder.severity] ?? severityStyles.info
              }`}
            >
              <p className="font-semibold">{reminder.title}</p>
              <p className="mt-1 text-xs opacity-80">{reminder.body}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {reminder.actionHref ? (
                  <Link
                    href={reminder.actionHref}
                    className="rounded-full border border-current px-3 py-1 font-semibold"
                  >
                    {reminder.actionLabel ?? "Buka"}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDismiss(reminder.id)}
                  className="rounded-full border border-current px-3 py-1"
                >
                  Sembunyikan hari ini
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
