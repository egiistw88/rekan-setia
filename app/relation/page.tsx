"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/app/components/PageShell";
import { db, type RelationLogRecord } from "@/lib/db";
import {
  getTodayDateKey,
  upsertDailyLogPatch,
  upsertRelationLogPatch,
} from "@/lib/logs";
import { relationTemplates } from "@/lib/relationTemplates";
import { getJakartaDateTime } from "@/lib/time";

type RitualMode = 7 | 2;

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0",
  )}`;
};

const getSteps = (mode: RitualMode) => {
  if (mode === 2) {
    return [
      "0–1: Saya hadir. Saya dengar 1 kalimat.",
      "1–2: Saya bilang terima kasih / minta maaf.",
    ];
  }
  return [
    "Menit 0–2: Tarik napas + tatap + satu kalimat pembuka",
    "Menit 2–5: Dengar 1 hal yang berat hari ini",
    "Menit 5–7: Tutup dengan 1 bantuan kecil / rencana besok",
  ];
};

export default function RelationPage() {
  const searchParams = useSearchParams();
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const relationLog = useLiveQuery(() => db.relationLogs.get(dateKey), [dateKey]);

  const [mode, setMode] = useState<RitualMode>(7);
  const [timeLeft, setTimeLeft] = useState(7 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [note, setNote] = useState("");
  const [motherContactDone, setMotherContactDone] = useState(false);
  const [wifeMood, setWifeMood] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const autoInitRef = useRef(false);
  const prefillRef = useRef(false);

  useEffect(() => {
    if (prefillRef.current) {
      return;
    }
    if (!dailyLog && !relationLog) {
      return;
    }
    setNote(relationLog?.wifeNote ?? "");
    setMotherContactDone(relationLog?.motherContactDone ?? false);
    setWifeMood(relationLog?.wifeMood ?? "");
    setSelectedTemplateId(relationLog?.lastTemplateId ?? "");
    prefillRef.current = true;
  }, [dailyLog, relationLog]);

  useEffect(() => {
    if (autoInitRef.current) {
      return;
    }
    const modeParam = searchParams.get("mode");
    const shouldAutoStart = searchParams.get("start") === "1";
    const nextMode: RitualMode = modeParam === "2" ? 2 : 7;
    setMode(nextMode);
    setTimeLeft(nextMode * 60);
    setElapsed(0);
    if (shouldAutoStart) {
      setIsRunning(true);
    }
    autoInitRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }
        return current - 1;
      });
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2000);
  };

  const handleModeChange = (nextMode: RitualMode) => {
    setMode(nextMode);
    setIsRunning(false);
    setElapsed(0);
    setTimeLeft(nextMode * 60);
  };

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(mode * 60);
      setElapsed(0);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setTimeLeft(mode * 60);
  };

  const handleApplyTemplate = (id: string, text: string) => {
    setSelectedTemplateId(id);
    setNote(text);
    showToast("Kalimat saya siap dipakai.");
  };

  const canFinish = elapsed >= 30;

  const handleFinish = async () => {
    if (!canFinish) {
      return;
    }
    const trimmed = note.trim();
    const relationPatch: Partial<
      Omit<RelationLogRecord, "dateKey" | "updatedAt" | "updatedAtWib">
    > = {
      wifeNote: trimmed ? trimmed : "",
      ritualDurationMin: mode,
      ritualCompletedAtWib: getJakartaDateTime(new Date()),
      motherContactDone,
      wifeMood: wifeMood || undefined,
    };
    if (selectedTemplateId) {
      relationPatch.lastTemplateId = selectedTemplateId;
    }

    try {
      await Promise.all([
        upsertDailyLogPatch(dateKey, { ritualDone: true }),
        upsertRelationLogPatch(dateKey, relationPatch),
      ]);
      setIsRunning(false);
      showToast("Saya sudah hadir.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan ritual.");
    }
  };

  const steps = getSteps(mode);

  return (
    <PageShell title="Ritual Hadir" description="Saya hadir sebentar, bukan untuk menyelesaikan semua.">
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
          Mode Ritual
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleModeChange(7)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              mode === 7
                ? "bg-[color:var(--accent)] text-white"
                : "border border-[color:var(--border)] text-[color:var(--foreground)]"
            }`}
          >
            Ritual 7 menit
          </button>
          <button
            type="button"
            onClick={() => handleModeChange(2)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              mode === 2
                ? "bg-[color:var(--accent)] text-white"
                : "border border-[color:var(--border)] text-[color:var(--foreground)]"
            }`}
          >
            Darurat 2 menit
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          SOP Langkah
        </p>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--foreground)]">
          {steps.map((step) => (
            <div key={step} className="rounded-xl border border-[color:var(--border)] px-3 py-2">
              {step}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]">
            {formatCountdown(timeLeft)}
          </span>
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
            >
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
            >
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canFinish}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Selesai
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Template Kalimat
        </p>
        <div className="mt-3 grid gap-3">
          {relationTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-[color:var(--border)] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {template.title}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {template.text}
              </p>
              <button
                type="button"
                onClick={() => handleApplyTemplate(template.id, template.text)}
                className="mt-3 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
              >
                Pakai
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Catatan Ringkas
        </p>
        <label className="mt-3 block space-y-2 text-sm text-[color:var(--muted)]">
          <span>Kalimat saya malam ini</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
          />
        </label>
        <label className="mt-4 block space-y-2 text-sm text-[color:var(--muted)]">
          <span>Perasaan istri malam ini (opsional)</span>
          <select
            value={wifeMood}
            onChange={(event) => setWifeMood(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-[color:var(--foreground)]"
          >
            <option value="">Pilih</option>
            <option value="ringan">Ringan</option>
            <option value="biasa">Biasa</option>
            <option value="berat">Berat</option>
          </select>
        </label>
        <label className="mt-4 flex items-center justify-between gap-3 text-sm text-[color:var(--foreground)]">
          <span>Saya sudah menyapa ibu hari ini</span>
          <input
            type="checkbox"
            checked={motherContactDone}
            onChange={(event) => setMotherContactDone(event.target.checked)}
            className="h-5 w-5 accent-[color:var(--accent)]"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
        >
          Kembali ke Dashboard
        </Link>
        <p className="text-xs text-[color:var(--muted)]">
          Kalau hari ini cuma sanggup 2 menit, itu tetap dihitung.
        </p>
      </div>
    </PageShell>
  );
}
