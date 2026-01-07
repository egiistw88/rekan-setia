"use client";

import {
  db,
  type CareerLogRecord,
  type DailyLogRecord,
  type FinanceLogRecord,
  type RelationLogRecord,
} from "@/lib/db";
import { getOrInitSettings } from "@/lib/settings";
import { getJakartaDateKey } from "@/lib/time";

export type Level = "AMAN" | "RAWAN" | "KRITIS";

export type DomainStatus = {
  level: Level;
  score: number;
  reasons: string[];
  actions: string[];
  confidence: number;
  metrics?: Record<string, number>;
};

export type PrimaryDriver =
  | "STABILITY"
  | "FINANCE"
  | "RELATIONS"
  | "SPIRITUAL"
  | "CAREER";

export type ModeTomorrow = "SELAMAT" | "RAPIKAN" | "DORONG";

export type DailyAssessment = {
  dateKey: string;
  stability: DomainStatus;
  finance: DomainStatus;
  relations: DomainStatus;
  spiritual: DomainStatus;
  career: DomainStatus;
  overallLevel: Level;
  overallReasons: string[];
  planTomorrow: string[];
  primaryDriver: PrimaryDriver;
  modeTomorrow: ModeTomorrow;
  debug?: {
    dateKeyToday: string;
    dailyLog?: DailyLogRecord;
    financeLog?: FinanceLogRecord;
    relationLog?: RelationLogRecord;
    careerLog?: CareerLogRecord;
    last7Keys: string[];
    primaryDriverConfidence: number;
    bottleneckDomain: PrimaryDriver;
    bottleneckConfidence: number;
    driverScores?: Record<PrimaryDriver, number>;
    counts: {
      knownDays7: number;
      ritualTrue7: number;
      subuhFalseStreak: number;
      deficitStreak: number;
      weeklyTopup7: number;
      topupStreak: boolean;
    };
  };
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const avg = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
};

const clamp = (value: number, min = 0, max = 100) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

const pickReasons = (reasons: string[], max = 2) => {
  return reasons.filter(Boolean).slice(0, max);
};

const parseDateKey = (dateKey: string) => {
  return new Date(`${dateKey}T00:00:00Z`);
};

const getDaysToPayday = (nowWib: Date, paydayDay: number) => {
  const year = nowWib.getUTCFullYear();
  const month = nowWib.getUTCMonth() + 1;
  const day = nowWib.getUTCDate();

  let targetYear = year;
  let targetMonth = month;
  if (day > paydayDay) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const todayUtc = Date.UTC(year, month - 1, day);
  const paydayUtc = Date.UTC(targetYear, targetMonth - 1, paydayDay);
  return Math.max(0, Math.round((paydayUtc - todayUtc) / 86400000));
};

const dateFromParts = (year: number, month: number, day: number) => {
  return new Date(Date.UTC(year, month - 1, day));
};

const isNearDueDay = (
  dateWib: Date,
  dueDays: number[],
  windowDays = 2,
) => {
  const year = dateWib.getUTCFullYear();
  const month = dateWib.getUTCMonth() + 1;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const todayUtc = dateWib.getTime();
  const candidates = dueDays.flatMap((dueDay) => [
    dateFromParts(year, month, dueDay),
    dateFromParts(prevYear, prevMonth, dueDay),
    dateFromParts(nextYear, nextMonth, dueDay),
  ]);

  return candidates.some((candidate) => {
    const diffDays = Math.abs(candidate.getTime() - todayUtc) / 86400000;
    return diffDays <= windowDays;
  });
};

const getDateKeysBack = (days: number, baseDate: Date) => {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(baseDate.getTime() - i * 86400000);
    keys.push(getJakartaDateKey(date));
  }
  return keys;
};

const collectNumbers = <T,>(
  items: Array<T | undefined>,
  getter: (item: T) => number | undefined,
) => {
  const values: number[] = [];
  for (const item of items) {
    if (!item) {
      continue;
    }
    const value = getter(item);
    if (typeof value === "number" && !Number.isNaN(value)) {
      values.push(value);
    }
  }
  return values;
};

const countExisting = <T,>(items: Array<T | undefined>) => {
  return items.filter(Boolean).length;
};

const countKnownDays = <T,>(
  items: Array<T | undefined>,
  selector?: (item: T) => unknown,
) => {
  return items.reduce((count, item) => {
    if (!item) {
      return count;
    }
    if (!selector) {
      return count + 1;
    }
    const value = selector(item);
    return value === undefined ? count : count + 1;
  }, 0);
};

const countTrueDays = <T,>(
  items: Array<T | undefined>,
  selector: (item: T) => boolean | undefined,
) => {
  return items.reduce((count, item) => {
    if (!item) {
      return count;
    }
    const value = selector(item);
    return value ? count + 1 : count;
  }, 0);
};

const LEVEL_ORDER: Record<Level, number> = {
  AMAN: 0,
  RAWAN: 1,
  KRITIS: 2,
};

const worstLevel = (levels: Level[]): Level => {
  return levels.reduce<Level>((acc, level) => {
    return LEVEL_ORDER[level] > LEVEL_ORDER[acc] ? level : acc;
  }, "AMAN");
};

const bumpLevel = (level: Level): Level => {
  if (level === "AMAN") {
    return "RAWAN";
  }
  if (level === "RAWAN") {
    return "KRITIS";
  }
  return "KRITIS";
};

const ACTION_COPY: Record<
  PrimaryDriver,
  { critical: string; risky: string; ok: string }
> = {
  STABILITY: {
    critical: "Saya Drop Mode",
    risky: "Saya tambah 1 sesi napas",
    ok: "Saya jaga ritme napas",
  },
  FINANCE: {
    critical: "Saya Mode Beku 3 hari",
    risky: "Saya kembali ke pagar rokok/topup",
    ok: "Saya jaga ritme pengeluaran",
  },
  RELATIONS: {
    critical: "Saya ritual 7 menit (besok)",
    risky: "Saya ritual 7 menit (besok)",
    ok: "Saya ritual 7 menit (besok)",
  },
  SPIRITUAL: {
    critical: "Saya pegang Subuh",
    risky: "Saya pegang Subuh",
    ok: "Saya pegang Subuh",
  },
  CAREER: {
    critical: "Saya kirim 1 chat klien",
    risky: "Saya kirim 1 chat klien",
    ok: "Saya kirim 1 chat klien",
  },
};

const getActionForDomain = (domain: PrimaryDriver, status: DomainStatus) => {
  const copy = ACTION_COPY[domain];
  if (status.level === "KRITIS") {
    return copy.critical;
  }
  if (status.level === "RAWAN") {
    return copy.risky;
  }
  return copy.ok;
};

const getKnownDaysForDomain = (
  domain: PrimaryDriver,
  dailyCount7: number,
  financeCount7: number,
  careerCount7: number,
) => {
  if (domain === "FINANCE") {
    return financeCount7;
  }
  if (domain === "CAREER") {
    return careerCount7;
  }
  return dailyCount7;
};


const computeStability = ({
  today,
  daily3Raw,
  daily7Raw,
  confidence,
}: {
  today?: DailyLogRecord;
  daily3Raw: Array<DailyLogRecord | undefined>;
  daily7Raw: Array<DailyLogRecord | undefined>;
  confidence: number;
}): DomainStatus => {
  const hasToday = Boolean(today);
  const sleepAvg3 = avg(collectNumbers(daily3Raw, (log) => log.sleepHours));
  const sleepAvg7 = avg(collectNumbers(daily7Raw, (log) => log.sleepHours));
  const moodAvg3 = avg(collectNumbers(daily3Raw, (log) => log.moodScore));
  const dropSum3 = sum(collectNumbers(daily3Raw, (log) => log.dropModeRuns));

  const sleepToday = today?.sleepHours ?? 0;
  const mealsToday = today?.mealsCount ?? 0;
  const breathToday = today?.breathSessions ?? 0;
  const dropToday = today?.dropModeRuns ?? 0;

  const isCritical =
    (hasToday && sleepToday < 5) ||
    (sleepAvg3 > 0 && sleepAvg3 < 5.0) ||
    (hasToday && mealsToday === 0) ||
    (hasToday && dropToday >= 3) ||
    (hasToday && sleepToday < 6 && dropToday >= 2);

  const isRisky =
    (sleepAvg3 > 0 && sleepAvg3 < 5.5) ||
    (hasToday && sleepToday >= 5 && sleepToday < 6) ||
    (hasToday && breathToday < 2) ||
    moodAvg3 >= 4;

  let level: Level = isCritical ? "KRITIS" : isRisky ? "RAWAN" : "AMAN";
  if (!hasToday && confidence < 60) {
    level = "RAWAN";
  }

  let score = 0;
  if (hasToday) {
    score +=
      sleepToday >= 6 ? 35 : sleepToday >= 5 ? 25 : sleepToday >= 4 ? 12 : 0;
    score += mealsToday >= 2 ? 20 : mealsToday === 1 ? 10 : 0;
    score += breathToday >= 2 ? 15 : breathToday === 1 ? 8 : 0;
    score +=
      dropToday === 0 ? 15 : dropToday === 1 ? 10 : dropToday === 2 ? 5 : 0;
    if (today?.moodScore !== undefined) {
      const mood = today.moodScore;
      score +=
        mood === 1
          ? 15
          : mood === 2
            ? 12
            : mood === 3
              ? 8
              : mood === 4
                ? 4
                : 0;
    }
  }

  if (sleepAvg3 > 0 && sleepAvg3 < 5) {
    score -= 12;
  } else if (sleepAvg3 > 0 && sleepAvg3 < 5.5) {
    score -= 6;
  }
  if (dropSum3 >= 6) {
    score -= 10;
  } else if (dropSum3 >= 3) {
    score -= 5;
  }

  const reasons: string[] = [];
  if (hasToday && sleepToday < 5) {
    reasons.push("Tidur saya terlalu tipis hari ini, jadi tubuh mudah panik.");
  } else if (hasToday && sleepToday < 6) {
    reasons.push("Saya kurang tidur, jadi sistem saya gampang panik.");
  }
  if (sleepAvg3 > 0 && sleepAvg3 < 5.5) {
    reasons.push("Tiga hari terakhir tidur saya masih tipis.");
  }
  if (sleepAvg7 > 0 && sleepAvg3 > 0 && sleepAvg3 + 0.3 < sleepAvg7) {
    reasons.push("Ritme tidur 3 hari ini turun dari minggu ini.");
  }
  if (hasToday && mealsToday === 0) {
    reasons.push("Hari ini saya nyaris tidak makan.");
  } else if (hasToday && mealsToday < 2) {
    reasons.push("Makan saya belum cukup, jadi energi gampang drop.");
  }
  if (hasToday && breathToday < 2) {
    reasons.push("Napas sadar saya kurang, jadi kepala mudah ramai.");
  }
  if (hasToday && dropToday >= 2) {
    reasons.push("Drop Mode saya sering aktif, saya perlu menurunkan beban.");
  }
  if (dropSum3 >= 6) {
    reasons.push("Drop Mode menumpuk 3 hari ini, saya perlu pelan.");
  }
  if (moodAvg3 >= 4) {
    reasons.push("Beberapa hari ini terasa berat.");
  }
  if (reasons.length === 0) {
    if (!hasToday) {
      reasons.push("Catatan hari ini belum saya isi.");
    } else {
      reasons.push("Hari ini saya cukup stabil.");
    }
  }
  if (confidence < 60) {
    reasons.unshift("Ini masih perkiraan karena catatan saya minim.");
  }

  const actions =
    level === "KRITIS"
      ? ["Drop Mode", "Tidur diprioritaskan", "Keputusan besar nanti"]
      : level === "RAWAN"
        ? ["Tambah 1 sesi napas", "Tidur dimajukan"]
        : ["Jaga ritme sederhana"];

  return {
    level,
    score: clamp(score),
    reasons: pickReasons(reasons),
    actions,
    confidence,
    metrics: {
      sleepAvg3,
      sleepAvg7,
      moodAvg3,
      dropSum3,
      sleepHoursToday: sleepToday,
      mealsCountToday: mealsToday,
      breathSessionsToday: breathToday,
      dropModeRunsToday: dropToday,
      todayKnown: hasToday ? 1 : 0,
    },
  };
};

const computeFinance = ({
  today,
  finance7Raw,
  confidence,
  rokokMax,
  weeklyTopupTarget,
  paydayDay,
  dateWib,
  dueDays,
}: {
  today?: FinanceLogRecord;
  finance7Raw: Array<FinanceLogRecord | undefined>;
  confidence: number;
  rokokMax: number;
  weeklyTopupTarget: number;
  paydayDay: number;
  dateWib: Date;
  dueDays: number[];
}): DomainStatus => {
  const todayKnown = Boolean(today);
  const totalExpenseToday = today
    ? today.expenseMakan +
      today.expenseBensin +
      today.topupOjol +
      today.rokokKopi +
      today.otherExpense
    : 0;
  const netToday = today ? today.incomeOjol - totalExpenseToday : 0;

  const netDays = finance7Raw.map((log) => {
    if (!log) {
      return undefined;
    }
    return (
      log.incomeOjol -
      (log.expenseMakan +
        log.expenseBensin +
        log.topupOjol +
        log.rokokKopi +
        log.otherExpense)
    );
  });

  let deficitStreak = 0;
  for (const net of netDays) {
    if (net === undefined) {
      break;
    }
    if (net < 0) {
      deficitStreak += 1;
    } else {
      break;
    }
  }

  const expenseValues7 = collectNumbers(finance7Raw, (log) => {
    return (
      log.expenseMakan +
      log.expenseBensin +
      log.topupOjol +
      log.rokokKopi +
      log.otherExpense
    );
  });
  const expenseValues3 = collectNumbers(finance7Raw.slice(0, 3), (log) => {
    return (
      log.expenseMakan +
      log.expenseBensin +
      log.topupOjol +
      log.rokokKopi +
      log.otherExpense
    );
  });
  const incomeValues7 = collectNumbers(finance7Raw, (log) => log.incomeOjol);
  const topupValues7 = collectNumbers(finance7Raw, (log) => log.topupOjol);

  const spendingAvg7 = avg(expenseValues7);
  const spendingAvg3 = avg(expenseValues3);
  const incomeAvg7 = avg(incomeValues7);
  const weeklyTopup7 = sum(topupValues7);
  const topupStreak = finance7Raw
    .slice(0, 3)
    .every((log) => log && log.topupOjol > 0);

  const cashOnHand = today?.cashOnHandTonight ?? 0;
  const cashOnHandMissing = !today || today.cashOnHandTonight === undefined;
  const daysToPayday = getDaysToPayday(dateWib, paydayDay);
  const projectedNetToPayday =
    cashOnHand + 60000 * daysToPayday - spendingAvg7 * daysToPayday;

  let level: Level = "AMAN";
  const netDeficitToday = todayKnown && netToday < 0;
  const rokokToday = today?.rokokKopi ?? 0;
  const rokokOver = todayKnown && rokokToday > rokokMax;
  const rokokOverHard = todayKnown && rokokToday > rokokMax * 2;
  if (
    deficitStreak >= 2 ||
    (netDeficitToday && cashOnHand < 50000) ||
    rokokOverHard ||
    topupStreak
  ) {
    level = "KRITIS";
  } else if (netDeficitToday || weeklyTopup7 > weeklyTopupTarget || rokokOver) {
    level = "RAWAN";
  }

  const nearDue = isNearDueDay(dateWib, dueDays, 2);
  if (nearDue && level !== "AMAN") {
    level = bumpLevel(level);
  }

  const projectionReason =
    projectedNetToPayday < 0
      ? "Dengan ritme ini, saya berisiko defisit sebelum gajian."
      : "Dengan ritme ini, saya cukup aman sampai gajian.";

  const reasons: string[] = [];
  if (deficitStreak >= 2) {
    reasons.push("Defisit saya beruntun, saya perlu berhenti bocor.");
  }
  if (netDeficitToday) {
    reasons.push("Hari ini saya defisit. Saya hentikan bocor dulu.");
  }
  if (topupStreak) {
    reasons.push("Topup terlalu sering, itu tanda saya kembali ke pola panik.");
  }
  if (weeklyTopup7 > weeklyTopupTarget) {
    reasons.push("Topup mingguan melewati pagar.");
  }
  if (rokokOverHard) {
    reasons.push("Rokok/kopi saya sudah terlalu tinggi hari ini.");
  } else if (rokokOver) {
    reasons.push("Rokok/kopi di atas pagar harian.");
  }
  if (spendingAvg7 > 0 && spendingAvg3 > spendingAvg7 * 1.1) {
    reasons.push("Belanja 3 hari ini lebih tinggi dari ritme mingguan.");
  }
  if (nearDue) {
    reasons.push("Tagihan pinjol sudah dekat, saya perlu ekstra rapi.");
  }
  if (cashOnHandMissing) {
    reasons.push("Buffer malam ini belum saya isi, jadi ini perkiraan.");
  }
  if (confidence < 60) {
    reasons.unshift("Ini masih perkiraan karena catatan saya minim.");
  }

  const mainReasons = reasons.filter((reason) => reason !== projectionReason);
  const finalReasons = [mainReasons[0], projectionReason].filter(
    Boolean,
  ) as string[];

  const actions =
    level === "KRITIS"
      ? [
          "Mode Beku 3 hari (rokok max 5k, other 0, topup stop kecuali mingguan)",
          "Pagar rokok/topup",
        ]
      : level === "RAWAN"
        ? ["Kembali ke pagar rokok/topup"]
        : ["Jaga ritme pengeluaran"];

  const scorePenalty =
    (netDeficitToday ? 20 : 0) +
    (deficitStreak >= 2 ? 20 : deficitStreak === 1 ? 10 : 0) +
    (projectedNetToPayday < 0 ? 15 : 0) +
    (weeklyTopup7 > weeklyTopupTarget ? 10 : 0) +
    (rokokOver ? 10 : 0) +
    (rokokOverHard ? 10 : 0) +
    (topupStreak ? 10 : 0) +
    (nearDue ? 5 : 0);

  return {
    level,
    score: clamp(100 - scorePenalty),
    reasons: pickReasons(finalReasons),
    actions,
    confidence,
    metrics: {
      netToday,
      deficitStreak,
      spendingAvg7,
      spendingAvg3,
      incomeAvg7,
      weeklyTopup7,
      topupStreak: topupStreak ? 1 : 0,
      daysToPayday,
      projectedNetToPayday,
      nearDue: nearDue ? 1 : 0,
      cashOnHand,
      rokokMax,
      weeklyTopupTarget,
      knownDays7: countExisting(finance7Raw),
      todayKnown: todayKnown ? 1 : 0,
    },
  };
};

const computeRelations = ({
  daily7Raw,
  daily2Raw,
  stabilityLevel,
  confidence,
}: {
  daily7Raw: Array<DailyLogRecord | undefined>;
  daily2Raw: Array<DailyLogRecord | undefined>;
  stabilityLevel: Level;
  confidence: number;
}): DomainStatus => {
  const todayLog = daily7Raw[0];
  const todayRitual = todayLog?.ritualDone;
  const knownDays7 = countKnownDays(daily7Raw);
  const ritualTrue7 = countTrueDays(daily7Raw, (log) => log.ritualDone);
  const bolong2hariKnown =
    daily2Raw[0]?.ritualDone === false && daily2Raw[1]?.ritualDone === false;

  let level: Level = "RAWAN";
  if (knownDays7 >= 4) {
    level =
      ritualTrue7 >= 6 ? "AMAN" : ritualTrue7 >= 3 ? "RAWAN" : "KRITIS";
  }

  if (
    (stabilityLevel === "RAWAN" || stabilityLevel === "KRITIS") &&
    bolong2hariKnown
  ) {
    level = bumpLevel(level);
  }

  if (knownDays7 < 4 && level === "KRITIS") {
    level = "RAWAN";
  }
  if (todayRitual && level === "KRITIS") {
    level = "RAWAN";
  }

  const lowData = knownDays7 < 4;
  const reasons: string[] = [];
  if (lowData) {
    reasons.push("Ini masih perkiraan karena catatan saya minim.");
    if (todayRitual) {
      reasons.push("Hari ini saya sudah hadir.");
    }
  } else {
    if (ritualTrue7 <= 2) {
      reasons.push("Saya terlalu jarang hadir akhir-akhir ini.");
    } else if (ritualTrue7 <= 5) {
      reasons.push("Saya masih bolong-bolong hadir minggu ini.");
    } else {
      reasons.push("Saya tetap hadir, walau sebentar.");
    }
    if (todayRitual) {
      reasons.push("Hari ini saya sudah hadir.");
    }
  }

  if (bolong2hariKnown) {
    reasons.push("Dua hari ini saya bolong, saya perlu hadir sebentar saja.");
  }

  if (confidence < 60 && !reasons[0]?.includes("perkiraan")) {
    reasons.unshift("Ini masih perkiraan karena catatan saya minim.");
  }

  const actions =
    level === "AMAN"
      ? ["Pertahankan ritual 7 menit"]
      : ["Ritual 7 menit hari ini", "Satu bantuan kecil minggu ini"];

  const baseScore =
    knownDays7 >= 4 ? (ritualTrue7 >= 6 ? 90 : ritualTrue7 >= 3 ? 60 : 30) : 50;
  let score = bolong2hariKnown ? baseScore - 10 : baseScore;
  if (todayRitual) {
    score = Math.max(score, 60);
  }

  return {
    level,
    score: clamp(score),
    reasons: pickReasons(reasons),
    actions,
    confidence,
    metrics: {
      ritualCount7: ritualTrue7,
      knownDays7,
      bolong2hari: bolong2hariKnown ? 1 : 0,
    },
  };
};

const computeSpiritual = ({
  daily7Raw,
  confidence,
}: {
  daily7Raw: Array<DailyLogRecord | undefined>;
  confidence: number;
}): DomainStatus => {
  let brokenStreak = 0;
  for (const log of daily7Raw) {
    if (!log) {
      break;
    }
    if (!log.subuhDone) {
      brokenStreak += 1;
    } else {
      break;
    }
  }

  const knownDays7 = countKnownDays(daily7Raw);
  const todayLog = daily7Raw[0];
  const todayKnown = Boolean(todayLog);
  const todaySubuh = todayLog?.subuhDone === true;

  let level: Level = "RAWAN";
  if (todaySubuh) {
    level = "AMAN";
  } else if (brokenStreak >= 3) {
    level = "KRITIS";
  } else if (brokenStreak >= 1) {
    level = "RAWAN";
  }

  if (knownDays7 < 3 && level === "KRITIS") {
    level = "RAWAN";
  }

  const reasons: string[] = [];
  if (!todayKnown) {
    reasons.push("Ini masih perkiraan karena catatan saya minim.");
  }
  if (todaySubuh) {
    reasons.push("Saya pegang Subuh hari ini.");
  } else if (brokenStreak >= 3) {
    reasons.push("Saya tidak jauh. Saya sedang lelah beberapa hari ini.");
  } else {
    reasons.push("Saya tidak jauh. Saya sedang lelah.");
  }

  const actions =
    level === "AMAN"
      ? ["Jaga ritme Subuh"]
      : ["Pegang Subuh", "Doa jujur: Ya Allah, aku capek."];

  const score = level === "AMAN" ? 90 : level === "RAWAN" ? 60 : 30;

  return {
    level,
    score,
    reasons: pickReasons(reasons),
    actions,
    confidence,
    metrics: {
      subuhBrokenStreak: brokenStreak,
      knownDays7,
      todayKnown: todayKnown ? 1 : 0,
    },
  };
};

const computeCareer = ({
  career7Raw,
  stabilityLevel,
  confidence,
}: {
  career7Raw: Array<CareerLogRecord | undefined>;
  stabilityLevel: Level;
  confidence: number;
}): DomainStatus => {
  const todayLog = career7Raw[0];
  const todayKnown = Boolean(todayLog);
  const movedByChat = (todayLog?.clientChatsSent ?? 0) >= 1;
  const movedByDesign = (todayLog?.designMinutes ?? 0) >= 30;
  const movedToday = movedByChat || movedByDesign;
  const momentum7 = career7Raw.reduce((sumCount, log) => {
    if (!log) {
      return sumCount;
    }
    const moved = log.clientChatsSent >= 1 || log.designMinutes >= 30;
    return sumCount + (moved ? 1 : 0);
  }, 0);

  const knownDays7 = countKnownDays(career7Raw);

  let level: Level = movedToday ? "AMAN" : "RAWAN";
  if (
    knownDays7 >= 4 &&
    !movedToday &&
    momentum7 <= 2 &&
    stabilityLevel === "AMAN"
  ) {
    level = "KRITIS";
  }

  if (knownDays7 < 4 && level === "KRITIS") {
    level = "RAWAN";
  }

  if (stabilityLevel === "KRITIS" && level === "AMAN") {
    level = "RAWAN";
  }

  let moveReason = "Saya bergerak hari ini.";
  if (movedByChat && movedByDesign) {
    moveReason = "Saya bergerak hari ini (chat + desain).";
  } else if (movedByChat) {
    moveReason = "Saya bergerak hari ini (chat klien).";
  } else if (movedByDesign) {
    moveReason = "Saya bergerak hari ini (desain).";
  }

  const reasons: string[] = [];
  if (!todayKnown) {
    reasons.push("Ini masih perkiraan karena catatan saya minim.");
  }
  if (movedToday) {
    reasons.push(moveReason);
  } else if (stabilityLevel === "KRITIS") {
    reasons.push("Hari ini saya utamakan selamat dulu.");
  } else if (level === "KRITIS") {
    reasons.push("Saya cukup stabil, tapi ritme kerja mandek.");
  } else {
    reasons.push("Hari ini saya belum bergerak.");
  }

  const actions =
    stabilityLevel === "KRITIS"
      ? ["Hari ini saya selamat dulu. Karier besok."]
      : level === "KRITIS"
        ? ["Besok cukup 1 chat saja."]
        : level === "RAWAN"
          ? ["Mulai dari 1 chat kecil."]
          : ["Jaga ritme kecil."];

  const score = movedToday ? 85 : level === "KRITIS" ? 35 : 55;

  return {
    level,
    score,
    reasons: pickReasons(reasons),
    actions,
    confidence,
    metrics: {
      momentum7,
      movedToday: movedToday ? 1 : 0,
      knownDays7,
      todayKnown: todayKnown ? 1 : 0,
    },
  };
};

const computeImpactScores = ({
  stability,
  finance,
  relations,
  spiritual,
  career,
}: {
  stability: DomainStatus;
  finance: DomainStatus;
  relations: DomainStatus;
  spiritual: DomainStatus;
  career: DomainStatus;
}) => {
  const stabilityMetrics = stability.metrics ?? {};
  const financeMetrics = finance.metrics ?? {};
  const relationsMetrics = relations.metrics ?? {};
  const spiritualMetrics = spiritual.metrics ?? {};
  const careerMetrics = career.metrics ?? {};

  let stabilityImpact = 0;
  const sleepAvg3 = stabilityMetrics.sleepAvg3 ?? 0;
  const dropSum3 = stabilityMetrics.dropSum3 ?? 0;
  if (sleepAvg3 > 0 && sleepAvg3 < 5) {
    stabilityImpact += 40;
  } else if (sleepAvg3 > 0 && sleepAvg3 < 5.5) {
    stabilityImpact += 25;
  }
  if ((stabilityMetrics.sleepHoursToday ?? 0) < 5) {
    stabilityImpact += 20;
  }
  if (dropSum3 >= 6) {
    stabilityImpact += 25;
  } else if (dropSum3 >= 3) {
    stabilityImpact += 15;
  }
  if ((stabilityMetrics.breathSessionsToday ?? 0) < 2) {
    stabilityImpact += 10;
  }
  if ((stabilityMetrics.mealsCountToday ?? 0) === 0) {
    stabilityImpact += 10;
  }

  let financeImpact = 0;
  if ((financeMetrics.deficitStreak ?? 0) >= 2) {
    financeImpact += 35;
  } else if ((financeMetrics.deficitStreak ?? 0) === 1) {
    financeImpact += 20;
  }
  if ((financeMetrics.projectedNetToPayday ?? 0) < 0) {
    financeImpact += 30;
  }
  if ((financeMetrics.nearDue ?? 0) > 0) {
    financeImpact += 15;
  }
  if ((financeMetrics.netToday ?? 0) < 0) {
    financeImpact += 15;
  }
  if (
    (financeMetrics.weeklyTopup7 ?? 0) >
    (financeMetrics.weeklyTopupTarget ?? 0)
  ) {
    financeImpact += 10;
  }
  let relationsImpact = 0;
  const ritualCount7 = relationsMetrics.ritualCount7 ?? 0;
  if (ritualCount7 <= 2) {
    relationsImpact += 25;
  } else if (ritualCount7 <= 5) {
    relationsImpact += 15;
  }
  if (stability.level !== "AMAN") {
    relationsImpact += 10;
  }
  if ((relationsMetrics.bolong2hari ?? 0) > 0) {
    relationsImpact += 10;
  }

  let spiritualImpact = 0;
  const brokenStreak = spiritualMetrics.subuhBrokenStreak ?? 0;
  if (brokenStreak >= 3) {
    spiritualImpact += 20;
  } else if (brokenStreak >= 1) {
    spiritualImpact += 10;
  }

  let careerImpact = 0;
  const momentum7 = careerMetrics.momentum7 ?? 0;
  if (stability.level === "AMAN" && momentum7 <= 2) {
    careerImpact += 20;
  }
  if ((careerMetrics.movedToday ?? 0) === 0) {
    careerImpact += 10;
  }

  return {
    STABILITY: clamp(stabilityImpact),
    FINANCE: clamp(financeImpact),
    RELATIONS: clamp(relationsImpact),
    SPIRITUAL: clamp(spiritualImpact),
    CAREER: clamp(careerImpact),
  };
};

const computePlanTomorrow = ({
  mode,
  primaryDriver,
  bottleneckDomain,
  dailyLogToday,
  relationLogToday,
  stability,
  finance,
  relations,
  spiritual,
  career,
}: {
  mode: ModeTomorrow;
  primaryDriver: PrimaryDriver;
  bottleneckDomain: PrimaryDriver;
  dailyLogToday?: DailyLogRecord;
  relationLogToday?: RelationLogRecord;
  stability: DomainStatus;
  finance: DomainStatus;
  relations: DomainStatus;
  spiritual: DomainStatus;
  career: DomainStatus;
}) => {
  const plan: string[] = [];
  const pushPlan = (item: string) => {
    if (!item || plan.includes(item)) {
      return;
    }
    plan.push(item);
  };

  const statusMap: Record<PrimaryDriver, DomainStatus> = {
    STABILITY: stability,
    FINANCE: finance,
    RELATIONS: relations,
    SPIRITUAL: spiritual,
    CAREER: career,
  };

  const todayKnown = (stability.metrics?.todayKnown ?? 0) > 0;
  const energyLow =
    stability.level === "RAWAN" &&
    todayKnown &&
    ((stability.metrics?.breathSessionsToday ?? 0) < 2 ||
      (stability.metrics?.mealsCountToday ?? 0) < 2 ||
      (stability.metrics?.sleepHoursToday ?? 0) < 6);
  const allowCareerAction = !energyLow;

  const getRelationPlanAction = () => {
    const ritualToday = dailyLogToday?.ritualDone === true;
    if (ritualToday) {
      const hasNote = Boolean(relationLogToday?.wifeNote?.trim());
      return hasNote
        ? "Pertahankan ritual 7 menit besok"
        : "Besok cukup 1 kalimat untuk istri";
    }
    return "Saya ritual 7 menit (besok)";
  };

  const pushDomainAction = (domain: PrimaryDriver) => {
    if (domain === "CAREER" && !allowCareerAction) {
      return;
    }
    if (domain === "RELATIONS") {
      pushPlan(getRelationPlanAction());
      return;
    }
    pushPlan(getActionForDomain(domain, statusMap[domain]));
  };

  pushDomainAction(bottleneckDomain);
  if (primaryDriver !== bottleneckDomain) {
    pushDomainAction(primaryDriver);
  }

  if (mode !== "SELAMAT") {
    const extraCandidates: PrimaryDriver[] = [
      "RELATIONS",
      "SPIRITUAL",
      "CAREER",
    ];
    for (const candidate of extraCandidates) {
      if (candidate === "CAREER" && !allowCareerAction) {
        continue;
      }
      const action = getActionForDomain(candidate, statusMap[candidate]);
      if (!plan.includes(action)) {
        pushPlan(action);
        break;
      }
    }
  }

  return plan.slice(0, mode === "SELAMAT" ? 2 : 3);
};

export const getAssessmentForToday = async (): Promise<DailyAssessment> => {
  const dateKey = getJakartaDateKey();
  const dateWib = parseDateKey(dateKey);
  const settings = await getOrInitSettings();

  const last7Keys = getDateKeysBack(7, dateWib);
  const [daily7Raw, finance7Raw, relation7Raw, career7Raw] = await Promise.all([
    db.dailyLogs.bulkGet(last7Keys),
    db.financeLogs.bulkGet(last7Keys),
    db.relationLogs.bulkGet(last7Keys),
    db.careerLogs.bulkGet(last7Keys),
  ]);

  const daily3Raw = daily7Raw.slice(0, 3);
  const daily2Raw = daily7Raw.slice(0, 2);

  const knownDaily3 = countExisting(daily3Raw);
  const todayDailyKnown = Boolean(daily7Raw[0]);
  let stabilityConfidence = 40;
  if (todayDailyKnown && knownDaily3 >= 2) {
    stabilityConfidence = 100;
  } else if (!todayDailyKnown && knownDaily3 >= 1) {
    stabilityConfidence = 70;
  } else if (todayDailyKnown) {
    stabilityConfidence = 70;
  }

  const financeCount7 = countExisting(finance7Raw);
  let financeConfidence = 40;
  if (financeCount7 >= 4 && finance7Raw[0]?.cashOnHandTonight !== undefined) {
    financeConfidence = 100;
  } else if (financeCount7 >= 1) {
    financeConfidence = 70;
  }

  const dailyCount7 = countKnownDays(daily7Raw);
  const relationsConfidence =
    dailyCount7 >= 4 ? 80 : dailyCount7 >= 2 ? 50 : 40;
  const spiritualConfidence =
    dailyCount7 >= 4 ? 80 : dailyCount7 >= 2 ? 50 : 40;

  const careerCount7 = countKnownDays(career7Raw);
  const careerConfidence =
    careerCount7 >= 4 ? 80 : careerCount7 >= 2 ? 50 : 40;

  const stability = computeStability({
    today: daily7Raw[0],
    daily3Raw,
    daily7Raw,
    confidence: stabilityConfidence,
  });

  const finance = computeFinance({
    today: finance7Raw[0],
    finance7Raw,
    confidence: financeConfidence,
    rokokMax: settings.dailyTargets.rokokMax,
    weeklyTopupTarget: settings.weeklyTargets.topupOjolWeekly,
    paydayDay: settings.payday.wifePaydayDay,
    dateWib,
    dueDays: settings.debt.pinjolDueDays,
  });

  const relations = computeRelations({
    daily7Raw,
    daily2Raw,
    stabilityLevel: stability.level,
    confidence: relationsConfidence,
  });

  const spiritual = computeSpiritual({
    daily7Raw,
    confidence: spiritualConfidence,
  });

  const career = computeCareer({
    career7Raw,
    stabilityLevel: stability.level,
    confidence: careerConfidence,
  });

  const overallLevel = worstLevel([
    stability.level,
    finance.level,
    relations.level,
    spiritual.level,
    career.level,
  ]);

  const impactScores = computeImpactScores({
    stability,
    finance,
    relations,
    spiritual,
    career,
  });

  const DRIVER_ORDER: PrimaryDriver[] = [
    "STABILITY",
    "FINANCE",
    "RELATIONS",
    "SPIRITUAL",
    "CAREER",
  ];

  const driverStatusMap: Record<PrimaryDriver, DomainStatus> = {
    STABILITY: stability,
    FINANCE: finance,
    RELATIONS: relations,
    SPIRITUAL: spiritual,
    CAREER: career,
  };
  const driverScores = DRIVER_ORDER.reduce<Record<PrimaryDriver, number>>(
    (scores, driver) => {
      const status = driverStatusMap[driver];
      let score = impactScores[driver] * (status.confidence / 100);
      if (status.confidence < 60 && status.level !== "KRITIS") {
        score *= 0.25;
      }
      scores[driver] = Math.round(score);
      return scores;
    },
    {
      STABILITY: 0,
      FINANCE: 0,
      RELATIONS: 0,
      SPIRITUAL: 0,
      CAREER: 0,
    },
  );

  const primaryDriver = [...DRIVER_ORDER].sort((a, b) => {
    const diff = driverScores[b] - driverScores[a];
    if (diff !== 0) {
      return diff;
    }
    return DRIVER_ORDER.indexOf(a) - DRIVER_ORDER.indexOf(b);
  })[0] as PrimaryDriver;

  const bottleneckDomainCandidates = DRIVER_ORDER.filter(
    (driver) => driverStatusMap[driver].confidence >= 70,
  );
  const bottleneckDomain =
    bottleneckDomainCandidates.length === 0
      ? primaryDriver
      : bottleneckDomainCandidates.reduce<PrimaryDriver>((best, driver) => {
          const bestLevel = driverStatusMap[best].level;
          const currentLevel = driverStatusMap[driver].level;
          const levelDiff = LEVEL_ORDER[currentLevel] - LEVEL_ORDER[bestLevel];
          if (levelDiff !== 0) {
            return levelDiff > 0 ? driver : best;
          }
          return DRIVER_ORDER.indexOf(driver) < DRIVER_ORDER.indexOf(best)
            ? driver
            : best;
        }, bottleneckDomainCandidates[0] as PrimaryDriver);

  let reasonDriver: PrimaryDriver = primaryDriver;
  if (driverStatusMap[primaryDriver].confidence < 60) {
    const reliableCandidates: PrimaryDriver[] = ["STABILITY", "FINANCE"].filter(
      (driver) =>
        driverStatusMap[driver].confidence >= 70 &&
        driverStatusMap[driver].level !== "AMAN",
    ) as PrimaryDriver[];
    if (reliableCandidates.length > 0) {
      reasonDriver = reliableCandidates.reduce<PrimaryDriver>((best, driver) => {
        const bestLevel = driverStatusMap[best].level;
        const currentLevel = driverStatusMap[driver].level;
        const levelDiff = LEVEL_ORDER[currentLevel] - LEVEL_ORDER[bestLevel];
        if (levelDiff !== 0) {
          return levelDiff > 0 ? driver : best;
        }
        return DRIVER_ORDER.indexOf(driver) < DRIVER_ORDER.indexOf(best)
          ? driver
          : best;
      }, reliableCandidates[0]);
    }
  }

  const primaryReasons = driverStatusMap[reasonDriver].reasons;
  const reasonKnownDays = getKnownDaysForDomain(
    reasonDriver,
    dailyCount7,
    financeCount7,
    careerCount7,
  );
  const trendMarkers = [
    "akhir-akhir",
    "tiga hari",
    "3 hari",
    "minggu",
    "mingguan",
    "beberapa hari",
    "7 hari",
    "tujuh hari",
  ];
  let overallReasons = Array.from(new Set(primaryReasons));
  if (reasonKnownDays < 4) {
    overallReasons = overallReasons.filter((reason) => {
      const lower = reason.toLowerCase();
      return !trendMarkers.some((marker) => lower.includes(marker));
    });
  }
  const reasonConfidence = driverStatusMap[reasonDriver].confidence;
  const hasDisclaimer = overallReasons.some((reason) => {
    const lower = reason.toLowerCase();
    return lower.includes("perkiraan") || lower.includes("sementara");
  });
  if (reasonConfidence < 60 && !hasDisclaimer) {
    overallReasons.unshift("Sementara ini saya membaca ini sebagai perkiraan.");
  }
  overallReasons = Array.from(new Set(overallReasons));
  if (overallReasons.length === 0) {
    overallReasons.push("Catatan saya belum cukup, jadi ini sementara.");
  }
  overallReasons = overallReasons.slice(0, 2);

  const modeTomorrow: ModeTomorrow =
    stability.level === "KRITIS" || finance.level === "KRITIS"
      ? "SELAMAT"
      : overallLevel === "RAWAN"
        ? "RAPIKAN"
        : "DORONG";

  const planTomorrow = computePlanTomorrow({
    mode: modeTomorrow,
    primaryDriver,
    bottleneckDomain,
    dailyLogToday: daily7Raw[0],
    relationLogToday: relation7Raw[0],
    stability,
    finance,
    relations,
    spiritual,
    career,
  });

  const debugCounts = {
    knownDays7: dailyCount7,
    ritualTrue7: countTrueDays(daily7Raw, (log) => log.ritualDone),
    subuhFalseStreak: spiritual.metrics?.subuhBrokenStreak ?? 0,
    deficitStreak: finance.metrics?.deficitStreak ?? 0,
    weeklyTopup7: finance.metrics?.weeklyTopup7 ?? 0,
    topupStreak: (finance.metrics?.topupStreak ?? 0) > 0,
  };

  return {
    dateKey,
    stability,
    finance,
    relations,
    spiritual,
    career,
    overallLevel,
    overallReasons,
    planTomorrow,
    primaryDriver,
    modeTomorrow,
    debug: {
      dateKeyToday: dateKey,
      dailyLog: daily7Raw[0],
      financeLog: finance7Raw[0],
      relationLog: relation7Raw[0],
      careerLog: career7Raw[0],
      last7Keys,
      primaryDriverConfidence: driverStatusMap[primaryDriver].confidence,
      bottleneckDomain,
      bottleneckConfidence: driverStatusMap[bottleneckDomain].confidence,
      driverScores,
      counts: debugCounts,
    },
  };
};
