"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/app/components/ui/Card";
import GhostButton from "@/app/components/ui/GhostButton";
import Page from "@/app/components/ui/Page";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { db, type RelationLogRecord } from "@/lib/db";
import {
  getTodayDateKey,
  upsertDailyLogPatch,
  upsertRelationLogPatch,
} from "@/lib/logs";
import { relationTemplates } from "@/lib/relationTemplates";
import { getJakartaDateTime } from "@/lib/time";

type RitualMode = 7 | 2;
type WifeMood = "ringan" | "biasa" | "berat";

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
      "0-1: Saya hadir. Saya dengar 1 kalimat.",
      "1-2: Saya bilang terima kasih atau minta maaf.",
    ];
  }
  return [
    "Menit 0-2: Tarik napas + tatap + satu kalimat pembuka",
    "Menit 2-5: Dengar 1 hal yang berat hari ini",
    "Menit 5-7: Tutup dengan 1 bantuan kecil atau rencana besok",
  ];
};

const isWifeMood = (value: string): value is WifeMood => {
  return value === "ringan" || value === "biasa" || value === "berat";
};

function RelationContent() {
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
  const [wifeMood, setWifeMood] = useState<WifeMood | "">("");
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
      wifeMood: wifeMood ? wifeMood : undefined,
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
  const recommendedTemplates = relationTemplates.slice(0, 3);
  const extraTemplates = relationTemplates.slice(3);
  const shouldSuggestTemplate =
    !note.trim() && !selectedTemplateId && recommendedTemplates.length > 0;

  return (
    <Page
      title="Ritual Hadir"
      subtitle="Saya hadir sebentar, bukan untuk menyelesaikan semua."
    >
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)]"
        >
          {toast}
        </div>
      ) : null}

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Mode Ritual
        </p>
        <div className="mt-3 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface2)] p-1 text-xs">
          <button
            type="button"
            onClick={() => handleModeChange(7)}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === 7
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--text)]"
            }`}
          >
            7 menit
          </button>
          <button
            type="button"
            onClick={() => handleModeChange(2)}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === 2
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--text)]"
            }`}
          >
            2 menit
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Langkah singkat
        </p>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--text)]">
          {steps.map((step) => (
            <div
              key={step}
              className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
            >
              {step}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)]">
            {formatCountdown(timeLeft)}
          </span>
          {!isRunning ? (
            <PrimaryButton type="button" onClick={handleStart}>
              Mulai
            </PrimaryButton>
          ) : (
            <GhostButton type="button" onClick={handlePause}>
              Pause
            </GhostButton>
          )}
          <GhostButton type="button" onClick={handleReset}>
            Reset
          </GhostButton>
          <PrimaryButton type="button" onClick={handleFinish} disabled={!canFinish}>
            Selesai
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Selesai aktif setelah 30 detik berjalan.
        </p>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Template kalimat
        </p>
        {shouldSuggestTemplate ? (
          <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs text-[color:var(--muted)]">
            <div className="flex items-center justify-between gap-3">
              <span>
                Saya bisa mulai dari "{recommendedTemplates[0].title}".
              </span>
              <button
                type="button"
                onClick={() =>
                  handleApplyTemplate(
                    recommendedTemplates[0].id,
                    recommendedTemplates[0].text,
                  )
                }
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Pakai
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3">
          {recommendedTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
            >
              <p className="text-sm font-semibold text-[color:var(--text)]">
                {template.title}
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {template.text}
              </p>
              <button
                type="button"
                onClick={() => handleApplyTemplate(template.id, template.text)}
                className="mt-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Pakai
              </button>
            </div>
          ))}
        </div>
        {extraTemplates.length > 0 ? (
          <details className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted)]">
            <summary className="cursor-pointer">Lihat semua</summary>
            <div className="mt-3 grid gap-3">
              {extraTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
                >
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    {template.title}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {template.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(template.id, template.text)}
                    className="mt-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
                  >
                    Pakai
                  </button>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Catatan ringkas
        </p>
        <label className="mt-3 block space-y-2 text-xs text-[color:var(--muted)]">
          <span>Kalimat saya malam ini</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
          />
        </label>
        <label className="mt-4 block space-y-2 text-xs text-[color:var(--muted)]">
          <span>Perasaan istri malam ini (opsional)</span>
          <select
            value={wifeMood}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || isWifeMood(value)) {
                setWifeMood(value);
              }
            }}
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
          >
            <option value="">Pilih</option>
            <option value="ringan">Ringan</option>
            <option value="biasa">Biasa</option>
            <option value="berat">Berat</option>
          </select>
        </label>
        <label className="mt-4 flex items-center justify-between gap-3 text-sm text-[color:var(--text)]">
          <span>Saya sudah menyapa ibu hari ini</span>
          <input
            type="checkbox"
            checked={motherContactDone}
            onChange={(event) => setMotherContactDone(event.target.checked)}
            className="h-5 w-5 accent-[color:var(--accent)]"
          />
        </label>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
        >
          Kembali ke Dashboard
        </Link>
        <p className="text-xs text-[color:var(--muted)]">
          Kalau hari ini cuma sanggup 2 menit, itu tetap dihitung.
        </p>
      </div>
    </Page>
  );
}

export default function RelationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full flex-1 items-center justify-center text-sm text-[color:var(--muted)]">
          Memuat...
        </div>
      }
    >
      <RelationContent />
    </Suspense>
  );
}
