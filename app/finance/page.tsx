"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/app/components/PageShell";
import { db } from "@/lib/db";
import {
  getTodayDateKey,
  upsertDailyLogPatch,
  upsertFinanceLogPatch,
} from "@/lib/logs";
import { useSettings } from "@/lib/settings";
import { getJakartaDateKey } from "@/lib/time";

const formatRupiah = (value: number) => {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const absValue = Math.abs(safe);
  return `${safe < 0 ? "-" : ""}Rp${absValue.toLocaleString("id-ID")}`;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const avg = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
};

const toNumber = (value?: number) => {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
};

const getDateKeysBack = (days: number, baseDate: Date) => {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(baseDate.getTime() - i * 86400000);
    keys.push(getJakartaDateKey(date));
  }
  return keys;
};

const getWibParts = (date: Date) => {
  const dateKey = getJakartaDateKey(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day, dateKey };
};

const getDaysToPayday = (parts: { year: number; month: number; day: number }, paydayDay: number) => {
  const { year, month, day } = parts;
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

const getNextDueInfo = (
  parts: { year: number; month: number; day: number },
  dueDays: number[],
) => {
  const sorted = [...dueDays].sort((a, b) => a - b);
  const { year, month, day } = parts;
  let dueDay = sorted.find((candidate) => candidate >= day);
  let dueMonth = month;
  let dueYear = year;
  if (!dueDay) {
    dueDay = sorted[0];
    dueMonth = month + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = year + 1;
    }
  }
  const todayUtc = Date.UTC(year, month - 1, day);
  const dueUtc = Date.UTC(dueYear, dueMonth - 1, dueDay);
  const daysToDue = Math.max(0, Math.round((dueUtc - todayUtc) / 86400000));
  return { dueDay, dueMonth, dueYear, daysToDue };
};

export default function FinancePage() {
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const settings = useSettings();
  const financeLog = useLiveQuery(() => db.financeLogs.get(dateKey), [dateKey]);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const last7Keys = useMemo(() => getDateKeysBack(7, new Date()), [dateKey]);
  const financeLast7 = useLiveQuery(
    () => db.financeLogs.bulkGet(last7Keys),
    [last7Keys],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const incomeOjol = toNumber(financeLog?.incomeOjol);
  const expenseMakan = toNumber(financeLog?.expenseMakan);
  const expenseBensin = toNumber(financeLog?.expenseBensin);
  const topupOjol = toNumber(financeLog?.topupOjol);
  const rokokKopi = toNumber(financeLog?.rokokKopi);
  const otherExpense = toNumber(financeLog?.otherExpense);
  const cashOnHand = toNumber(financeLog?.cashOnHandTonight);
  const totalExpense =
    expenseMakan + expenseBensin + topupOjol + rokokKopi + otherExpense;
  const net = incomeOjol - totalExpense;

  const last7Existing = (financeLast7 ?? []).filter(
    (log): log is NonNullable<typeof log> => Boolean(log),
  );
  const weeklyTopup7 = sum(last7Existing.map((log) => log.topupOjol));
  const expenseValues7 = last7Existing.map((log) => {
    return (
      log.expenseMakan +
      log.expenseBensin +
      log.topupOjol +
      log.rokokKopi +
      log.otherExpense
    );
  });
  const avgExpense7 = avg(expenseValues7);

  const rokokMax = settings?.dailyTargets.rokokMax ?? 0;
  const topupWeeklyTarget = settings?.weeklyTargets.topupOjolWeekly ?? 0;
  const pinjolMonthly = settings?.debt.pinjolMonthly ?? 0;
  const pinjolDueDays = settings?.debt.pinjolDueDays ?? [1, 15];
  const monthsRemaining = settings?.debt.monthsRemaining ?? 0;
  const paydayDay = settings?.payday.wifePaydayDay ?? 27;

  const freezeModeActive = dailyLog?.freezeMode ?? false;
  const rokokStatus =
    rokokKopi > rokokMax * 2
      ? "KRITIS"
      : rokokKopi > rokokMax
        ? "RAWAN"
        : "OK";

  const wibParts = useMemo(() => getWibParts(new Date()), []);
  const dueInfo = useMemo(
    () => getNextDueInfo(wibParts, pinjolDueDays),
    [pinjolDueDays, wibParts],
  );
  const daysToPayday = getDaysToPayday(wibParts, paydayDay);
  const incomeMin = 60000 * daysToPayday;
  const projectedNetToPayday =
    cashOnHand + incomeMin - avgExpense7 * daysToPayday;

  const halfMonthly = pinjolMonthly / 2;
  const dailyNeedToDue = Math.ceil(
    halfMonthly / Math.max(1, dueInfo.daysToDue),
  );

  const readiness =
    dueInfo.daysToDue < 3
      ? cashOnHand >= halfMonthly
        ? "SIAP"
        : "RAWAN"
      : "BELUM MENDESAK";

  const topupWithinWeekly =
    topupOjol > 0 && weeklyTopup7 <= topupWeeklyTarget;

  const handleSetRokokZero = async () => {
    try {
      await upsertFinanceLogPatch(dateKey, { rokokKopi: 0 });
      showToast("Saya set rokok hari ini = 0.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mengubah rokok.");
    }
  };

  const handleSetOtherZero = async () => {
    try {
      await upsertFinanceLogPatch(dateKey, { otherExpense: 0 });
      showToast("Saya set pengeluaran lain = 0.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mengubah pengeluaran lain.");
    }
  };

  const handleToggleFreeze = async () => {
    const nextValue = !freezeModeActive;
    try {
      await Promise.all([
        upsertDailyLogPatch(dateKey, { freezeMode: nextValue }),
        upsertFinanceLogPatch(dateKey, { freezeModeApplied: nextValue }),
      ]);
      showToast(
        nextValue ? "Mode Beku aktif. Saya jaga pagar." : "Mode Beku dimatikan.",
      );
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mengubah Mode Beku.");
    }
  };

  const handleApplyFreeze = async () => {
    try {
      await Promise.all([
        upsertDailyLogPatch(dateKey, { freezeMode: true }),
        upsertFinanceLogPatch(dateKey, {
          freezeModeApplied: true,
          rokokKopi: Math.min(rokokKopi, 5000),
          otherExpense: 0,
        }),
      ]);
      showToast("Mode Beku saya terapkan ke angka hari ini.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menerapkan Mode Beku.");
    }
  };

  return (
    <PageShell title="Keuangan" description="Saya rapikan uang supaya saya tidak panik.">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)]"
        >
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Ringkasan Hari Ini
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{dateKey}</p>
        <div className="mt-4 grid gap-2 text-sm text-[color:var(--foreground)]">
          <div className="flex items-center justify-between">
            <span>Masuk ojol</span>
            <span className="font-semibold">{formatRupiah(incomeOjol)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Keluar hari ini</span>
            <span className="font-semibold">{formatRupiah(totalExpense)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Net hari ini</span>
            <span
              className={`font-semibold ${
                net >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500"
              }`}
            >
              {formatRupiah(net)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          {net < 0
            ? "Hari ini saya defisit. Saya hentikan bocor dulu."
            : "Hari ini saya aman secara harian."}
        </p>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Pagar Harian Saya
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[color:var(--muted)]">Rokok/kopi hari ini</span>
            <span className="font-semibold text-[color:var(--foreground)]">
              {formatRupiah(rokokKopi)} / {formatRupiah(rokokMax)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[color:var(--muted)]">Status rokok</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                rokokStatus === "OK"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : rokokStatus === "RAWAN"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              }`}
            >
              {rokokStatus}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[color:var(--muted)]">Topup ojol hari ini</span>
            <span className="font-semibold text-[color:var(--foreground)]">
              {formatRupiah(topupOjol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[color:var(--muted)]">Topup 7 hari</span>
            <span className="font-semibold text-[color:var(--foreground)]">
              {formatRupiah(weeklyTopup7)} / {formatRupiah(topupWeeklyTarget)}
            </span>
          </div>
          {weeklyTopup7 > topupWeeklyTarget ? (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              Topup mingguan melewati pagar. Saya rapikan lagi.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleSetRokokZero}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
            >
              Set rokok hari ini = 0
            </button>
            <button
              type="button"
              onClick={handleSetOtherZero}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
            >
              Set other hari ini = 0
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Mode Beku 3 Hari
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          3 hari ini saya selamat dulu: rokok max 5k, other 0, topup stop
          kecuali mingguan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleFreeze}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              freezeModeActive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "border border-[color:var(--border)] text-[color:var(--foreground)]"
            }`}
          >
            {freezeModeActive ? "Mode Beku Aktif" : "Aktifkan Mode Beku"}
          </button>
          <button
            type="button"
            onClick={handleApplyFreeze}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
          >
            Terapkan Mode Beku ke angka hari ini
          </button>
        </div>
        {freezeModeActive ? (
          <div className="mt-4 space-y-2 text-xs text-[color:var(--muted)]">
            {rokokKopi > 5000 ? (
              <p className="text-rose-500">
                Rokok/kopi hari ini melewati batas 5k.
              </p>
            ) : null}
            {otherExpense > 0 ? (
              <p className="text-rose-500">Other hari ini harus 0.</p>
            ) : null}
            {topupOjol > 0 ? (
              topupWithinWeekly ? (
                <p className="text-emerald-600 dark:text-emerald-300">
                  Topup hari ini masih di dalam pagar mingguan.
                </p>
              ) : (
                <p className="text-rose-500">
                  Topup hari ini sebaiknya stop dulu di Mode Beku.
                </p>
              )
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Pinjol (Utang) - Jadwal & Kesiapan
        </p>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--foreground)]">
          <p>Cicilan/bulan: {formatRupiah(pinjolMonthly)}</p>
          <p>Jatuh tempo: tgl {pinjolDueDays.join(" & ")}</p>
          <p>Sisa: {monthsRemaining} bulan</p>
          <p>
            H-{dueInfo.daysToDue} ke jatuh tempo berikutnya (tgl {dueInfo.dueDay}
            )
          </p>
          <p>Target harian menuju tempo: {formatRupiah(dailyNeedToDue)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-[color:var(--muted)]">Indikator kesiapan</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              readiness === "SIAP"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : readiness === "RAWAN"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
            }`}
          >
            {readiness}
          </span>
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Ini perkiraan dari uang di tangan malam ini.
        </p>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Proyeksi Sampai Gajian
        </p>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--foreground)]">
          <p>H- gajian: {daysToPayday} hari</p>
          <p>Rata2 keluar/7 hari: {formatRupiah(avgExpense7)}</p>
          <p>
            Estimasi aman/defisit: {formatRupiah(projectedNetToPayday)}
          </p>
        </div>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          {projectedNetToPayday < 0
            ? "Dengan ritme ini, saya berisiko defisit sebelum gajian."
            : "Dengan ritme ini, saya cukup aman sampai gajian."}
        </p>
      </section>
    </PageShell>
  );
}
