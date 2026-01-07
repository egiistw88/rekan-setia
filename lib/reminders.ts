"use client";

import { db, type SettingsRecord } from "@/lib/db";
import { DEFAULT_REMINDERS } from "@/lib/settings";
import {
  computeNextDueDateWib,
  isTimePassedToday,
  makeTodayWibKey,
} from "@/lib/time";

export type ReminderSeverity = "info" | "warn" | "danger";

export type Reminder = {
  id: string;
  title: string;
  body: string;
  severity: ReminderSeverity;
  actionLabel?: string;
  actionHref?: string;
};

const getRemindersConfig = (settings?: SettingsRecord) => {
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

export const computeRemindersForNow = async (): Promise<Reminder[]> => {
  const settings = await db.settings.get("singleton");
  const remindersConfig = getRemindersConfig(settings);
  if (!remindersConfig.enabled) {
    return [];
  }

  const todayKey = makeTodayWibKey();
  const reminders: Reminder[] = [];

  if (
    remindersConfig.inputNight.enabled &&
    isTimePassedToday(remindersConfig.inputNight.time)
  ) {
    const dailyLog = await db.dailyLogs.get(todayKey);
    if (!dailyLog) {
      reminders.push({
        id: "input-night",
        title: "Input Malam",
        body: "Saya rapikan 2 menit malam ini supaya besok tidak kacau.",
        severity: "warn",
        actionLabel: "Isi sekarang",
        actionHref: "/input",
      });
    }
  }

  if (
    remindersConfig.leadFollowup.enabled &&
    isTimePassedToday(remindersConfig.leadFollowup.time)
  ) {
    const leads = await db.careerLeads.toArray();
    const count = leads.filter((lead) => {
      if (!lead.nextFollowupAtWib) {
        return false;
      }
      const dateKey = lead.nextFollowupAtWib.slice(0, 10);
      return dateKey <= todayKey;
    }).length;

    if (count > 0) {
      reminders.push({
        id: "lead-followup",
        title: "Follow-up lead",
        body: `Ada ${count} lead yang jatuh follow-up hari ini. Saya cukup 1 chat.`,
        severity: "info",
        actionLabel: "Buka karier",
        actionHref: "/career",
      });
    }
  }

  if (
    remindersConfig.debtDue.enabled &&
    isTimePassedToday(remindersConfig.debtDue.time)
  ) {
    const dueDays = settings?.debt?.pinjolDueDays ?? [1, 15];
    const { daysLeft } = computeNextDueDateWib(dueDays);
    if (daysLeft >= 0 && daysLeft <= remindersConfig.debtDue.windowDays) {
      reminders.push({
        id: "debt-due",
        title:
          daysLeft === 0 ? "Hari ini jatuh tempo pinjol" : `H-${daysLeft} pinjol`,
        body: "Saya amankan dulu yang paling bikin panik.",
        severity: daysLeft === 0 ? "danger" : "warn",
        actionLabel: "Buka keuangan",
        actionHref: "/finance",
      });
    }
  }

  return reminders;
};
