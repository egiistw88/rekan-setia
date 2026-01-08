"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/app/components/ui/Card";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import {
  db,
  type CareerLogRecord,
  type DailyLogRecord,
  type FinanceLogRecord,
  type RelationLogRecord,
} from "@/lib/db";
import { getJakartaDateKey, getJakartaDateTime } from "@/lib/time";

type WifeMood = "ringan" | "biasa" | "berat";

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
  note: string;
};

type RelationForm = {
  wifeNote: string;
  motherContactDone: boolean;
  wifeMood: WifeMood | "";
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
  note: "",
};

const defaultRelation: RelationForm = {
  wifeNote: "",
  motherContactDone: false,
  wifeMood: "",
};

const defaultCareer: CareerForm = {
  clientChatsSent: 0,
  designMinutes: 0,
};

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]";

const clampInt = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
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

const isWifeMood = (value: string): value is WifeMood => {
  return value === "ringan" || value === "biasa" || value === "berat";
};

const steps = [
  { id: 1, title: "Stabilkan" },
  { id: 2, title: "Keuangan" },
  { id: 3, title: "Rumah + Arah" },
];

export default function InputPage() {
  const [dateKey] = useState(() => getJakartaDateKey());
  const [currentStep, setCurrentStep] = useState(1);
  const [daily, setDaily] = useState<DailyForm>(defaultDaily);
  const [finance, setFinance] = useState<FinanceForm>(defaultFinance);
  const [relation, setRelation] = useState<RelationForm>(defaultRelation);
  const [career, setCareer] = useState<CareerForm>(defaultCareer);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
          note: financeLog?.note ?? "",
        });

        setRelation({
          wifeNote: relationLog?.wifeNote ?? "",
          motherContactDone: relationLog?.motherContactDone ?? false,
          wifeMood: relationLog?.wifeMood ?? "",
        });

        setCareer({
          clientChatsSent: careerLog?.clientChatsSent ?? 0,
          designMinutes: careerLog?.designMinutes ?? 0,
        });
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

  const totalExpense =
    finance.expenseMakan +
    finance.expenseBensin +
    finance.topupOjol +
    finance.rokokKopi +
    finance.otherExpense;
  const netToday = finance.incomeOjol - totalExpense;

  const handleSave = async () => {
    if (isSaving || isLoading) {
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const nowIso = now.toISOString();
    const updatedAtWib = getJakartaDateTime(now);

    try {
      const existingDaily = await db.dailyLogs.get(dateKey);
      const existingFinance = await db.financeLogs.get(dateKey);
      const existingRelation = await db.relationLogs.get(dateKey);

      const dailyRecord: DailyLogRecord = {
        dateKey,
        sleepHours: Math.max(0, daily.sleepHours),
        mealsCount: clampInt(daily.mealsCount, 0, 10),
        breathSessions: clampInt(daily.breathSessions, 0, 10),
        dropModeRuns: clampInt(daily.dropModeRuns, 0, 10),
        moodScore: optionalClampedInt(daily.moodScore, 1, 5),
        subuhDone: daily.subuhDone,
        ritualDone: daily.ritualDone,
        freezeMode: daily.freezeMode,
        spiritual: existingDaily?.spiritual,
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
        freezeModeApplied: existingFinance?.freezeModeApplied,
        note: finance.note.trim() || undefined,
      };

      const relationRecord: RelationLogRecord = {
        dateKey,
        wifeNote: relation.wifeNote.trim() || undefined,
        lastTemplateId: existingRelation?.lastTemplateId,
        ritualDurationMin: existingRelation?.ritualDurationMin,
        ritualCompletedAtWib: existingRelation?.ritualCompletedAtWib,
        wifeMood: relation.wifeMood ? relation.wifeMood : undefined,
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
      showToast("Saya sudah menutup hari dengan rapi.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan. Saya coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent =
    steps.length <= 1
      ? 100
      : ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <main className="flex w-full flex-1 flex-col gap-5 pb-36">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-[color:var(--text)]">
          Input Malam
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          Saya tutup hari pelan, tapi rapi.
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

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-[11px] text-[color:var(--muted)]">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                  step.id === currentStep
                    ? "border-transparent bg-[color:var(--accent)] text-white"
                    : "border-[color:var(--border)] text-[color:var(--muted)]"
                }`}
              >
                {step.id}
              </span>
              <span>{step.title}</span>
            </div>
          ))}
        </div>
        <div className="h-1 w-full rounded-full bg-[color:var(--surface2)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {currentStep === 1 ? (
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Stabilkan
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Tidur (jam)</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Makan (kali)</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Napas sadar</span>
              <input
                type="number"
                min={0}
                max={10}
                value={daily.breathSessions}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    breathSessions: clampInt(intValue(event.target.value), 0, 10),
                  }))
                }
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Drop Mode</span>
              <input
                type="number"
                min={0}
                max={10}
                value={daily.dropModeRuns}
                onChange={(event) =>
                  setDaily((prev) => ({
                    ...prev,
                    dropModeRuns: clampInt(intValue(event.target.value), 0, 10),
                  }))
                }
                className={inputClass}
              />
            </label>
          </div>

          <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2">
            <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
              Tambahan
            </summary>
            <div className="mt-3">
              <label className="space-y-2 text-xs text-[color:var(--muted)]">
                <span>Skala berat hari (1-5)</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={daily.moodScore}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value.trim() === "") {
                      setDaily((prev) => ({ ...prev, moodScore: "" }));
                      return;
                    }
                    const parsed = Math.round(Number(value));
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    const clamped = clampInt(parsed, 1, 5);
                    setDaily((prev) => ({ ...prev, moodScore: String(clamped) }));
                  }}
                  placeholder="Opsional"
                  className={inputClass}
                />
              </label>
            </div>
          </details>

          <p className="mt-4 text-xs text-[color:var(--muted)]">
            Kalau saya cuma isi ini saja, itu sudah cukup.
          </p>
        </Card>
      ) : null}

      {currentStep === 2 ? (
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Keuangan
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Masuk ojol</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Keluar makan</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Keluar bensin</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Topup ojol</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Rokok/kopi</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Lain-lain</span>
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
                className={inputClass}
              />
            </label>
          </div>

          <label className="mt-3 space-y-2 text-xs text-[color:var(--muted)]">
            <span>Uang di tangan malam ini (opsional)</span>
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
              className={inputClass}
            />
          </label>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-sm">
            <span className="text-[color:var(--muted)]">Net hari ini: </span>
            <span
              className={
                netToday < 0
                  ? "text-[color:var(--warn)]"
                  : "text-[color:var(--ok)]"
              }
            >
              {netToday}
            </span>
          </div>

          <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2">
            <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
              Tambahan
            </summary>
            <label className="mt-3 space-y-2 text-xs text-[color:var(--muted)]">
              <span>Catatan singkat (opsional)</span>
              <textarea
                value={finance.note}
                onChange={(event) =>
                  setFinance((prev) => ({ ...prev, note: event.target.value }))
                }
                rows={2}
                className={inputClass}
              />
            </label>
          </details>
        </Card>
      ) : null}

      {currentStep === 3 ? (
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Rumah + Arah
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--text)]">
              <span>Pegang Subuh</span>
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
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--text)]">
              <span>Hadir 7 menit untuk istri</span>
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
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
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
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--text)]">
              <span>Menyapa ibu</span>
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Chat klien (0-3)</span>
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
                className={inputClass}
              />
            </label>
            <label className="space-y-2 text-xs text-[color:var(--muted)]">
              <span>Desain (menit)</span>
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
                className={inputClass}
              />
            </label>
          </div>

          <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2">
            <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
              Tambahan
            </summary>
            <div className="mt-3 space-y-3">
              <label className="space-y-2 text-xs text-[color:var(--muted)]">
                <span>Perasaan istri malam ini</span>
                <select
                  value={relation.wifeMood}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "" || isWifeMood(value)) {
                      setRelation((prev) => ({ ...prev, wifeMood: value }));
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Pilih</option>
                  <option value="ringan">Ringan</option>
                  <option value="biasa">Biasa</option>
                  <option value="berat">Berat</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--text)]">
                <span>Freeze mode</span>
                <input
                  type="checkbox"
                  checked={daily.freezeMode}
                  onChange={(event) =>
                    setDaily((prev) => ({
                      ...prev,
                      freezeMode: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-[color:var(--accent)]"
                />
              </label>
            </div>
          </details>
        </Card>
      ) : null}

      <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="rounded-full border border-[color:var(--border)] px-3 py-1 disabled:opacity-40"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
          disabled={currentStep === 3}
          className="rounded-full border border-[color:var(--border)] px-3 py-1 disabled:opacity-40"
        >
          Lanjut
        </button>
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--surface2)]/95 backdrop-blur"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px] px-5 py-3">
          <PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="w-full"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </PrimaryButton>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Autosave tidak dipakai - saya simpan saat siap.
          </p>
        </div>
      </div>
    </main>
  );
}
