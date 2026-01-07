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

export const getJakartaDateKey = (date: Date = new Date()) => {
  return formatDateParts(date);
};

export const getJakartaDateTime = (date: Date = new Date()) => {
  return formatDateTimeParts(date);
};

export const formatNowWib = () => {
  return getJakartaDateTime(new Date());
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
