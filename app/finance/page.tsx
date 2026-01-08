"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Collapsible from "@/app/components/ui/Collapsible";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { db } from "@/lib/db";
import {
  getTodayDateKey,
  upsertDailyLogPatch,
  upsertFinanceLogPatch,
} from "@/lib/logs";
import { useSettings } from "@/lib/settings";
import { getJakartaDateKey } from "@/lib/time";

type CardKey = "ringkasan" | "pagar" | "utang";

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

const getDaysToPayday = (
  parts: { year: number; month: number; day: number },
  paydayDay: number,
) => {
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

const badgeClass = (tone: "ok" | "warn" | "danger") => {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-semibold";
  if (tone === "ok") {
    return `${base} bg-[color:var(--ok)]/15 text-[color:var(--ok)]`;
  }
  if (tone === "warn") {
    return `${base} bg-[color:var(--warn)]/15 text-[color:var(--warn)]`;
  }
  return `${base} bg-[color:var(--danger)]/15 text-[color:var(--danger)]`;
};

export default function FinancePage() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const [openCard, setOpenCard] = useState<CardKey | null>(null);
  const autoExpanded = useRef(false);
  const ringkasanRef = useRef<HTMLDivElement | null>(null);
  const pagarRef = useRef<HTMLDivElement | null>(null);
  const utangRef = useRef<HTMLDivElement | null>(null);
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
  const cashOnHandKnown = financeLog?.cashOnHandTonight !== undefined;
  const totalExpense =
    expenseMakan + expenseBensin + topupOjol + rokokKopi + otherExpense;
  const net = incomeOjol - totalExpense;

  const last7Existing = (financeLast7 ?? []).filter(
    (log): log is NonNullable<typeof log> => Boolean(log),
  );
  const weeklyTopup7 = sum(last7Existing.map((log) => toNumber(log.topupOjol)));
  const expenseValues7 = last7Existing.map((log) => {
    return (
      toNumber(log.expenseMakan) +
      toNumber(log.expenseBensin) +
      toNumber(log.topupOjol) +
      toNumber(log.rokokKopi) +
      toNumber(log.otherExpense)
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
  const rokokStatus = rokokMax > 0 && rokokKopi > rokokMax ? "RAWAN" : "OK";
  const topupStatus =
    topupWeeklyTarget > 0 && weeklyTopup7 > topupWeeklyTarget ? "RAWAN" : "OK";

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

  const dueBadge =
    dueInfo.daysToDue <= 1
      ? "RAWAN"
      : dueInfo.daysToDue <= 2
        ? "WASPADA"
        : "TENANG";
  const dueBadgeTone =
    dueInfo.daysToDue <= 1
      ? "danger"
      : dueInfo.daysToDue <= 2
        ? "warn"
        : "ok";
  const dueSummary =
    dueInfo.daysToDue === 0
      ? `Hari ini jatuh tempo (tgl ${dueInfo.dueDay})`
      : `H-${dueInfo.daysToDue} ke jatuh tempo (tgl ${dueInfo.dueDay})`;

  const topupWithinWeekly =
    topupOjol > 0 && topupWeeklyTarget > 0 && weeklyTopup7 <= topupWeeklyTarget;

  const handleToggleCard = (card: CardKey) => {
    autoExpanded.current = true;
    setOpenCard((prev) => (prev === card ? null : card));
  };

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

  const shouldExpandRingkasan = net < 0;
  const shouldExpandPagar =
    freezeModeActive ||
    (rokokMax > 0 && rokokKopi > rokokMax) ||
    (topupWeeklyTarget > 0 && weeklyTopup7 > topupWeeklyTarget);
  const shouldExpandUtang = dueInfo.daysToDue <= 2;

  useEffect(() => {
    if (autoExpanded.current) {
      return;
    }

    let nextCard: CardKey | null = null;
    if (shouldExpandRingkasan) {
      nextCard = "ringkasan";
    } else if (shouldExpandPagar) {
      nextCard = "pagar";
    } else if (shouldExpandUtang) {
      nextCard = "utang";
    }

    if (nextCard) {
      setOpenCard(nextCard);
      autoExpanded.current = true;
    }
  }, [shouldExpandRingkasan, shouldExpandPagar, shouldExpandUtang]);

  const showFreezeCta = net < 0 || dueInfo.daysToDue <= 2;
  const ctaLabel = showFreezeCta ? "Aktifkan Mode Beku" : "Buka Input Keuangan";

  const scrollToCard = (ref: RefObject<HTMLDivElement>) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePrimaryAction = async () => {
    if (showFreezeCta) {
      setOpenCard("pagar");
      autoExpanded.current = true;
      scrollToCard(pagarRef);
      if (!freezeModeActive) {
        await handleToggleFreeze();
      }
      return;
    }

    router.push("/input");
  };

  return (
    <main className="flex w-full flex-1 flex-col gap-5 pb-36">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-[color:var(--text)]">
          Keuangan
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          Saya hentikan bocor dulu. Baru mikir besar.
        </p>
      </header>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)]"
        >
          {toast}
        </div>
      ) : null}

      <div ref={ringkasanRef}>
        <Collapsible
          title="Ringkasan"
          open={openCard === "ringkasan"}
          onToggle={() => handleToggleCard("ringkasan")}
          summary={
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-lg font-semibold ${
                    net < 0
                      ? "text-[color:var(--danger)]"
                      : "text-[color:var(--ok)]"
                  }`}
                >
                  {formatRupiah(net)}
                </span>
                <span className={badgeClass(net < 0 ? "danger" : "ok")}>
                  {net < 0 ? "DEFISIT" : "AMAN HARIAN"}
                </span>
              </div>
              <p className="text-xs text-[color:var(--muted)]">
                Masuk {formatRupiah(incomeOjol)} | Keluar {formatRupiah(totalExpense)}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {projectedNetToPayday < 0
                  ? "Dengan ritme ini, saya berisiko defisit sebelum gajian."
                  : "Dengan ritme ini, saya cukup aman sampai gajian."}
              </p>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-[color:var(--text)]">
            <p className="text-xs text-[color:var(--muted)]">{dateKey}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Keluar makan</span>
                <span className="font-semibold">{formatRupiah(expenseMakan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Keluar bensin</span>
                <span className="font-semibold">{formatRupiah(expenseBensin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Topup ojol</span>
                <span className="font-semibold">{formatRupiah(topupOjol)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Rokok/kopi</span>
                <span className="font-semibold">{formatRupiah(rokokKopi)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Lain-lain</span>
                <span className="font-semibold">{formatRupiah(otherExpense)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">
                  Uang di tangan malam ini
                </span>
                <span className="font-semibold">
                  {cashOnHandKnown ? formatRupiah(cashOnHand) : "Belum diisi"}
                </span>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs text-[color:var(--muted)]">
              <p>H- gajian: {daysToPayday} hari</p>
              <p>Rata2 keluar/7 hari: {formatRupiah(avgExpense7)}</p>
              <p>Estimasi aman/defisit: {formatRupiah(projectedNetToPayday)}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/input")}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Buka Input Keuangan
            </button>
          </div>
        </Collapsible>
      </div>

      <div ref={pagarRef}>
        <Collapsible
          title="Pagar"
          open={openCard === "pagar"}
          onToggle={() => handleToggleCard("pagar")}
          summary={
            <div className="space-y-2 text-xs text-[color:var(--muted)]">
              <div className="flex items-center justify-between gap-2">
                <span>Rokok/kopi</span>
                <span className="ml-auto text-right text-[color:var(--text)]">
                  {formatRupiah(rokokKopi)} / {formatRupiah(rokokMax)}
                </span>
                <span className={badgeClass(rokokStatus === "OK" ? "ok" : "warn")}>
                  {rokokStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Topup 7 hari</span>
                <span className="ml-auto text-right text-[color:var(--text)]">
                  {formatRupiah(weeklyTopup7)} / {formatRupiah(topupWeeklyTarget)}
                </span>
                <span className={badgeClass(topupStatus === "OK" ? "ok" : "warn")}>
                  {topupStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode beku</span>
                <span className="font-semibold text-[color:var(--text)]">
                  {freezeModeActive ? "Aktif" : "Belum aktif"}
                </span>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-[color:var(--text)]">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">Topup ojol hari ini</span>
              <span className="font-semibold">{formatRupiah(topupOjol)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSetRokokZero}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Set rokok hari ini = 0
              </button>
              <button
                type="button"
                onClick={handleSetOtherZero}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Set lain-lain = 0
              </button>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-3">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Mode Beku 3 hari
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Mode beku bukan hukuman. Ini rem.
              </p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                3 hari ini saya selamat dulu: rokok max 5k, other 0, topup stop
                kecuali mingguan.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleFreeze}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    freezeModeActive
                      ? "bg-[color:var(--ok)]/15 text-[color:var(--ok)]"
                      : "border border-[color:var(--border)] text-[color:var(--text)]"
                  }`}
                >
                  {freezeModeActive ? "Mode Beku Aktif" : "Aktifkan Mode Beku"}
                </button>
                <button
                  type="button"
                  onClick={handleApplyFreeze}
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text)]"
                >
                  Terapkan Mode Beku ke angka hari ini
                </button>
              </div>
              {freezeModeActive ? (
                <div className="mt-3 space-y-2 text-xs text-[color:var(--muted)]">
                  {rokokKopi > 5000 ? (
                    <p className="text-[color:var(--danger)]">
                      Rokok/kopi hari ini melewati batas 5k.
                    </p>
                  ) : null}
                  {otherExpense > 0 ? (
                    <p className="text-[color:var(--danger)]">
                      Lain-lain hari ini harus 0.
                    </p>
                  ) : null}
                  {topupOjol > 0 ? (
                    topupWithinWeekly ? (
                      <p className="text-[color:var(--ok)]">
                        Topup hari ini masih di dalam pagar mingguan.
                      </p>
                    ) : (
                      <p className="text-[color:var(--danger)]">
                        Topup hari ini sebaiknya stop dulu di Mode Beku.
                      </p>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Collapsible>
      </div>

      <div ref={utangRef}>
        <Collapsible
          title="Utang (Pinjol)"
          open={openCard === "utang"}
          onToggle={() => handleToggleCard("utang")}
          summary={
            <div className="space-y-2 text-xs text-[color:var(--muted)]">
              <div className="flex items-center justify-between">
                <span>{dueSummary}</span>
                <span className={badgeClass(dueBadgeTone)}>{dueBadge}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Target harian menuju tempo</span>
                <span className="font-semibold text-[color:var(--text)]">
                  {formatRupiah(dailyNeedToDue)}
                </span>
              </div>
            </div>
          }
        >
          <div className="space-y-2 text-sm text-[color:var(--text)]">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">Cicilan/bulan</span>
              <span className="font-semibold">{formatRupiah(pinjolMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">Jatuh tempo</span>
              <span className="font-semibold">
                tgl {pinjolDueDays.join(" & ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">Sisa bulan</span>
              <span className="font-semibold">{monthsRemaining} bulan</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Saya cukup amankan yang paling bikin panik.
          </p>
        </Collapsible>
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--surface2)]/95 backdrop-blur"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px] px-5 py-3">
          <PrimaryButton
            type="button"
            onClick={handlePrimaryAction}
            className="w-full"
          >
            {ctaLabel}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
