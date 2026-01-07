const formatDateParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

const formatDateTimeParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const getJakartaDateParts = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return { year, month, day, hour, minute };
};

export const getJakartaDateKey = (date: Date = new Date()) => {
  return formatDateParts(date);
};

export const getJakartaDateTime = (date: Date = new Date()) => {
  return formatDateTimeParts(date);
};

export const formatNowWib = () => {
  return getJakartaDateTime(new Date());
};

export const parseTimeToMinutes = (value: string) => {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }
  const clampedHour = Math.max(0, Math.min(23, hour));
  const clampedMinute = Math.max(0, Math.min(59, minute));
  return clampedHour * 60 + clampedMinute;
};

export const getNowWibMinutes = () => {
  const { hour, minute } = getJakartaDateParts();
  return hour * 60 + minute;
};

export const isTimePassedToday = (targetHHmm: string) => {
  return getNowWibMinutes() >= parseTimeToMinutes(targetHHmm);
};

export const makeTodayWibKey = () => {
  return getJakartaDateKey(new Date());
};

const parseDateInput = (value: string | Date) => {
  if (value instanceof Date) {
    return value;
  }
  if (value.includes(" ")) {
    const [datePart, timePart] = value.split(" ");
    return new Date(`${datePart}T${timePart}:00Z`);
  }
  return new Date(`${value}T00:00:00Z`);
};

export const addDaysWib = (date: string | Date, days: number) => {
  const base = parseDateInput(date);
  return getJakartaDateTime(new Date(base.getTime() + days * 86400000));
};

export const computeRemindAtWib = (
  choice: "1h" | "3h" | "tomorrow",
  baseDate: Date = new Date(),
) => {
  if (choice === "1h") {
    return getJakartaDateTime(new Date(baseDate.getTime() + 3600000));
  }
  if (choice === "3h") {
    return getJakartaDateTime(new Date(baseDate.getTime() + 3 * 3600000));
  }
  const tomorrowKey = getJakartaDateKey(
    new Date(baseDate.getTime() + 86400000),
  );
  return `${tomorrowKey} 07:00`;
};

export const computeNextDueDateWib = (dueDays: number[]) => {
  const sortedDays = [...dueDays].filter((day) => day > 0).sort((a, b) => a - b);
  const { year, month, day } = getJakartaDateParts();
  const daysInMonth = (y: number, m: number) =>
    new Date(Date.UTC(y, m, 0)).getUTCDate();

  const todayUtc = new Date(Date.UTC(year, month - 1, day));
  if (sortedDays.length === 0) {
    return { dateKey: getJakartaDateKey(new Date()), day, daysLeft: 0 };
  }
  const nextDay =
    sortedDays.find((dueDay) => dueDay >= day) ?? sortedDays[0];

  let targetYear = year;
  let targetMonth = month;
  if (nextDay < day) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const maxDay = daysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(nextDay, maxDay);
  const targetUtc = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay));
  const diffDays = Math.round(
    (targetUtc.getTime() - todayUtc.getTime()) / 86400000,
  );
  const dateKey = `${targetYear.toString().padStart(4, "0")}-${targetMonth
    .toString()
    .padStart(2, "0")}-${targetDay.toString().padStart(2, "0")}`;

  return { dateKey, day: targetDay, daysLeft: Math.max(0, diffDays) };
};
