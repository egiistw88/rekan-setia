"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/app/components/PageShell";
import {
  db,
  type CareerLogRecord,
  type DailyLogRecord,
  type FinanceLogRecord,
  type RelationLogRecord,
} from "@/lib/db";
import { getJakartaDateKey, getJakartaDateTime } from "@/lib/time";

type DailyForm = {
  sleepHours: number;
  mealsCount: number;
  breathSessions: number;
  dropModeRuns: number;
  moodScore: string;
  subuhDone: boolean;
  ritualDone: boolean;
  freezeMode: boolean;
};

type FinanceForm = {
  incomeOjol: number;
  expenseMakan: number;
  expenseBensin: number;
  topupOjol: number;
  rokokKopi: number;
  otherExpense: number;
  cashOnHandTonight: string;
};

type RelationForm = {
  wifeNote: string;
  motherContactDone: boolean;
};

type CareerForm = {
  clientChatsSent: number;
  designMinutes: number;
};

const defaultDaily: DailyForm = {
  sleepHours: 0,
  mealsCount: 0,
  breathSessions: 0,
  dropModeRuns: 0,
  moodScore: "",
  subuhDone: false,
  ritualDone: false,
  freezeMode: false,
};

const defaultFinance: FinanceForm = {
  incomeOjol: 0,
  expenseMakan: 0,
  expenseBensin: 0,
  topupOjol: 0,
  rokokKopi: 0,
  otherExpense: 0,
  cashOnHandTonight: "",
};

const defaultRelation: RelationForm = {
  wifeNote: "",
  motherContactDone: false,
};

const defaultCareer: CareerForm = {
  clientChatsSent: 0,
  designMinutes: 0,
};

const floatValue = (value: string) => {
  if (value.trim() === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const intValue = (value: string) => {
  if (value.trim() === "") {
    return 0;
  }
  const parsed = Math.round(Number(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clampInt = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const nonNegativeInt = (value: string) => {
  return Math.max(0, intValue(value));
};

const optionalIntValue = (value: string) => {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Math.round(Number(value));
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.max(0, parsed);
};

const optionalClampedInt = (value: string, min: number, max: number) => {
  const parsed = optionalIntValue(value);
  if (parsed === undefined) {
    return undefined;
  }
  return clampInt(parsed, min, max);
};

const formatTime = (iso?: string, wib?: string) => {
  if (wib) {
    return wib;
  }
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function InputPage() {
  const [dateKey] = useState(() => getJakartaDateKey());
  const [daily, setDaily] = useState<DailyForm>(defaultDaily);
  const [finance, setFinance] = useState<FinanceForm>(defaultFinance);
  const [relation, setRelation] = useState<RelationForm>(defaultRelation);
  const [career, setCareer] = useState<CareerForm>(defaultCareer);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [dailyLog, financeLog, relationLog, careerLog] =
          await Promise.all([
            db.dailyLogs.get(dateKey),
            db.financeLogs.get(dateKey),
            db.relationLogs.get(dateKey),
            db.careerLogs.get(dateKey),
          ]);

        if (!active) {
          return;
        }

        setDaily({
          sleepHours: dailyLog?.sleepHours ?? 0,
          mealsCount: dailyLog?.mealsCount ?? 0,
          breathSessions: dailyLog?.breathSessions ?? 0,
          dropModeRuns: dailyLog?.dropModeRuns ?? 0,
          moodScore:
            dailyLog?.moodScore !== undefined ? String(dailyLog.moodScore) : "",
          subuhDone: dailyLog?.subuhDone ?? false,
          ritualDone: dailyLog?.ritualDone ?? false,
          freezeMode: dailyLog?.freezeMode ?? false,
        });

        setFinance({
          incomeOjol: financeLog?.incomeOjol ?? 0,
          expenseMakan: financeLog?.expenseMakan ?? 0,
          expenseBensin: financeLog?.expenseBensin ?? 0,
          topupOjol: financeLog?.topupOjol ?? 0,
          rokokKopi: financeLog?.rokokKopi ?? 0,
          otherExpense: financeLog?.otherExpense ?? 0,
          cashOnHandTonight:
            financeLog?.cashOnHandTonight !== undefined
              ? String(financeLog.cashOnHandTonight)
              : "",
        });

        setRelation({
          wifeNote: relationLog?.wifeNote ?? "",
          motherContactDone: relationLog?.motherContactDone ?? false,
        });

        setCareer({
          clientChatsSent: careerLog?.clientChatsSent ?? 0,
          designMinutes: careerLog?.designMinutes ?? 0,
        });

        const lastUpdatedWib = [
          dailyLog?.updatedAtWib,
          financeLog?.updatedAtWib,
          relationLog?.updatedAtWib,
          careerLog?.updatedAtWib,
        ]
          .filter(Boolean)
          .sort()
          .pop();

        const lastUpdatedIso = [
          dailyLog?.updatedAt,
          financeLog?.updatedAt,
          relationLog?.updatedAt,
          careerLog?.updatedAt,
        ]
          .filter(Boolean)
          .sort()
          .pop();

        setLastSavedAt(
          formatTime(lastUpdatedIso, lastUpdatedWib as string | undefined),
        );
      } catch (error) {
        console.error(error);
        if (active) {
          showToast("Saya belum bisa memuat. Saya coba lagi.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dateKey]);

  const hasChanges = useMemo(() => {
    return (
      daily.sleepHours !== 0 ||
      daily.mealsCount !== 0 ||
      daily.breathSessions !== 0 ||
      daily.dropModeRuns !== 0 ||
      daily.moodScore !== "" ||
      daily.subuhDone ||
      daily.ritualDone ||
      daily.freezeMode ||
      finance.incomeOjol !== 0 ||
      finance.expenseMakan !== 0 ||
      finance.expenseBensin !== 0 ||
      finance.topupOjol !== 0 ||
      finance.rokokKopi !== 0 ||
      finance.otherExpense !== 0 ||
      finance.cashOnHandTonight !== "" ||
      relation.wifeNote !== "" ||
      relation.motherContactDone ||
      career.clientChatsSent !== 0 ||
      career.designMinutes !== 0
    );
  }, [career, daily, finance, relation]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const nowIso = now.toISOString();
    const updatedAtWib = getJakartaDateTime(now);

    try {
      const existingDaily = await db.dailyLogs.get(dateKey);

      const dailyRecord: DailyLogRecord = {
        dateKey,
        sleepHours: daily.sleepHours,
        mealsCount: daily.mealsCount,
        breathSessions: daily.breathSessions,
        dropModeRuns: daily.dropModeRuns,
        moodScore: optionalClampedInt(daily.moodScore, 1, 5),
        subuhDone: daily.subuhDone,
        ritualDone: daily.ritualDone,
        freezeMode: daily.freezeMode,
        updatedAt: nowIso,
        updatedAtWib,
        planChecks: existingDaily?.planChecks,
      };

      const financeRecord: FinanceLogRecord = {
        dateKey,
        incomeOjol: nonNegativeInt(String(finance.incomeOjol)),
        expenseMakan: nonNegativeInt(String(finance.expenseMakan)),
        expenseBensin: nonNegativeInt(String(finance.expenseBensin)),
        topupOjol: nonNegativeInt(String(finance.topupOjol)),
        rokokKopi: nonNegativeInt(String(finance.rokokKopi)),
        otherExpense: nonNegativeInt(String(finance.otherExpense)),
        cashOnHandTonight: optionalIntValue(finance.cashOnHandTonight),
        updatedAt: nowIso,
        updatedAtWib,
      };

      const relationRecord: RelationLogRecord = {
        dateKey,
        wifeNote: relation.wifeNote.trim() || undefined,
        motherContactDone: relation.motherContactDone,
        updatedAt: nowIso,
        updatedAtWib,
      };

      const careerRecord: CareerLogRecord = {
        dateKey,
        clientChatsSent: clampInt(career.clientChatsSent, 0, 3),
        designMinutes: clampInt(career.designMinutes, 0, 60),
        updatedAt: nowIso,
        updatedAtWib,
      };

      await Promise.all([
        db.dailyLogs.put(dailyRecord),
        db.financeLogs.put(financeRecord),
        db.relationLogs.put(relationRecord),
        db.careerLogs.put(careerRecord),
      ]);
      setLastSavedAt(formatTime(nowIso, updatedAtWib));
      showToast("Saya sudah menutup hari dengan rapi.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan. Saya coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell
      title="Input Malam"
      description="Saya isi ini malam ini, supaya besok saya tidak bingung."
    >
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)]"
        >
          {toast}
        </div>
      ) : null}

      <div className="space-y-4">
        <details
          open
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]">
            Mental & Energi
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border)] px-4 py-4">
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Tidur saya (jam)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={daily.sleepHours}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    sleepHours: Math.max(0, floatValue(event.target.value)),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Makan saya (kali)</span>
              <input
                type="number"
                min={0}
                value={daily.mealsCount}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    mealsCount: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Napas sadar (sesi)</span>
              <input
                type="number"
                min={0}
                value={daily.breathSessions}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    breathSessions: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Drop Mode hari ini (berapa kali)</span>
              <input
                type="number"
                min={0}
                value={daily.dropModeRuns}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    dropModeRuns: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Seberat apa hari saya?</span>
              <input
                type="number"
                min={1}
                max={5}
                value={daily.moodScore}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    moodScore: event.target.value,
                  }))
                }
                placeholder="1-5 (opsional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
          </div>
        </details>

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]">
            Spiritual
          </summary>
          <div className="border-t border-[color:var(--border)] px-4 py-4">
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--foreground)]">
              <span>Saya pegang Subuh</span>
              <input
                type="checkbox"
                checked={daily.subuhDone}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    subuhDone: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[color:var(--accent)]"
              />
            </label>
          </div>
        </details>

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]">
            Relasi
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border)] px-4 py-4">
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--foreground)]">
              <span>Saya hadir 7 menit untuk istri</span>
              <input
                type="checkbox"
                checked={daily.ritualDone}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    ritualDone: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[color:var(--accent)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>1 kalimat untuk saya ingat</span>
              <textarea
                value={relation.wifeNote}
                onChange={(event) =>
                  setRelation((prev) => ({
                    ...prev,
                    wifeNote: event.target.value,
                  }))
                }
                placeholder="Yang paling berat hari ini..."
                rows={3}
                className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--foreground)]">
              <span>Saya menyapa ibu hari ini</span>
              <input
                type="checkbox"
                checked={relation.motherContactDone}
                onChange={(event) =>
                  setRelation((prev) => ({
                    ...prev,
                    motherContactDone: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[color:var(--accent)]"
              />
            </label>
          </div>
        </details>

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]">
            Keuangan
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border)] px-4 py-4">
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Masuk ojol hari ini (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.incomeOjol}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    incomeOjol: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Keluar makan (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.expenseMakan}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    expenseMakan: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Keluar bensin (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.expenseBensin}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    expenseBensin: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Topup saldo ojol (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.topupOjol}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    topupOjol: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Rokok/kopi (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.rokokKopi}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    rokokKopi: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Lain-lain (Rp)</span>
              <input
                type="number"
                min={0}
                value={finance.otherExpense}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    otherExpense: nonNegativeInt(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Uang di tangan malam ini (perkiraan)</span>
              <input
                type="number"
                min={0}
                value={finance.cashOnHandTonight}
                onChange={(event) =>
                  setFinance((prev) => ({
                    ...prev,
                    cashOnHandTonight: event.target.value,
                  }))
                }
                placeholder="Opsional"
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
          </div>
        </details>

        <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]">
            Karier
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border)] px-4 py-4">
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Chat klien terkirim (0-3)</span>
              <input
                type="number"
                min={0}
                max={3}
                step={1}
                value={career.clientChatsSent}
                onChange={(event) =>
                  setCareer((prev) => ({
                    ...prev,
                    clientChatsSent: clampInt(intValue(event.target.value), 0, 3),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
            <label className="space-y-2 text-sm text-[color:var(--muted)]">
              <span>Waktu desain (menit)</span>
              <input
                type="number"
                min={0}
                max={60}
                step={5}
                value={career.designMinutes}
                onChange={(event) =>
                  setCareer((prev) => ({
                    ...prev,
                    designMinutes: clampInt(intValue(event.target.value), 0, 60),
                  }))
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
              />
            </label>
          </div>
        </details>
      </div>

      <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="w-full rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
        <Link
          href="/"
          className="block w-full rounded-xl border border-[color:var(--border)] px-4 py-3 text-center text-sm text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
        >
          Kembali
        </Link>
        <div className="text-xs text-[color:var(--muted)]">
          {lastSavedAt
            ? `Terakhir disimpan: ${lastSavedAt}`
            : isLoading
              ? "Memuat catatan..."
              : hasChanges
                ? "Belum disimpan malam ini."
                : "Belum ada catatan untuk hari ini."}
        </div>
      </div>
    </PageShell>
  );
}
