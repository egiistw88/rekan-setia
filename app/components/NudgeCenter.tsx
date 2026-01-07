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
  info: "border-slate-200/60 bg-slate-50/50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200",
  warn: "border-amber-200/60 bg-amber-50/50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-200",
  danger:
    "border-rose-200/70 bg-rose-50/60 text-rose-700 dark:border-rose-600/40 dark:bg-rose-900/20 dark:text-rose-200",
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
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
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
